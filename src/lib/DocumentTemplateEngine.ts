import { MinutaDocument, DocumentVariable } from "@/contexts/MinutasContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Maps common legal variables to Processo data points.
 */
export const DOCUMENT_VARIABLE_MAPPING: Record<string, (processo: any) => string> = {
    // Process core
    "processo_numero": (p) => p.number || "Processo Administrativo",
    "processo_titulo": (p) => p.title || "",
    "processo_assunto": (p) => p.subject || "",
    "processo_valor": (p) => p.estimated_value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.estimated_value) : "",

    // Parties
    "cliente": (p) => p.cliente_nome || "",
    "reu": (p) => p.parte_contraria || "",

    // Jurisdiction
    "comarca": (p) => p.comarca || "",
    "tribunal": (p) => p.court || "",
    "vara": (p) => p.jurisdiction || "",
    "estado": (p) => p.uf || "",
    "cidade": (p) => p.comarca || "", // Often comarca is the city

    // Dates
    "data_hoje": () => format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    "ano_atual": () => format(new Date(), "yyyy"),

    // Static fallbacks
    "advogado": (p) => "Dr. [Nome do Advogado]", // Usually pulled from organization/user
    "oab": (p) => "OAB/XX 000.000",
};

/**
 * Automatically fills variables in a template based on process data.
 */
export function autoFillTemplate(variables: DocumentVariable[], processo: any): DocumentVariable[] {
    return variables.map(v => {
        const mappingFn = DOCUMENT_VARIABLE_MAPPING[v.key.toLowerCase()];
        if (mappingFn) {
            return {
                ...v,
                value: mappingFn(processo),
            };
        }
        return v;
    });
}

/**
 * Replaces placeholders in content directly.
 */
export function replacePlaceholders(content: string, processo: any): string {
    let result = content;
    Object.entries(DOCUMENT_VARIABLE_MAPPING).forEach(([key, fn]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        result = result.replace(regex, fn(processo));
    });
    return result;
}
