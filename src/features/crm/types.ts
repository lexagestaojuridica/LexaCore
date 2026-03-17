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
