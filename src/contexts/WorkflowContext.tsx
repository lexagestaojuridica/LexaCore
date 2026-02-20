import { createContext, useContext, ReactNode, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────
export interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    dueDate: string;
    notes: string;
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    emoji: string;
    category: string;
    description: string;
    steps: Omit<WorkflowStep, "id" | "completed" | "notes">[];
}

export interface Member {
    id: string;
    name: string;
    role: string;
    avatar: string;
}

export interface Sector {
    id: string;
    name: string;
    emoji: string;
    color: string;
    coordinatorId: string;
    memberIds: string[];
}

export interface WorkflowInstance {
    id: string;
    templateId: string;
    templateName: string;
    templateEmoji: string;
    sectorId: string;
    assignedTo: string;
    assignedToName: string;
    priority: "alta" | "media" | "baixa";
    deadline: string;
    steps: WorkflowStep[];
    status: "pendente" | "em_andamento" | "concluido" | "atrasado";
    createdAt: string;
    createdBy: string;
}

// ── Templates (static reference data) ──────────────────
const TEMPLATES: WorkflowTemplate[] = [
    {
        id: "t1", name: "Onboarding de Cliente", emoji: "📋", category: "Geral",
        description: "Fluxo completo de recepção e cadastro de novo cliente no escritório.",
        steps: [
            { title: "Reunião inicial com o cliente", description: "Agendar e realizar reunião para entender a demanda.", dueDate: "" },
            { title: "Coletar documentos pessoais", description: "RG, CPF, comprovante de residência, procuração.", dueDate: "" },
            { title: "Análise de viabilidade", description: "Avaliar se o caso tem fundamento jurídico e chances de êxito.", dueDate: "" },
            { title: "Elaborar proposta de honorários", description: "Definir valor, forma de pagamento e contrato.", dueDate: "" },
            { title: "Assinar contrato de honorários", description: "Formalizar a contratação do serviço jurídico.", dueDate: "" },
            { title: "Cadastrar no sistema", description: "Registrar cliente e processo no LEXA.", dueDate: "" },
        ],
    },
    {
        id: "t2", name: "Petição Inicial", emoji: "⚖️", category: "Processual",
        description: "Etapas para elaboração e protocolo de petição inicial.",
        steps: [
            { title: "Analisar documentação do caso", description: "Revisar todos os documentos fornecidos pelo cliente.", dueDate: "" },
            { title: "Pesquisa jurisprudencial", description: "Buscar decisões relevantes nos tribunais superiores.", dueDate: "" },
            { title: "Pesquisa doutrinária", description: "Consultar autores e obras de referência na área.", dueDate: "" },
            { title: "Redigir petição inicial", description: "Elaborar a peça processual com fatos, fundamentos e pedidos.", dueDate: "" },
            { title: "Revisão interna", description: "Submeter para revisão do coordenador da área.", dueDate: "" },
            { title: "Ajustar conforme revisão", description: "Incorporar correções e melhorias sugeridas.", dueDate: "" },
            { title: "Protocolar no tribunal", description: "Efetuar o protocolo eletrônico e confirmar recebimento.", dueDate: "" },
        ],
    },
    {
        id: "t3", name: "Preparação para Audiência", emoji: "📅", category: "Processual",
        description: "Checklist de preparação antes de uma audiência judicial.",
        steps: [
            { title: "Revisar autos do processo", description: "Ler todas as peças, decisões e movimentações recentes.", dueDate: "" },
            { title: "Preparar testemunhas", description: "Orientar testemunhas sobre o procedimento da audiência.", dueDate: "" },
            { title: "Organizar documentos", description: "Separar e organizar documentos que serão apresentados.", dueDate: "" },
            { title: "Preparar sustentação oral", description: "Elaborar roteiro de argumentação e pontos-chave.", dueDate: "" },
            { title: "Confirmar data e local", description: "Verificar pauta, endereço e horário da audiência.", dueDate: "" },
        ],
    },
    {
        id: "t4", name: "Due Diligence", emoji: "📝", category: "Empresarial",
        description: "Auditoria jurídica completa para operações societárias.",
        steps: [
            { title: "Análise societária", description: "Verificar atos constitutivos, alterações e quadro societário.", dueDate: "" },
            { title: "Análise fiscal/tributária", description: "Levantar certidões negativas e débitos fiscais.", dueDate: "" },
            { title: "Análise trabalhista", description: "Verificar contingências, ações e passivos trabalhistas.", dueDate: "" },
            { title: "Análise contratual", description: "Revisar contratos vigentes com clientes e fornecedores.", dueDate: "" },
            { title: "Análise imobiliária", description: "Verificar matrículas, ônus e restrições dos imóveis.", dueDate: "" },
            { title: "Análise ambiental", description: "Verificar licenças, autorizações e passivos ambientais.", dueDate: "" },
            { title: "Análise de propriedade intelectual", description: "Verificar marcas, patentes e direitos autorais.", dueDate: "" },
            { title: "Elaborar relatório final", description: "Consolidar todas as análises em relatório executivo.", dueDate: "" },
        ],
    },
    {
        id: "t5", name: "Cobrança Judicial", emoji: "🔄", category: "Cível",
        description: "Fluxo de cobrança de inadimplentes via ação judicial.",
        steps: [
            { title: "Enviar notificação extrajudicial", description: "Notificar devedor com prazo para pagamento.", dueDate: "" },
            { title: "Aguardar prazo de resposta", description: "Esperar retorno ou vencimento do prazo concedido.", dueDate: "" },
            { title: "Ajuizar ação de execução", description: "Protocolar ação de execução de título extrajudicial.", dueDate: "" },
            { title: "Requer penhora de bens", description: "Solicitar bloqueio de contas ou penhora de ativos.", dueDate: "" },
            { title: "Acompanhar cumprimento", description: "Monitorar andamento e diligências do oficial de justiça.", dueDate: "" },
            { title: "Encerrar processo", description: "Registrar pagamento ou arquivamento do caso.", dueDate: "" },
        ],
    },
    {
        id: "t6", name: "Abertura de Empresa", emoji: "🏢", category: "Empresarial",
        description: "Fluxo para constituição de pessoa jurídica.",
        steps: [
            { title: "Consulta de viabilidade", description: "Verificar nome empresarial e endereço na Junta Comercial.", dueDate: "" },
            { title: "Elaborar contrato social", description: "Redigir ato constitutivo com cláusulas e definições.", dueDate: "" },
            { title: "Registrar na Junta Comercial", description: "Protocolar contrato social e obter NIRE.", dueDate: "" },
            { title: "Obter CNPJ", description: "Inscrição no Cadastro Nacional da Pessoa Jurídica.", dueDate: "" },
            { title: "Inscrição estadual/municipal", description: "Registrar nos órgãos fiscais competentes.", dueDate: "" },
            { title: "Obter alvarás e licenças", description: "Solicitar alvará de funcionamento e licenças específicas.", dueDate: "" },
            { title: "Abrir conta bancária PJ", description: "Abrir conta corrente empresarial no banco escolhido.", dueDate: "" },
        ],
    },
];

