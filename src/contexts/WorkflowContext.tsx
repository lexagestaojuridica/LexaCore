import { createContext, useContext, useState, ReactNode, useCallback } from "react";

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

// ── Templates ──────────────────────────────────────────
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

// ── Sample Data ────────────────────────────────────────
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

function instantiateSteps(template: WorkflowTemplate): WorkflowStep[] {
    return template.steps.map((s, i) => ({
        id: `step-${crypto.randomUUID()}`,
        title: s.title,
        description: s.description,
        completed: false,
        dueDate: s.dueDate,
        notes: "",
    }));
}

const SAMPLE_INSTANCES: WorkflowInstance[] = [
    { id: "w1", templateId: "t1", templateName: "Onboarding de Cliente", templateEmoji: "📋", sectorId: "s2", assignedTo: "m4", assignedToName: "Dra. Ana Costa", priority: "alta", deadline: "2026-02-25", steps: instantiateSteps(TEMPLATES[0]).map((s, i) => ({ ...s, completed: i < 3 })), status: "em_andamento", createdAt: "2026-02-15", createdBy: "m8" },
    { id: "w2", templateId: "t2", templateName: "Petição Inicial", templateEmoji: "⚖️", sectorId: "s1", assignedTo: "m3", assignedToName: "Dr. João Pereira", priority: "media", deadline: "2026-02-28", steps: instantiateSteps(TEMPLATES[1]).map((s, i) => ({ ...s, completed: i < 2 })), status: "em_andamento", createdAt: "2026-02-16", createdBy: "m2" },
    { id: "w3", templateId: "t3", templateName: "Preparação para Audiência", templateEmoji: "📅", sectorId: "s3", assignedTo: "m7", assignedToName: "Dr. Roberto Dias", priority: "alta", deadline: "2026-02-21", steps: instantiateSteps(TEMPLATES[2]).map((s, i) => ({ ...s, completed: i < 4 })), status: "em_andamento", createdAt: "2026-02-14", createdBy: "m1" },
    { id: "w4", templateId: "t5", templateName: "Cobrança Judicial", templateEmoji: "🔄", sectorId: "s2", assignedTo: "m7", assignedToName: "Dr. Roberto Dias", priority: "baixa", deadline: "2026-03-10", steps: instantiateSteps(TEMPLATES[4]).map((s, i) => ({ ...s, completed: i < 1 })), status: "em_andamento", createdAt: "2026-02-18", createdBy: "m8" },
    { id: "w5", templateId: "t6", templateName: "Abertura de Empresa", templateEmoji: "🏢", sectorId: "s5", assignedTo: "m6", assignedToName: "Dra. Fernanda Lima", priority: "media", deadline: "2026-03-05", steps: instantiateSteps(TEMPLATES[5]), status: "pendente", createdAt: "2026-02-19", createdBy: "m8" },
    { id: "w6", templateId: "t4", templateName: "Due Diligence", templateEmoji: "📝", sectorId: "s5", assignedTo: "m4", assignedToName: "Dra. Ana Costa", priority: "alta", deadline: "2026-03-01", steps: instantiateSteps(TEMPLATES[3]).map((s) => ({ ...s, completed: true })), status: "concluido", createdAt: "2026-02-10", createdBy: "m8" },
];

// ── Context ────────────────────────────────────────────
interface WorkflowContextType {
    templates: WorkflowTemplate[];
    members: Member[];
    sectors: Sector[];
    instances: WorkflowInstance[];
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
    const [sectors, setSectors] = useState<Sector[]>(SAMPLE_SECTORS);
    const [instances, setInstances] = useState<WorkflowInstance[]>(SAMPLE_INSTANCES);

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

    const startWorkflow = useCallback((templateId: string, sectorId: string, assignedTo: string, priority: "alta" | "media" | "baixa", deadline: string) => {
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) return;
        const member = SAMPLE_MEMBERS.find((m) => m.id === assignedTo);
        const instance: WorkflowInstance = {
            id: crypto.randomUUID(),
            templateId, templateName: template.name, templateEmoji: template.emoji,
            sectorId, assignedTo, assignedToName: member?.name || "—",
            priority, deadline,
            steps: instantiateSteps(template),
            status: "pendente",
            createdAt: new Date().toISOString().split("T")[0],
            createdBy: "m1",
        };
        setInstances((prev) => [instance, ...prev]);
    }, []);

    const updateInstanceStatus = useCallback((id: string) => {
        setInstances((prev) => prev.map((inst) => {
            if (inst.id !== id) return inst;
            const allDone = inst.steps.every((s) => s.completed);
            const anyDone = inst.steps.some((s) => s.completed);
            const overdue = inst.deadline && new Date(inst.deadline) < new Date() && !allDone;
            const status = allDone ? "concluido" : overdue ? "atrasado" : anyDone ? "em_andamento" : "pendente";
            return { ...inst, status };
        }));
    }, []);

    const completeStep = useCallback((instanceId: string, stepId: string) => {
        setInstances((prev) => prev.map((inst) =>
            inst.id === instanceId ? { ...inst, steps: inst.steps.map((s) => s.id === stepId ? { ...s, completed: true } : s) } : inst
        ));
        setTimeout(() => updateInstanceStatus(instanceId), 0);
    }, [updateInstanceStatus]);

    const uncompleteStep = useCallback((instanceId: string, stepId: string) => {
        setInstances((prev) => prev.map((inst) =>
            inst.id === instanceId ? { ...inst, steps: inst.steps.map((s) => s.id === stepId ? { ...s, completed: false } : s) } : inst
        ));
        setTimeout(() => updateInstanceStatus(instanceId), 0);
    }, [updateInstanceStatus]);

    const updateStepNotes = useCallback((instanceId: string, stepId: string, notes: string) => {
        setInstances((prev) => prev.map((inst) =>
            inst.id === instanceId ? { ...inst, steps: inst.steps.map((s) => s.id === stepId ? { ...s, notes } : s) } : inst
        ));
    }, []);

    const addCustomStep = useCallback((instanceId: string, title: string, description: string) => {
        setInstances((prev) => prev.map((inst) =>
            inst.id === instanceId ? { ...inst, steps: [...inst.steps, { id: crypto.randomUUID(), title, description, completed: false, dueDate: "", notes: "" }] } : inst
        ));
    }, []);

    const deleteWorkflow = useCallback((id: string) => {
        setInstances((prev) => prev.filter((i) => i.id !== id));
    }, []);

    const reassignWorkflow = useCallback((id: string, assignedTo: string) => {
        const member = SAMPLE_MEMBERS.find((m) => m.id === assignedTo);
        setInstances((prev) => prev.map((i) => i.id === id ? { ...i, assignedTo, assignedToName: member?.name || "—" } : i));
    }, []);

    return (
        <WorkflowContext.Provider value={{
            templates: TEMPLATES, members: SAMPLE_MEMBERS, sectors, instances,
            addSector, updateSector, deleteSector,
            startWorkflow, completeStep, uncompleteStep, updateStepNotes, addCustomStep,
            deleteWorkflow, reassignWorkflow, getMember, getSector,
        }}>
            {children}
        </WorkflowContext.Provider>
    );
}
