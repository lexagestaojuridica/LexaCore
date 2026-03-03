import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus, Search, Filter, Edit, Trash2, Building2, Mail, Download, User, ArrowRightLeft
} from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";

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
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 400);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    // Demission Flow State
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [colaboradorToDemiss, setColaboradorToDemiss] = useState<Colaborador | null>(null);
    const [destinationUserId, setDestinationUserId] = useState("none");

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    const { data: teamProfiles } = useQuery({
        queryKey: ["profiles-transfer", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("user_id, full_name").eq("organization_id", orgId!);
            return data || [];
        },
        enabled: !!orgId,
    });

    const { data: colaboradores, isLoading } = useQuery({
        queryKey: ["colaboradores", orgId, debouncedSearch],
        queryFn: async () => {
            let query = supabase.from("rh_colaboradores").select("*").eq("organization_id", orgId!);
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
        mutationFn: async (payload: any) => {
            if (editingId) {
                delete payload.organization_id;
                delete payload.created_at;
                const { error } = await supabase.from("rh_colaboradores").update(payload).eq("id", editingId).eq("organization_id", orgId!);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("rh_colaboradores").insert([{ ...payload, organization_id: orgId! }]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
            queryClient.invalidateQueries({ queryKey: ["hr-dashboard-stats"] });
            toast.success(editingId ? "Colaborador atualizado!" : "Colaborador cadastrado!");
            setIsSheetOpen(false);
            resetForm();
        },
        onError: (err: any) => toast.error(`Erro: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("rh_colaboradores").delete().eq("id", id);
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
        setIsSheetOpen(true);
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
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Colaboradores</h1>
                    <p className="text-sm text-muted-foreground">Diretório completo e controle contratual da equipe</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handleExportCSV}>
                        <Download className="h-4 w-4" /> Exportar Planilha
                    </Button>
                    <Sheet open={isSheetOpen} onOpenChange={(open) => { setIsSheetOpen(open); if (!open) resetForm(); }}>
                        <SheetTrigger asChild>
                            <Button className="gap-2 h-9 shadow-sm" onClick={() => setIsSheetOpen(true)}>
                                <Plus className="h-4 w-4" /> Novo Colaborador
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-md overflow-y-auto w-[600px] sm:w-[540px]">
                            <SheetHeader className="mb-6">
                                <SheetTitle>{editingId ? "Editar Colaborador" : "Cadastrar Colaborador"}</SheetTitle>
                                <SheetDescription>
                                    Insira os dados profissionais e contratuais do colaborador Lexa.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Dados Pessoais</Label>
                                    <div className="grid gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="name">Nome Completo</Label>
                                            <Input id="name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ex: João Silva" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="email">E-mail</Label>
                                                <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="joao@empresa.com" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="phone">Telefone</Label>
                                                <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-border/50">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Contratual</Label>
                                    <div className="grid gap-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="dept">Departamento</Label>
                                                <Input id="dept" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Ex: Jurídico" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="pos">Cargo</Label>
                                                <Input id="pos" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Ex: Advogado Pleno" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="salary">Salário Base (R$)</Label>
                                                <Input id="salary" type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="adm">Admissão</Label>
                                                <Input id="adm" type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label>Vínculo</Label>
                                                <Select value={form.employment_type} onValueChange={v => setForm({ ...form, employment_type: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CLT">CLT</SelectItem>
                                                        <SelectItem value="PJ">PJ</SelectItem>
                                                        <SelectItem value="Estágio">Estágio</SelectItem>
                                                        <SelectItem value="Freelance">Freelance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Status</Label>
                                                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Ativo</SelectItem>
                                                        <SelectItem value="on_leave">Afastado</SelectItem>
                                                        <SelectItem value="terminated">Desligado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <SheetFooter className="mt-6">
                                <Button type="submit" className="w-full" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
                                    {editingId ? "Salvar Alterações" : "Cadastrar Colaborador"}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

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
                                    {teamProfiles?.filter(p => true).map(profile => (
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
