import { createContext, useContext, useState, ReactNode, useCallback } from "react";

// ── Shared CRM Types ───────────────────────────────────
export interface CrmContact {
    id: string;
    name: string;
    email: string;
    phone: string;
    type: "pessoa_fisica" | "pessoa_juridica";
    company: string;
    city: string;
    state: string;
    tags: string[];
    score: number;
    notes: string;
    createdAt: string;
    source: "manual" | "lead" | "deal";
}

export interface CrmLead {
    id: string;
    name: string;
    contactId: string;
    contactName: string;
    value: number;
    priority: "alta" | "media" | "baixa";
    date: string;
    notes: string;
    stageId: string;
}

export interface CrmDeal {
    id: string;
    name: string;
    contactId: string;
    contactName: string;
    value: number;
    probability: number;
    stage: string;
    dueDate: string;
    notes: string;
    createdAt: string;
}

export interface CrmActivity {
    id: string;
    type: "ligacao" | "email" | "reuniao" | "tarefa";
    title: string;
    description: string;
    contactId: string;
    contactName: string;
    date: string;
    time: string;
    completed: boolean;
}

// ── Initial Sample Data ────────────────────────────────
const INITIAL_CONTACTS: CrmContact[] = [
    { id: "c1", name: "Carlos Silva", email: "carlos@silva.adv.br", phone: "(11) 99888-7766", type: "pessoa_fisica", company: "Silva & Associados", city: "São Paulo", state: "SP", tags: ["VIP", "Recorrente"], score: 5, notes: "", createdAt: "2026-01-10", source: "manual" },
    { id: "c2", name: "Maria Santos", email: "maria@santos.com", phone: "(21) 98765-4321", type: "pessoa_fisica", company: "", city: "Rio de Janeiro", state: "RJ", tags: ["Novo"], score: 3, notes: "", createdAt: "2026-01-15", source: "manual" },
    { id: "c3", name: "João Pereira", email: "joao@pereira.adv.br", phone: "(31) 97654-3210", type: "pessoa_fisica", company: "Pereira Advocacia", city: "Belo Horizonte", state: "MG", tags: ["Processo Ativo"], score: 4, notes: "", createdAt: "2026-01-20", source: "manual" },
    { id: "c4", name: "Ana Costa", email: "ana@costalaw.com.br", phone: "(41) 96543-2109", type: "pessoa_fisica", company: "", city: "Curitiba", state: "PR", tags: ["Indicação"], score: 2, notes: "", createdAt: "2026-02-01", source: "manual" },
    { id: "c5", name: "Pedro Almeida", email: "pedro@almeida.com", phone: "(51) 95432-1098", type: "pessoa_juridica", company: "Almeida Consultoria", city: "Porto Alegre", state: "RS", tags: ["VIP", "Processo Ativo"], score: 5, notes: "", createdAt: "2026-02-05", source: "manual" },
    { id: "c6", name: "Fernanda Lima", email: "fernanda@lima.adv.br", phone: "(61) 94321-0987", type: "pessoa_fisica", company: "", city: "Brasília", state: "DF", tags: ["Recorrente"], score: 3, notes: "", createdAt: "2026-02-10", source: "manual" },
    { id: "c7", name: "Roberto Dias", email: "roberto@diaslaw.com", phone: "(71) 93210-9876", type: "pessoa_juridica", company: "Dias & Associados", city: "Salvador", state: "BA", tags: ["VIP"], score: 4, notes: "", createdAt: "2026-02-12", source: "manual" },
    { id: "c8", name: "Luciana Ferreira", email: "luciana@ferreira.com.br", phone: "(81) 92109-8765", type: "pessoa_fisica", company: "", city: "Recife", state: "PE", tags: ["Novo"], score: 1, notes: "", createdAt: "2026-02-18", source: "manual" },
];

const INITIAL_LEADS: CrmLead[] = [
    { id: "l1", name: "Contrato Empresarial Silva & Assoc.", contactId: "c1", contactName: "Carlos Silva", value: 25000, priority: "alta", date: "2026-02-20", notes: "", stageId: "novo_lead" },
    { id: "l2", name: "Consultoria Trabalhista", contactId: "c2", contactName: "Maria Santos", value: 8000, priority: "media", date: "2026-02-18", notes: "", stageId: "novo_lead" },
    { id: "l3", name: "Ação de Indenização", contactId: "c3", contactName: "João Pereira", value: 45000, priority: "alta", date: "2026-02-15", notes: "", stageId: "contato_feito" },
    { id: "l4", name: "Revisão Contratual", contactId: "c4", contactName: "Ana Costa", value: 12000, priority: "baixa", date: "2026-02-17", notes: "", stageId: "contato_feito" },
    { id: "l5", name: "Processo Tributário", contactId: "c5", contactName: "Pedro Almeida", value: 60000, priority: "alta", date: "2026-02-10", notes: "", stageId: "proposta_enviada" },
    { id: "l6", name: "Recuperação de Crédito", contactId: "c6", contactName: "Fernanda Lima", value: 18000, priority: "media", date: "2026-02-12", notes: "", stageId: "em_negociacao" },
    { id: "l7", name: "Defesa Cível", contactId: "c7", contactName: "Roberto Dias", value: 35000, priority: "alta", date: "2026-02-05", notes: "", stageId: "fechado_ganho" },
];