// ── Static reference data ──────────────────────────────
const SAMPLE_MEMBERS: Member[] = [
    { id: "m1", name: "Dr. Carlos Silva", role: "Sócio", avatar: "CS" },
    { id: "m2", name: "Dra. Maria Santos", role: "Coordenadora", avatar: "MS" },
    { id: "m3", name: "Dr. João Pereira", role: "Advogado", avatar: "JP" },
    { id: "m4", name: "Dra. Ana Costa", role: "Advogada", avatar: "AC" },
    { id: "m5", name: "Dr. Pedro Almeida", role: "Advogado", avatar: "PA" },
    { id: "m6", name: "Dra. Fernanda Lima", role: "Estagiária", avatar: "FL" },
    { id: "m7", name: "Dr. Roberto Dias", role: "Advogado", avatar: "RD" },
    { id: "m8", name: "Dra. Luciana Ferreira", role: "Coordenadora", avatar: "LF" },
];

const SAMPLE_SECTORS: Sector[] = [
    { id: "s1", name: "Trabalhista", emoji: "⚖️", color: "bg-blue-500", coordinatorId: "m2", memberIds: ["m3", "m5", "m6"] },
    { id: "s2", name: "Civil", emoji: "📜", color: "bg-emerald-500", coordinatorId: "m8", memberIds: ["m4", "m7"] },
    { id: "s3", name: "Penal", emoji: "🔒", color: "bg-red-500", coordinatorId: "m1", memberIds: ["m3", "m7"] },
    { id: "s4", name: "Tributário", emoji: "💰", color: "bg-amber-500", coordinatorId: "m2", memberIds: ["m5"] },
    { id: "s5", name: "Empresarial", emoji: "🏢", color: "bg-violet-500", coordinatorId: "m8", memberIds: ["m4", "m6"] },
];

