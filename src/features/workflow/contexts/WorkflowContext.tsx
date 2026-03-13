import { createContext, useContext, ReactNode, useCallback } from "react";
import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";

// ── Types (Reusing existing or defining for tRPC) ──────────────────────
export interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    dueDate: string;
    notes: string;
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

export interface WorkflowTemplate {
    id: string;
    name: string;
    emoji: string;
    category: string;
    description: string;
    steps: any[];
}

// ── Static/Placeholder Data ──────────────────────────────
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

const SAMPLE_SECTORS: Sector[] = [
    { id: "s1", name: "Trabalhista", emoji: "⚖️", color: "bg-blue-500", coordinatorId: "m2", memberIds: ["m3", "m5", "m6"] },
    { id: "s2", name: "Civil", emoji: "📜", color: "bg-emerald-500", coordinatorId: "m8", memberIds: ["m4", "m7"] },
    { id: "s3", name: "Penal", emoji: "🔒", color: "bg-red-500", coordinatorId: "m1", memberIds: ["m3", "m7"] },
    { id: "s4", name: "Tributário", emoji: "💰", color: "bg-amber-500", coordinatorId: "m2", memberIds: ["m5"] },
    { id: "s5", name: "Empresarial", emoji: "🏢", color: "bg-violet-500", coordinatorId: "m8", memberIds: ["m4", "m6"] },
];

function computeStatus(steps: WorkflowStep[], deadline: string): WorkflowInstance["status"] {
    const allDone = steps.every((s) => s.completed);
    const anyDone = steps.some((s) => s.completed);

    let overdue = false;
    if (deadline && !allDone) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        overdue = today > deadlineDate;
    }

    return allDone ? "concluido" : overdue ? "atrasado" : anyDone ? "em_andamento" : "pendente";
}

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
    const utils = trpc.useUtils();

    // ── Queries ──
    const instancesQuery = trpc.workflow.listInstances.useQuery();
    const collaboratorsQuery = trpc.rh.listColaboradores.useQuery();

    const instanceIds = (instancesQuery.data || []).map(i => i.id);
    const stepsQuery = trpc.workflow.getSteps.useQuery(instanceIds, {
        enabled: instanceIds.length > 0
    });

    // ── Mapping Members ──
    const members: Member[] = (collaboratorsQuery.data || []).map(c => ({
        id: c.id,
        name: c.full_name || "",
        role: c.position || "Colaborador",
        avatar: (c.full_name || "").split(" ").map((n: any) => n[0]).slice(0, 2).join(""),
    }));

    // ── Mapping Instances ──
    const instances: WorkflowInstance[] = (instancesQuery.data || []).map(r => {
        const rawSteps = (stepsQuery.data || []).filter(s => s.workflow_id === r.id);
        const steps: WorkflowStep[] = rawSteps.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description || "",
            completed: s.completed,
            dueDate: s.due_date || "",
            notes: s.notes || "",
        }));

        return {
            id: r.id,
            templateId: r.template_id || "",
            templateName: r.template_name || "",
            templateEmoji: r.template_emoji || "📋",
            sectorId: r.sector_id || "",
            assignedTo: r.assigned_to || "",
            assignedToName: r.assigned_to_name || "",
            priority: r.priority || "media",
            deadline: r.deadline || "",
            steps,
            status: computeStatus(steps, r.deadline || ""),
            createdAt: r.created_at?.split("T")[0] || "",
            createdBy: r.created_by || "",
        };
    });

    // ── Mutations ──
    const startMut = trpc.workflow.startWorkflow.useMutation({
        onSuccess: () => {
            utils.workflow.listInstances.invalidate();
            toast.success("Workflow iniciado");
        },
        onError: (err) => toast.error(err.message),
    });

    const stepMut = trpc.workflow.updateStep.useMutation({
        onSuccess: () => utils.workflow.getSteps.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    const addStepMut = trpc.workflow.addStep.useMutation({
        onSuccess: () => utils.workflow.getSteps.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    const deleteMut = trpc.workflow.deleteWorkflow.useMutation({
        onSuccess: () => {
            utils.workflow.listInstances.invalidate();
            toast.success("Workflow excluído");
        },
        onError: (err) => toast.error(err.message),
    });

    const reassignMut = trpc.workflow.reassignWorkflow.useMutation({
        onSuccess: () => utils.workflow.listInstances.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    // ── Helpers & Handlers ──
    const getMember = useCallback((id: string) => members.find((m) => m.id === id), [members]);
    const getSector = useCallback((id: string) => SAMPLE_SECTORS.find((s) => s.id === id), []);

    const startWorkflow = useCallback((templateId: string, sectorId: string, assignedTo: string, priority: any, deadline: string) => {
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) return;
        const member = members.find((m) => m.id === assignedTo);

        startMut.mutate({
            templateId,
            templateName: template.name,
            templateEmoji: template.emoji,
            sectorId,
            assignedTo,
            assignedToName: member?.name || "—",
            priority,
            deadline: deadline || null,
            steps: template.steps.map(s => ({
                title: s.title,
                description: s.description,
                due_date: s.dueDate || null
            }))
        });
    }, [members, startMut]);

    const completeStep = useCallback((_instanceId: string, stepId: string) => {
        stepMut.mutate({ stepId, data: { completed: true } });
    }, [stepMut]);

    const uncompleteStep = useCallback((_instanceId: string, stepId: string) => {
        stepMut.mutate({ stepId, data: { completed: false } });
    }, [stepMut]);

    const updateStepNotes = useCallback((_instanceId: string, stepId: string, notes: string) => {
        stepMut.mutate({ stepId, data: { notes } });
    }, [stepMut]);

    const addCustomStep = useCallback((instanceId: string, title: string, description: string) => {
        addStepMut.mutate({ instanceId, title, description });
    }, [addStepMut]);

    const deleteWorkflow = useCallback((id: string) => deleteMut.mutate(id), [deleteMut]);

    const reassignWorkflow = useCallback((id: string, assignedTo: string) => {
        const member = members.find((m) => m.id === assignedTo);
        reassignMut.mutate({ id, assignedTo, assignedToName: member?.name || "—" });
    }, [members, reassignMut]);

    return (
        <WorkflowContext.Provider value={{
            templates: TEMPLATES,
            members,
            sectors: SAMPLE_SECTORS,
            instances,
            isLoading: instancesQuery.isLoading || collaboratorsQuery.isLoading || stepsQuery.isLoading,
            addSector: () => { }, // Mocked for now
            updateSector: () => { },
            deleteSector: () => { },
            startWorkflow, completeStep, uncompleteStep, updateStepNotes, addCustomStep,
            deleteWorkflow, reassignWorkflow, getMember, getSector,
        }}>
            {children}
        </WorkflowContext.Provider>
    );
}