const INITIAL_DEALS: CrmDeal[] = [
    { id: "d1", name: "Consultoria Tributária Anual", contactId: "c1", contactName: "Carlos Silva", value: 48000, probability: 85, stage: "Contrato", dueDate: "2026-03-01", notes: "", createdAt: "2026-01-15" },
    { id: "d2", name: "Ação Trabalhista — Defesa", contactId: "c2", contactName: "Maria Santos", value: 25000, probability: 65, stage: "Negociação", dueDate: "2026-03-10", notes: "", createdAt: "2026-01-20" },
    { id: "d3", name: "Contrato Imobiliário", contactId: "c3", contactName: "João Pereira", value: 15000, probability: 40, stage: "Proposta", dueDate: "2026-02-28", notes: "", createdAt: "2026-02-01" },
    { id: "d4", name: "Recuperação Judicial", contactId: "c5", contactName: "Pedro Almeida", value: 120000, probability: 90, stage: "Fechado/Ganho", dueDate: "2026-02-15", notes: "", createdAt: "2026-01-10" },
    { id: "d5", name: "Parecer Societário", contactId: "c4", contactName: "Ana Costa", value: 8000, probability: 55, stage: "Qualificação", dueDate: "2026-03-15", notes: "", createdAt: "2026-02-10" },
    { id: "d6", name: "Planejamento Sucessório", contactId: "c6", contactName: "Fernanda Lima", value: 35000, probability: 70, stage: "Negociação", dueDate: "2026-03-20", notes: "", createdAt: "2026-02-05" },
    { id: "d7", name: "Compliance Empresarial", contactId: "c7", contactName: "Roberto Dias", value: 60000, probability: 30, stage: "Qualificação", dueDate: "2026-04-01", notes: "", createdAt: "2026-02-12" },
    { id: "d8", name: "Due Diligence M&A", contactId: "c8", contactName: "Luciana Ferreira", value: 95000, probability: 20, stage: "Proposta", dueDate: "2026-04-15", notes: "", createdAt: "2026-02-18" },
];

const INITIAL_ACTIVITIES: CrmActivity[] = [
    { id: "a1", type: "ligacao", title: "Retorno sobre proposta", description: "Liguei para Carlos Silva para discutir os termos do contrato empresarial.", contactId: "c1", contactName: "Carlos Silva", date: "2026-02-19", time: "14:30", completed: true },
    { id: "a2", type: "email", title: "Envio de proposta comercial", description: "Enviado orçamento detalhado com 3 opções de planos.", contactId: "c2", contactName: "Maria Santos", date: "2026-02-19", time: "11:00", completed: true },
    { id: "a3", type: "reuniao", title: "Reunião de alinhamento", description: "Reunião presencial para discutir estratégia de defesa. Duração: 1h30.", contactId: "c3", contactName: "João Pereira", date: "2026-02-18", time: "15:00", completed: true },
    { id: "a4", type: "tarefa", title: "Preparar documentação", description: "Organizar documentação para processo tributário.", contactId: "c5", contactName: "Pedro Almeida", date: "2026-02-18", time: "09:00", completed: false },
    { id: "a5", type: "ligacao", title: "Follow-up semanal", description: "Ligação de acompanhamento sobre o andamento do caso.", contactId: "c4", contactName: "Ana Costa", date: "2026-02-17", time: "16:45", completed: true },
    { id: "a6", type: "email", title: "Atualização processual", description: "Enviado relatório com andamento das últimas movimentações.", contactId: "c7", contactName: "Roberto Dias", date: "2026-02-17", time: "10:15", completed: true },
    { id: "a7", type: "reuniao", title: "Apresentação para prospect", description: "Apresentação dos serviços para novo potencial cliente.", contactId: "c6", contactName: "Fernanda Lima", date: "2026-02-16", time: "14:00", completed: true },
    { id: "a8", type: "tarefa", title: "Revisão de contrato", description: "Revisar minutas do contrato de prestação de serviços.", contactId: "c1", contactName: "Carlos Silva", date: "2026-02-15", time: "08:30", completed: true },
];

// ── Context ────────────────────────────────────────────
interface CrmContextType {
    contacts: CrmContact[];
    leads: CrmLead[];
    deals: CrmDeal[];
    activities: CrmActivity[];
    addContact: (contact: Omit<CrmContact, "id" | "createdAt">) => CrmContact;
    updateContact: (id: string, data: Partial<CrmContact>) => void;
    deleteContact: (id: string) => void;
    addLead: (lead: Omit<CrmLead, "id" | "contactId">) => void;
    updateLead: (id: string, data: Partial<CrmLead>) => void;
    deleteLead: (id: string) => void;
    addDeal: (deal: Omit<CrmDeal, "id" | "contactId" | "createdAt">) => void;
    updateDeal: (id: string, data: Partial<CrmDeal>) => void;
    deleteDeal: (id: string) => void;
    addActivity: (activity: Omit<CrmActivity, "id" | "contactId">) => void;
    updateActivity: (id: string, data: Partial<CrmActivity>) => void;
    deleteActivity: (id: string) => void;
    findOrCreateContact: (name: string) => CrmContact;
}

