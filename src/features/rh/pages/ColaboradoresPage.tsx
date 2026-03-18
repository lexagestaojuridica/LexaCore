"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
    Plus, Search, Filter, Edit, Trash2, Building2, Mail, Download, User,
    ArrowRightLeft, ChevronRight, ChevronLeft, Check, X, Loader2, Users, Briefcase, Wallet
} from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { PageHeader } from "@/shared/components/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/shared/hooks/useDebounce";

type Colaborador = {
    id: string;
    organization_id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    department: string;
    position: string;
    status: string | null;
    base_salary: number | null;
    admission_date: string;
    employment_type: string | null;
    work_format: string | null;
    document_cpf: string | null;
};

type ColaboradorPayload = Omit<Colaborador, "id" | "organization_id" | "base_salary"> & { base_salary: string };

const emptyForm = {
    full_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    status: "active",
    base_salary: "0",
    admission_date: new Date().toISOString().split('T')[0],
    employment_type: "CLT",
    work_format: "Híbrido",
    document_cpf: ""
};

export default function ColaboradoresPage() {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ColaboradorPayload>(emptyForm);
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const totalSteps = 3;

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    // Demission Flow State
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [colaboradorToDemiss, setColaboradorToDemiss] = useState<Colaborador | null>(null);
    const [destinationUserId, setDestinationUserId] = useState("none");

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const orgId = profile?.organization_id;

    const { data: teamProfiles } = useQuery({
        queryKey: ["profiles-transfer", orgId],
        queryFn: async () => {
            if (!orgId) return [];
            const { data, error } = await supabase.from("profiles").select("user_id, full_name").eq("organization_id", orgId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!orgId,
    });

    const { data: colaboradores, isLoading } = useQuery({
        queryKey: ["colaboradores", orgId, debouncedSearch],
        queryFn: async () => {
            if (!orgId) return [];
            let query = supabase.from("employees").select("*").eq("organization_id", orgId);
            if (debouncedSearch) {
                query = query.ilike("full_name", `%${debouncedSearch}%`);
            }
            const { data, error } = await query.order("full_name");
            if (error) throw error;
            return data as Colaborador[];
        },
        enabled: !!orgId,
    });

    const mutation = useMutation({
        mutationFn: async (payload: ColaboradorPayload) => {
            if (!orgId) throw new Error("Org ID not found");
            const dbPayload = {
                ...payload,
                base_salary: payload.base_salary ? parseFloat(payload.base_salary) : 0,
                organization_id: orgId
            };

            if (editingId) {
                const { error } = await supabase.from("employees").update(dbPayload).eq("id", editingId).eq("organization_id", orgId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("employees").insert([dbPayload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
            queryClient.invalidateQueries({ queryKey: ["hr-dashboard-stats"] });
            toast.success(editingId ? "Colaborador atualizado!" : "Colaborador cadastrado!");
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (err: any) => toast.error(`Erro: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("employees").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
            queryClient.invalidateQueries({ queryKey: ["hr-dashboard-stats"] });
            if (destinationUserId !== "none") {
                toast.success("Processos transferidos e Colaborador removido.");
            } else {
                toast.success("Colaborador removido.");
            }
            setTransferDialogOpen(false);
            setColaboradorToDemiss(null);
            setDestinationUserId("none");
        },
        onError: (err: any) => toast.error(`Erro ao remover: ${err.message}`),
    });

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setStep(1);
    };

    const handleEdit = (col: Colaborador) => {
        setForm({
            full_name: col.full_name,
            email: col.email || "",
            phone: col.phone || "",
            department: col.department,
            position: col.position,
            status: col.status || "active",
            base_salary: col.base_salary?.toString() || "0",
            admission_date: col.admission_date,
            employment_type: col.employment_type || "CLT",
            work_format: col.work_format || "Híbrido",
            document_cpf: col.document_cpf || ""
        });
        setEditingId(col.id);
        setStep(1);
        setIsDialogOpen(true);
    };

    const handleExportCSV = () => {
        if (!colaboradores || colaboradores.length === 0) {
            toast.error("Não há dados para exportar.");
            return;
        }
        const headers = ["Nome", "E-mail", "Telefone", "Departamento", "Cargo", "Status", "Salário", "Data Admissao", "Vínculo"];
        const csvContent = [
            headers.join(";"),
            ...colaboradores.map(c => [
                c.full_name, c.email || "", c.phone || "", c.department, c.position,
                c.status || "active", c.base_salary || 0, c.admission_date, c.employment_type || "CLT"
            ].join(";"))
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "lexa_colaboradores.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Arquivo exportado com sucesso.");
    };

    const confirmDemission = (col: Colaborador) => {
        setColaboradorToDemiss(col);
        setTransferDialogOpen(true);
    };

    const executeDemission = () => {
        if (colaboradorToDemiss) {
            deleteMutation.mutate(colaboradorToDemiss.id);
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Ativo</Badge>;
            case 'on_leave': return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Afastado</Badge>;
            case 'terminated': return <Badge variant="destructive">Desligado</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) return <LexaLoadingOverlay visible />;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <PageHeader
                title="Gestão de Colaboradores"
                subtitle="Diretório completo e controle contratual da equipe Lexa"
                icon={Users}
                gradient="from-slate-900 to-slate-800"
                actions={
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 h-10 bg-white/5 border-white/10 text-white hover:bg-white/10"
                            onClick={handleExportCSV}
                        >
                            <Download className="h-4 w-4" /> Exportar CSV
                        </Button>
                        <Button
                            className="gap-2 h-10 shadow-lg shadow-primary/20"
                            onClick={() => { resetForm(); setIsDialogOpen(true); }}
                        >
                            <Plus className="h-4 w-4" /> Novo Colaborador
                        </Button>
                    </div>
                }
            />

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none gap-0">
                    <div className="bg-slate-900 p-8 text-white relative h-32 flex flex-col justify-end">
                        <div className="absolute top-6 right-6">
                            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white" onClick={() => setIsDialogOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <DialogTitle className="text-2xl font-bold">
                            {editingId ? "Editar Colaborador" : "Novo Colaborador"}
                        </DialogTitle>
                        <p className="text-slate-400 text-sm mt-1">
                            {step === 1 && "Dados iniciais e contato"}
                            {step === 2 && "Informações profissionais"}
                            {step === 3 && "Detalhes contratuais e status"}
                        </p>

                        {/* Stepper progress */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / totalSteps) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>

                    <div className="p-8 bg-background">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">1</div>
                                        <h3 className="font-semibold text-foreground">Identificação Pessoal</h3>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label>Nome Completo</Label>
                                            <Input value={form.full_name || ""} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ex: João Silva" className="h-11 rounded-xl" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>E-mail Corporativo</Label>
                                                <Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="joao@empresa.com" className="h-11 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Telefone / WhatsApp</Label>
                                                <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="h-11 rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>CPF</Label>
                                            <Input value={form.document_cpf || ""} onChange={e => setForm({ ...form, document_cpf: e.target.value })} placeholder="000.000.000-00" className="h-11 rounded-xl" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">2</div>
                                        <h3 className="font-semibold text-foreground">Estrutura Profissional</h3>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Departamento</Label>
                                                <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Ex: Jurídico" className="h-11 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Cargo / Função</Label>
                                                <Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Ex: Advogado Pleno" className="h-11 rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data de Admissão</Label>
                                            <Input type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} className="h-11 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Formato de Trabalho</Label>
                                            <Select value={form.work_format || "Híbrido"} onValueChange={v => setForm({ ...form, work_format: v })}>
                                                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Presencial">Presencial</SelectItem>
                                                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                                                    <SelectItem value="Remoto">Remoto</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">3</div>
                                        <h3 className="font-semibold text-foreground">Remuneração e Vínculo</h3>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label>Salário Base (R$)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-3 text-muted-foreground">R$</span>
                                                <Input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} className="h-11 pl-10 rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Tipo de Vínculo</Label>
                                                <Select value={form.employment_type || "CLT"} onValueChange={v => setForm({ ...form, employment_type: v })}>
                                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CLT">CLT</SelectItem>
                                                        <SelectItem value="PJ">PJ</SelectItem>
                                                        <SelectItem value="Estágio">Estágio</SelectItem>
                                                        <SelectItem value="Freelance">Freelance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Status Atual</Label>
                                                <Select value={form.status || "active"} onValueChange={v => setForm({ ...form, status: v })}>
                                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Ativo</SelectItem>
                                                        <SelectItem value="on_leave">Afastado</SelectItem>
                                                        <SelectItem value="terminated">Desligado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="p-6 bg-slate-50 border-t flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={step === 1 ? () => setIsDialogOpen(false) : prevStep}
                            className="gap-2 h-11 px-6 rounded-xl hover:bg-slate-200"
                        >
                            {step === 1 ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                            {step === 1 ? "Cancelar" : "Voltar"}
                        </Button>

                        {step < totalSteps ? (
                            <Button
                                onClick={nextStep}
                                className="gap-2 h-11 px-8 rounded-xl shadow-lg shadow-primary/20 group"
                            >
                                Próximo Passo
                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => mutation.mutate(form)}
                                disabled={mutation.isPending}
                                className="gap-2 h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                            >
                                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {editingId ? "Salvar Alterações" : "Concluir Cadastro"}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border/50">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome..."
                                className="pl-9 h-9 bg-background"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 h-9 border-dashed">
                            <Filter className="h-4 w-4" /> Filtros
                        </Button>
                    </div>

                    {!colaboradores || colaboradores.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground">
                            <div className="p-4 bg-muted/50 rounded-full mb-4">
                                <User className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">Ainda não há colaboradores</h3>
                            <p className="mt-1 text-sm max-w-sm">
                                Comece cadastrando os talentos do seu escritório para gerenciar o RH de forma profissional.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/5">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Nome</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Cargo</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Departamento</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Data Admissão</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaboradores.map((col) => (
                                        <TableRow key={col.id} className="hover:bg-muted/20 transition-colors group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {col.full_name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{col.full_name}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Mail className="h-3 w-3" /> {col.email || "Sem e-mail"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{col.position}</span>
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60">{col.department}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Building2 className="h-3 w-3" />
                                                    {col.employment_type} • {col.work_format}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold text-foreground/80">
                                                {col.base_salary ? `R$ ${Number(col.base_salary).toLocaleString('pt-BR')}` : "—"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {col.admission_date ? format(new Date(col.admission_date), "dd/MM/yyyy", { locale: ptBR }) : ""}
                                            </TableCell>
                                            <TableCell>
                                                {statusBadge(col.status || "active")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(col)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => confirmDemission(col)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Transferência na Demissão */}
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" /> Confirmar Desligamento
                        </DialogTitle>
                        <DialogDescription>
                            Você está prestes a remover <strong>{colaboradorToDemiss?.full_name}</strong>. Como ele possui acesso e processos atrelados, você deve redistribuir sua carga de trabalho.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Transferir processos e clientes para:</Label>
                            <Select value={destinationUserId} onValueChange={setDestinationUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um advogado substituto..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="text-muted-foreground">Não transferir (Arquivar responsável)</SelectItem>
                                    {teamProfiles?.map((profile: { user_id: string; full_name: string }) => (
                                        <SelectItem key={profile.user_id} value={profile.user_id}>{profile.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                            <ArrowRightLeft className="w-3 h-3 inline mr-1" />
                            Transferir automaticamente previne "processos órfãos" perdidos no sistema após saída de um membro.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={executeDemission} disabled={deleteMutation.isPending}>
                            Confirmar Demissão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
