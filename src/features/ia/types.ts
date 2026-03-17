export interface ArunaMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at?: string;
}

export interface ArunaChatOptions {
    onSuccess?: (content: string) => void;
    onError?: (error: Error) => void;
    initialContext?: ArunaContext | string;
}

export interface ArunaContext {
    processos: any[]; // We can improve this if we have a stable Processo type for IA
    clientes: any[];
    eventos: any[];
    tool?: "generate_doc" | "jurisprudencia" | "analyze_doc" | "transcribe";
    doc_type?: string;
    instructions?: string;
    query?: string;
    area?: string;
    document_id?: string;
    analysis_type?: string;
    custom_instructions?: string;
    organization_id?: string;
}
