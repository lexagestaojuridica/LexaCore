import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Award, Download, Printer, CheckCircle2, Briefcase, GraduationCap, Star, FileText, Loader2, CloudUpload
} from "lucide-react";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────

type CertType = "conclusao" | "patrocinio" | "declaracao" | "treinamento" | "recibo";

const CERT_TYPES: { value: CertType; label: string; icon: any; description: string }[] = [
    { value: "conclusao", label: "Conclusão de Processo", icon: CheckCircle2, description: "Certifica o encerramento bem-sucedido de um processo jurídico." },
    { value: "patrocinio", label: "Declaração de Patrocínio", icon: Briefcase, description: "Declara que o escritório é patrono do cliente em determinada causa." },
    { value: "declaracao", label: "Declaração Genérica", icon: FileText, description: "Declaração personalizada emitida pelo escritório." },
    { value: "treinamento", label: "Certificado de Treinamento", icon: GraduationCap, description: "Certifica a participação em treinamento interno ou curso." },
    { value: "recibo", label: "Recibo de Honorários", icon: Star, description: "Recibo oficial de pagamento de honorários advocatícios." },
];

// ─── PDF Generator ───────────────────────────────────────────

function generatePDF(data: ReturnType<typeof getFormData>) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 25;
    const contentW = pageW - margin * 2;

    doc.setFillColor(248, 249, 252);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, 8, "F");

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 8, 4, pageH - 16, "F");
    doc.rect(pageW - 4, 8, 4, pageH - 16, "F");

    doc.setFillColor(30, 41, 59);
    doc.rect(0, pageH - 8, pageW, 8, "F");

    doc.setFillColor(30, 41, 59);
    doc.rect(4, 8, pageW - 8, 45, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(data.escritorioName || "Escritório de Advocacia", pageW / 2, 28, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    doc.text(data.escritorioEndereco || "", pageW / 2, 38, { align: "center" });

    const typeLabel = CERT_TYPES.find((t) => t.value === data.type)?.label ?? "Certificado";
    doc.setFillColor(99, 102, 241);
    const labelW = contentW * 0.6;
    doc.roundedRect((pageW - labelW) / 2, 48, labelW, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(typeLabel.toUpperCase(), pageW / 2, 56, { align: "center" });

    let y = 80;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Declaramos para os devidos fins que", pageW / 2, y, { align: "center" });

    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text(data.recipientName || "———", pageW / 2, y, { align: "center" });

    y += 3;
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin + 20, y, pageW - margin - 20, y);

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    const descLines = doc.splitTextToSize(data.description || "Conforme descrito neste documento.", contentW - 10);
    doc.text(descLines, pageW / 2, y, { align: "center" });
    y += descLines.length * 6 + 6;

    if (data.processNumber) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`Processo Nº: ${data.processNumber}`, pageW / 2, y, { align: "center" });
        y += 10;
    }
    if (data.valor) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`Valor: ${data.valor}`, pageW / 2, y, { align: "center" });
        y += 10;
    }

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`${data.escritorioEndereco ? data.escritorioEndereco + ", " : ""}${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageW / 2, y, { align: "center" });

    y = pageH - 65;
    doc.setDrawColor(200, 206, 220);
    doc.setLineWidth(0.4);
    const lineX = pageW / 2;
    doc.line(lineX - 40, y, lineX + 40, y);

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(data.signatoryName || "Responsável", pageW / 2, y, { align: "center" });

    if (data.signatoryOab) {
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`OAB ${data.signatoryOab}`, pageW / 2, y, { align: "center" });
    }

    y = pageH - 22;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 175);
    const uid = crypto.randomUUID().split("-")[0].toUpperCase();
    doc.text(`Código de verificação: LEXA-${uid} · Emitido via LEXA Nova · ${new Date().toISOString()}`, pageW / 2, y, { align: "center" });

    return doc;
}

// ─── Preview Component ────────────────────────────────────────

function CertificatePreview({ data }: { data: ReturnType<typeof getFormData> }) {
    const typeLabel = CERT_TYPES.find((t) => t.value === data.type)?.label ?? "Certificado";
    const uid = "LEXA-" + Math.random().toString(36).toUpperCase().slice(2, 8);

    return (
        <div className="relative overflow-hidden rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 aspect-[1/1.414] flex flex-col shadow-sm">
            <div className="h-3 bg-slate-800 shrink-0" />
            <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-indigo-500" />
            <div className="absolute right-0 top-3 bottom-3 w-1.5 bg-indigo-500" />

            <div className="bg-slate-800 px-8 py-4 text-center shrink-0">
                <p className="text-white font-bold text-sm">{data.escritorioName || "Escritório de Advocacia"}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{data.escritorioEndereco}</p>
                <div className="mt-2 mx-auto w-fit rounded bg-indigo-500 px-4 py-1">
                    <p className="text-white text-[9px] font-bold tracking-widest uppercase">{typeLabel}</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 text-center gap-2">
                <p className="text-[9px] text-slate-500">Declaramos para os devidos fins que</p>
                <p className="text-indigo-600 font-bold text-lg leading-tight">{data.recipientName || "———"}</p>
                <div className="w-20 h-px bg-indigo-400 mx-auto" />
                <p className="text-[9px] text-slate-600 mt-1 leading-relaxed max-w-[220px]">{data.description || "Descrição do certificado"}</p>
                {data.processNumber && <p className="text-[8px] font-medium text-slate-700 mt-1">Processo Nº: {data.processNumber}</p>}
                {data.valor && <p className="text-[8px] font-medium text-slate-700">Valor: {data.valor}</p>}
                <p className="text-[8px] text-slate-400 mt-2">{format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>

            <div className="px-8 pb-6 text-center shrink-0">
                <div className="mx-auto w-24 h-px bg-slate-300" />
                <p className="text-[9px] font-semibold text-slate-800 mt-1">{data.signatoryName || "Responsável"}</p>
                {data.signatoryOab && <p className="text-[8px] text-slate-500">OAB {data.signatoryOab}</p>}
            </div>

            <div className="bg-slate-800 py-2 px-4 text-center shrink-0">
                <p className="text-[7px] text-slate-500 italic">{uid} · Emitido via LEXA Nova</p>
            </div>
            <div className="h-3 bg-slate-800 shrink-0" />
        </div>
    );
}

function getFormData(f: any) {
    return f as {
        type: CertType; recipientName: string; processNumber: string; description: string;
        valor: string; signatoryName: string; signatoryOab: string;
        escritorioName: string; escritorioEndereco: string; clientId?: string | null; processId?: string | null;
    };
}

// ─── Main Page ────────────────────────────────────────────────

export default function CertificadosPage() {
    const { user } = useAuth();

    const { data: profile } = useQuery({
        queryKey: ["profile-cert", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id, full_name").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    const { data: org } = useQuery({
        queryKey: ["org-cert", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("organizations").select("name").eq("id", orgId!).single();
            return data;
        },
        enabled: !!orgId,
    });

    const { data: clients = [] } = useQuery({
        queryKey: ["clients-cert", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId!);
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const [form, setForm] = useState({
        type: "conclusao" as CertType,
        recipientName: "",
        processNumber: "",
        description: "",
        valor: "",
        signatoryName: profile?.full_name || user?.user_metadata?.full_name || "",
        signatoryOab: "",
        escritorioName: org?.name || "",
        escritorioEndereco: "",
        clientId: null as string | null,
    });

    if (org?.name && !form.escritorioName) setForm((f) => ({ ...f, escritorioName: org.name }));
    if (profile?.full_name && !form.signatoryName) setForm((f) => ({ ...f, signatoryName: profile.full_name ?? "" }));

    const setF = (key: string, value: string | null) => setForm((f) => ({ ...f, [key]: value }));

    const handleTypeChange = (type: CertType) => {
        const defaultDesc: Record<CertType, string> = {
            conclusao: "O processo jurídico de sua responsabilidade foi concluído com êxito, tendo sido obtido resultado favorável ao cliente.",
            patrocinio: "Este escritório de advocacia figura como patrono do cliente acima identificado, responsável pela condução do processo indicado.",
            declaracao: "",
            treinamento: "Participou e concluiu com aproveitamento o treinamento interno promovido por este escritório.",
            recibo: "Recebemos a quantia descrita a título de honorários advocatícios referentes aos serviços prestados.",
        };
        setForm((f) => ({ ...f, type, description: defaultDesc[type] }));
    };

    // ─── Actions ───
    const handleDownload = () => {
        try {
            const doc = generatePDF(getFormData(form));
            doc.save(`Certificado_${form.type}_${format(new Date(), "yyyyMMdd")}.pdf`);
            toast.success("Certificado baixado com sucesso!");
        } catch {
            toast.error("Erro ao gerar PDF");
        }
    };

    const handlePrint = () => {
        try {
            const doc = generatePDF(getFormData(form));
            const dataUrl = doc.output("datauristring");
            const windowObj = window.open("", "_blank");
            if (windowObj) {
                windowObj.document.write(`<iframe src="${dataUrl}" width="100%" height="100%" style="border:none"></iframe>`);
                windowObj.document.close();
            }
        } catch {
            toast.error("Erro ao preparar impressão");
        }
    };

    const saveToGEDMutation = useMutation({
        mutationFn: async () => {
            if (!orgId) throw new Error("Organização não encontrada");
            const doc = generatePDF(getFormData(form));
            const arrayBuffer = doc.output("arraybuffer");
            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            const fileName = `Certificado_${form.type}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
            const filePath = `${orgId}/${crypto.randomUUID()}-${fileName}`;

            // Upload to Supabase Storage
            const { error: storageError } = await supabase.storage.from("documentos").upload(filePath, blob);
            if (storageError) throw storageError;

            // Save metadata to DB
            const { error: dbError } = await supabase.from("documentos").insert({
                file_name: fileName,
                file_path: filePath,
                file_type: "pdf",
                size: blob.size,
                folder_path: "/",
                user_id: user!.id,
                organization_id: orgId,
                client_id: form.clientId,
                // we don't know the exact process_id because we're just accepting a text input for process number... 
                // but GED uses it natively.
            });
            if (dbError) throw dbError;
        },
        onSuccess: () => {
            toast.success("Documento salvo no GED com sucesso!");
        },
        onError: (err: any) => {
            toast.error(`Falha ao salvar no GED: ${err.message}`);
        }
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-border p-7">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                            <Award className="h-7 w-7 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Gerador de Certificados</h1>
                            <p className="text-sm text-slate-400 mt-0.5">Emita e arquive documentos oficiais assinados visualmente</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handlePrint} className="gap-2 bg-slate-800 text-slate-100 border-none hover:bg-slate-700 hover:text-white border-slate-700">
                            <Printer className="h-4 w-4" /> Visualizar / Imprimir
                        </Button>
                        <Button onClick={handleDownload} className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
                            <Download className="h-4 w-4" /> Baixar Diretamente
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">

                {/* Form */}
                <div className="space-y-5">
                    {/* Type selector */}
                    <Card className="border-border/60 shadow-sm">
                        <CardContent className="p-5">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Certificado</p>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {CERT_TYPES.map((ct) => {
                                    const Icon = ct.icon;
                                    return (
                                        <button
                                            key={ct.value}
                                            onClick={() => handleTypeChange(ct.value)}
                                            className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${form.type === ct.value
                                                ? "border-indigo-500/60 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                                                : "border-border/60 hover:border-primary/30 hover:bg-muted/30"
                                                }`}
                                        >
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${form.type === ct.value ? "bg-indigo-500 text-white shadow-sm" : "bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-600"
                                                } transition-colors`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className={`text-xs font-semibold leading-tight ${form.type === ct.value ? "text-indigo-600 dark:text-indigo-400" : "text-foreground"}`}>{ct.label}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{ct.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recipient */}
                    <Card className="border-border/60 shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinatário & Conteúdo</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Nome do destinatário *</label>
                                    <Input value={form.recipientName} onChange={(e) => setF("recipientName", e.target.value)} placeholder="Nome completo ou empresa" />
                                    {clients.length > 0 && (
                                        <Select onValueChange={(v) => {
                                            const c = clients.find(cl => cl.id === v);
                                            setF("clientId", v);
                                            if (c) setF("recipientName", c.name);
                                        }}>
                                            <SelectTrigger className="h-8 text-[11px] mt-1 bg-muted/30">
                                                <SelectValue placeholder="Ou preencha com um cliente do CRM..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Número do Processo</label>
                                    <Input value={form.processNumber} onChange={(e) => setF("processNumber", e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
                                </div>
                            </div>
                            {form.type === "recibo" && (
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Valor dos Honorários</label>
                                    <Input value={form.valor} onChange={(e) => setF("valor", e.target.value)} placeholder="R$ 0,00" />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Texto / Declaração</label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setF("description", e.target.value)}
                                    rows={4}
                                    placeholder="Descreva o conteúdo do certificado..."
                                    className="resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Signatory & Office */}
                    <Card className="border-border/60 shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signatário & Escritório</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Nome do signatário</label>
                                    <Input value={form.signatoryName} onChange={(e) => setF("signatoryName", e.target.value)} placeholder="Dr. João da Silva" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Registro OAB</label>
                                    <Input value={form.signatoryOab} onChange={(e) => setF("signatoryOab", e.target.value)} placeholder="SP 123.456" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Nome do escritório</label>
                                    <Input value={form.escritorioName} onChange={(e) => setF("escritorioName", e.target.value)} placeholder="Silva & Associados Advocacia" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Endereço / Cidade</label>
                                    <Input value={form.escritorioEndereco} onChange={(e) => setF("escritorioEndereco", e.target.value)} placeholder="São Paulo - SP" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preenchimento (Aproximado)</p>
                    <CertificatePreview data={getFormData(form)} />
                    <p className="text-[10px] text-muted-foreground text-center">
                        Prévia ilustrativa. O PDF final mantém as proporções oficiais com margens otimizadas.
                    </p>
                    <div className="flex flex-col gap-2 mt-4">
                        <Button variant="outline" className="w-full gap-2 text-sm shadow-sm" onClick={() => saveToGEDMutation.mutate()} disabled={saveToGEDMutation.isPending || !form.recipientName}>
                            {saveToGEDMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                            Salvar no GED {form.clientId ? "(Vinculado)" : ""}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