const CrmContext = createContext<CrmContextType | null>(null);

export const useCrm = () => {
    const ctx = useContext(CrmContext);
    if (!ctx) throw new Error("useCrm must be used within CrmProvider");
    return ctx;
};

// ── Provider ───────────────────────────────────────────
export function CrmProvider({ children }: { children: ReactNode }) {
    const [contacts, setContacts] = useState<CrmContact[]>(INITIAL_CONTACTS);
    const [leads, setLeads] = useState<CrmLead[]>(INITIAL_LEADS);
    const [deals, setDeals] = useState<CrmDeal[]>(INITIAL_DEALS);
    const [activities, setActivities] = useState<CrmActivity[]>(INITIAL_ACTIVITIES);

    // Find existing contact by name or create a new one
    const findOrCreateContact = useCallback((name: string): CrmContact => {
        const existing = contacts.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;

        const newContact: CrmContact = {
            id: crypto.randomUUID(),
            name,
            email: "",
            phone: "",
            type: "pessoa_fisica",
            company: "",
            city: "",
            state: "",
            tags: ["Novo"],
            score: 1,
            notes: "",
            createdAt: new Date().toISOString().split("T")[0],
            source: "lead",
        };
        setContacts((prev) => [...prev, newContact]);
        return newContact;
    }, [contacts]);

    // Contacts CRUD
    const addContact = useCallback((data: Omit<CrmContact, "id" | "createdAt">): CrmContact => {
        const c: CrmContact = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString().split("T")[0] };
        setContacts((prev) => [...prev, c]);
        return c;
    }, []);

    const updateContact = useCallback((id: string, data: Partial<CrmContact>) => {
        setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    }, []);

    const deleteContact = useCallback((id: string) => {
        setContacts((prev) => prev.filter((c) => c.id !== id));
    }, []);

    // Leads CRUD — auto-creates contact
    const addLead = useCallback((data: Omit<CrmLead, "id" | "contactId">) => {
        const contact = findOrCreateContact(data.contactName);
        const lead: CrmLead = { ...data, id: crypto.randomUUID(), contactId: contact.id };
        setLeads((prev) => [...prev, lead]);
    }, [findOrCreateContact]);

    const updateLead = useCallback((id: string, data: Partial<CrmLead>) => {
        if (data.contactName) {
            const contact = findOrCreateContact(data.contactName);
            data.contactId = contact.id;
        }
        setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data } : l));
    }, [findOrCreateContact]);

    const deleteLead = useCallback((id: string) => {
        setLeads((prev) => prev.filter((l) => l.id !== id));
    }, []);

    // Deals CRUD — auto-creates contact
    const addDeal = useCallback((data: Omit<CrmDeal, "id" | "contactId" | "createdAt">) => {
        const contact = findOrCreateContact(data.contactName);
        const deal: CrmDeal = { ...data, id: crypto.randomUUID(), contactId: contact.id, createdAt: new Date().toISOString().split("T")[0] };
        setDeals((prev) => [...prev, deal]);
    }, [findOrCreateContact]);

    const updateDeal = useCallback((id: string, data: Partial<CrmDeal>) => {
        if (data.contactName) {
            const contact = findOrCreateContact(data.contactName);
            data.contactId = contact.id;
        }
        setDeals((prev) => prev.map((d) => d.id === id ? { ...d, ...data } : d));
    }, [findOrCreateContact]);

    const deleteDeal = useCallback((id: string) => {
        setDeals((prev) => prev.filter((d) => d.id !== id));
    }, []);

    // Activities CRUD — auto-creates contact
    const addActivity = useCallback((data: Omit<CrmActivity, "id" | "contactId">) => {
        const contact = findOrCreateContact(data.contactName);
        const activity: CrmActivity = { ...data, id: crypto.randomUUID(), contactId: contact.id };
        setActivities((prev) => [activity, ...prev]);
    }, [findOrCreateContact]);

    const updateActivity = useCallback((id: string, data: Partial<CrmActivity>) => {
        setActivities((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
    }, []);

    const deleteActivity = useCallback((id: string) => {
        setActivities((prev) => prev.filter((a) => a.id !== id));
    }, []);

    return (
        <CrmContext.Provider value={{
            contacts, leads, deals, activities,
            addContact, updateContact, deleteContact,
            addLead, updateLead, deleteLead,
            addDeal, updateDeal, deleteDeal,
            addActivity, updateActivity, deleteActivity,
            findOrCreateContact,
        }}>
            {children}
        </CrmContext.Provider>
    );
}
