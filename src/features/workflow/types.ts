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