// ── Helpers ────────────────────────────────────────────
async function getOrgId(userId: string): Promise<string> {
    const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", userId).single();
    return data?.organization_id || "";
}

function computeStatus(steps: WorkflowStep[], deadline: string): WorkflowInstance["status"] {
    const allDone = steps.every((s) => s.completed);
    const anyDone = steps.some((s) => s.completed);
    const overdue = deadline && new Date(deadline) < new Date() && !allDone;
    return allDone ? "concluido" : overdue ? "atrasado" : anyDone ? "em_andamento" : "pendente";
}

// ── Context ────────────────────────────────────────────
interface WorkflowContextType {
    templates: WorkflowTemplate[];
    members: Member[];
    sectors: Sector[];
    instances: WorkflowInstance[];
    isLoading: boolean;
    addSector: (data: Omit<Sector, "id">) => void;
    updateSector: (id: string, data: Partial<Sector>) => void;
    deleteSector: (id: string) => void;
    startWorkflow: (templateId: string, sectorId: string, assignedTo: string, priority: "alta" | "media" | "baixa", deadline: string) => void;
    completeStep: (instanceId: string, stepId: string) => void;
    uncompleteStep: (instanceId: string, stepId: string) => void;
    updateStepNotes: (instanceId: string, stepId: string, notes: string) => void;
    addCustomStep: (instanceId: string, title: string, description: string) => void;
    deleteWorkflow: (id: string) => void;
    reassignWorkflow: (id: string, assignedTo: string) => void;
    getMember: (id: string) => Member | undefined;
    getSector: (id: string) => Sector | undefined;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const useWorkflow = () => {
    const ctx = useContext(WorkflowContext);
    if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
    return ctx;
};

export function WorkflowProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const qc = useQueryClient();
    const uid = user?.id || "";
    const [sectors, setSectors] = useState<Sector[]>(SAMPLE_SECTORS);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["workflow_instances"] });

    // ── Fetch instances + steps from Supabase ──
    const { data: instances = [], isLoading } = useQuery({
        queryKey: ["workflow_instances"], enabled: !!uid,
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from("workflow_instances").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            if (!rows?.length) return [];

            const ids = rows.map((r: any) => r.id);
            const { data: stepRows } = await supabase
                .from("workflow_steps").select("*").in("workflow_id", ids).order("sort_order");

            const stepsByWf: Record<string, WorkflowStep[]> = {};
            (stepRows || []).forEach((s: any) => {
                if (!stepsByWf[s.workflow_id]) stepsByWf[s.workflow_id] = [];
                stepsByWf[s.workflow_id].push({
                    id: s.id, title: s.title, description: s.description || "",
                    completed: s.completed, dueDate: s.due_date || "", notes: s.notes || "",
                });
            });

            return rows.map((r: any): WorkflowInstance => {
                const steps = stepsByWf[r.id] || [];
                return {
                    id: r.id, templateId: r.template_id || "", templateName: r.template_name || "",
                    templateEmoji: r.template_emoji || "📋", sectorId: r.sector_id || "",
                    assignedTo: r.assigned_to || "", assignedToName: r.assigned_to_name || "",
                    priority: r.priority || "media", deadline: r.deadline || "",
                    steps, status: computeStatus(steps, r.deadline || ""),
                    createdAt: r.created_at?.split("T")[0] || "", createdBy: r.created_by || "",
                };
            });
        },
    });

    const getMember = useCallback((id: string) => SAMPLE_MEMBERS.find((m) => m.id === id), []);
    const getSector = useCallback((id: string) => sectors.find((s) => s.id === id), [sectors]);

    const addSector = useCallback((data: Omit<Sector, "id">) => {
        setSectors((prev) => [...prev, { ...data, id: crypto.randomUUID() }]);
    }, []);
    const updateSector = useCallback((id: string, data: Partial<Sector>) => {
        setSectors((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
    }, []);
    const deleteSector = useCallback((id: string) => {
        setSectors((prev) => prev.filter((s) => s.id !== id));
    }, []);

    // ── Start workflow ──
    const startMut = useMutation({
        mutationFn: async ({ templateId, sectorId, assignedTo, priority, deadline }: any) => {
            const template = TEMPLATES.find((t) => t.id === templateId);
            if (!template) throw new Error("Template not found");
            const member = SAMPLE_MEMBERS.find((m) => m.id === assignedTo);
            const orgId = await getOrgId(uid);

            const { data: wf, error } = await supabase.from("workflow_instances").insert({
                organization_id: orgId, user_id: uid, template_id: templateId,
                template_name: template.name, template_emoji: template.emoji,
                sector_id: sectorId, assigned_to: assignedTo,
                assigned_to_name: member?.name || "—", priority, deadline: deadline || null,
                status: "pendente", created_by: "m1",
            }).select("id").single();
            if (error) throw error;

            const steps = template.steps.map((s, i) => ({
                workflow_id: wf!.id, title: s.title, description: s.description,
                completed: false, due_date: s.dueDate || null, notes: "", sort_order: i,
            }));
            const { error: stepErr } = await supabase.from("workflow_steps").insert(steps);
            if (stepErr) throw stepErr;
        },
        onSuccess: () => { invalidate(); toast.success("Workflow iniciado"); },
        onError: (e: any) => toast.error(e.message),
    });
    const startWorkflow = useCallback((...args: [string, string, string, "alta" | "media" | "baixa", string]) => {
        startMut.mutate({ templateId: args[0], sectorId: args[1], assignedTo: args[2], priority: args[3], deadline: args[4] });
    }, []);

    // ── Step mutations ──
    const stepMut = useMutation({
        mutationFn: async ({ stepId, data }: { stepId: string; data: any }) => {
            const { error } = await supabase.from("workflow_steps").update(data).eq("id", stepId);
            if (error) throw error;
        },
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e.message),
    });

    const completeStep = useCallback((instanceId: string, stepId: string) => {
        stepMut.mutate({ stepId, data: { completed: true } });
    }, []);
    const uncompleteStep = useCallback((instanceId: string, stepId: string) => {
        stepMut.mutate({ stepId, data: { completed: false } });
    }, []);
    const updateStepNotes = useCallback((instanceId: string, stepId: string, notes: string) => {
        stepMut.mutate({ stepId, data: { notes } });
    }, []);

    const addStepMut = useMutation({
        mutationFn: async ({ instanceId, title, description }: any) => {
            const { error } = await supabase.from("workflow_steps").insert({
                workflow_id: instanceId, title, description, completed: false, sort_order: 999,
            });
            if (error) throw error;
        },
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e.message),
    });
    const addCustomStep = useCallback((instanceId: string, title: string, description: string) => {
        addStepMut.mutate({ instanceId, title, description });
    }, []);

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("workflow_instances").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { invalidate(); toast.success("Workflow excluído"); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteWorkflow = useCallback((id: string) => deleteMut.mutate(id), []);

    const reassignMut = useMutation({
        mutationFn: async ({ id, assignedTo }: any) => {
            const member = SAMPLE_MEMBERS.find((m) => m.id === assignedTo);
            const { error } = await supabase.from("workflow_instances")
                .update({ assigned_to: assignedTo, assigned_to_name: member?.name || "—" }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e.message),
    });
    const reassignWorkflow = useCallback((id: string, assignedTo: string) => {
        reassignMut.mutate({ id, assignedTo });
    }, []);

    return (
        <WorkflowContext.Provider value={{
            templates: TEMPLATES, members: SAMPLE_MEMBERS, sectors, instances, isLoading,
            addSector, updateSector, deleteSector,
            startWorkflow, completeStep, uncompleteStep, updateStepNotes, addCustomStep,
            deleteWorkflow, reassignWorkflow, getMember, getSector,
        }}>
            {children}
        </WorkflowContext.Provider>
    );
}
