import { createContext, useContext, ReactNode, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────
export type DocumentCategory = "peticoes" | "contratos" | "procuracoes" | "notificacoes" | "pareceres" | "recursos" | "outros";

export const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; emoji: string; color: string }> = {
    peticoes: { label: "Petições", emoji: "⚖️", color: "bg-blue-500" },
    contratos: { label: "Contratos", emoji: "📝", color: "bg-emerald-500" },
    procuracoes: { label: "Procurações", emoji: "🔑", color: "bg-violet-500" },
    notificacoes: { label: "Notificações", emoji: "📨", color: "bg-amber-500" },
    pareceres: { label: "Pareceres", emoji: "📋", color: "bg-orange-500" },
    recursos: { label: "Recursos", emoji: "📤", color: "bg-red-500" },
    outros: { label: "Outros", emoji: "📄", color: "bg-slate-500" },
};

export interface DocumentVariable {
    key: string;
    label: string;
    value: string;
    placeholder: string;
}

export interface DocumentVersion {
    id: string;
    content: string;
    savedAt: string;
    label: string;
}

export interface MinutaDocument {
    id: string;
    title: string;
    category: DocumentCategory;
    content: string;
    variables: DocumentVariable[];
    tags: string[];
    favorite: boolean;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
    source: "manual" | "library";
    versions: DocumentVersion[];
}

export interface LibraryTemplate {
    id: string;
    title: string;
    category: DocumentCategory;
    area: string;
    description: string;
    content: string;
    variables: DocumentVariable[];
    downloads: number;
}

// ── Library Templates (static) ─────────────────────────
const LIBRARY_TEMPLATES: LibraryTemplate[] = [
    {
        id: "lib1", title: "Petição Inicial — Ação de Indenização", category: "peticoes", area: "Cível",
        description: "Modelo de petição inicial para ação de indenização por danos morais e materiais.",
        downloads: 1842,
        variables: [
            { key: "cliente", label: "Nome do Cliente", value: "", placeholder: "João da Silva" },
            { key: "cpf", label: "CPF", value: "", placeholder: "000.000.000-00" },
            { key: "endereco", label: "Endereço", value: "", placeholder: "Rua..." },
            { key: "reu", label: "Nome do Réu", value: "", placeholder: "Empresa XYZ Ltda" },
            { key: "cnpj_reu", label: "CNPJ do Réu", value: "", placeholder: "00.000.000/0001-00" },
            { key: "valor_causa", label: "Valor da Causa", value: "", placeholder: "R$ 50.000,00" },
            { key: "comarca", label: "Comarca", value: "", placeholder: "São Paulo/SP" },
            { key: "fatos", label: "Descrição dos Fatos", value: "", placeholder: "Descreva os fatos..." },
        ],
        content: `<h1 style="text-align:center">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE {{comarca}}</h1>
<p><br></p>
<p><strong>{{cliente}}</strong>, inscrito(a) no CPF sob o nº {{cpf}}, residente e domiciliado(a) em {{endereco}}, vem, respeitosamente, à presença de Vossa Excelência, por seu advogado que esta subscreve, propor a presente</p>
<p><br></p>
<h2 style="text-align:center">AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS E MATERIAIS</h2>
<p><br></p>
<p>em face de <strong>{{reu}}</strong>, inscrito(a) no CNPJ sob o nº {{cnpj_reu}}, pelos fatos e fundamentos a seguir expostos:</p>
<p><br></p>
<h3>I — DOS FATOS</h3>
<p>{{fatos}}</p>
<p><br></p>
<h3>II — DO DIREITO</h3>
<p>O Código Civil, em seus artigos 186 e 927, estabelece que aquele que, por ação ou omissão voluntária, negligência ou imprudência, violar direito e causar dano a outrem, ainda que exclusivamente moral, comete ato ilícito e fica obrigado a repará-lo.</p>
<p><br></p>
<h3>III — DO PEDIDO</h3>
<p>Ante o exposto, requer:</p>
<ul><li>A citação do réu para contestar;</li><li>A condenação ao pagamento de indenização por danos morais e materiais;</li><li>A condenação em custas e honorários advocatícios.</li></ul>
<p><br></p>
<p>Dá-se à causa o valor de <strong>{{valor_causa}}</strong>.</p>`,
    },
    {
        id: "lib2", title: "Contrato de Prestação de Serviços Advocatícios", category: "contratos", area: "Geral",
        description: "Contrato padrão de honorários entre advogado e cliente.", downloads: 2350,
        variables: [
            { key: "cliente", label: "Nome do Cliente", value: "", placeholder: "Maria Santos" },
            { key: "cpf", label: "CPF do Cliente", value: "", placeholder: "000.000.000-00" },
            { key: "advogado", label: "Nome do Advogado", value: "", placeholder: "Dr. João Pereira" },
            { key: "oab", label: "OAB", value: "", placeholder: "OAB/SP 123.456" },
            { key: "objeto", label: "Objeto do Contrato", value: "", placeholder: "Defesa em ação trabalhista..." },
            { key: "valor_honorarios", label: "Valor dos Honorários", value: "", placeholder: "R$ 5.000,00" },
            { key: "cidade", label: "Cidade", value: "", placeholder: "São Paulo/SP" },
        ],
        content: `<h1 style="text-align:center">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</h1>
<p><br></p>
<p><strong>CONTRATANTE:</strong> {{cliente}}, CPF nº {{cpf}}</p>
<p><strong>CONTRATADO:</strong> {{advogado}}, {{oab}}</p>
<p><br></p>
<h3>CLÁUSULA 1ª — DO OBJETO</h3>
<p>O presente contrato tem por objeto a prestação de serviços advocatícios consistentes em: {{objeto}}</p>
<h3>CLÁUSULA 2ª — DOS HONORÁRIOS</h3>
<p>O CONTRATANTE pagará ao CONTRATADO o valor de <strong>{{valor_honorarios}}</strong> a título de honorários advocatícios.</p>`,
    },
    {
        id: "lib3", title: "Procuração Ad Judicia", category: "procuracoes", area: "Geral",
        description: "Instrumento de mandato para representação judicial.", downloads: 3120,
        variables: [
            { key: "outorgante", label: "Outorgante", value: "", placeholder: "Nome completo" },
            { key: "nacionalidade", label: "Nacionalidade", value: "", placeholder: "brasileiro(a)" },
            { key: "estado_civil", label: "Estado Civil", value: "", placeholder: "solteiro(a)" },
            { key: "profissao", label: "Profissão", value: "", placeholder: "empresário(a)" },
            { key: "rg", label: "RG", value: "", placeholder: "00.000.000-0" },
            { key: "cpf", label: "CPF", value: "", placeholder: "000.000.000-00" },
            { key: "endereco", label: "Endereço", value: "", placeholder: "Rua..." },
            { key: "advogado", label: "Advogado", value: "", placeholder: "Dr. João Pereira" },
            { key: "oab", label: "OAB", value: "", placeholder: "OAB/SP 123.456" },
        ],
        content: `<h1 style="text-align:center">PROCURAÇÃO AD JUDICIA</h1>
<p><br></p>
<p><strong>OUTORGANTE:</strong> {{outorgante}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, portador(a) do RG nº {{rg}} e CPF nº {{cpf}}, residente e domiciliado(a) em {{endereco}}.</p>
<p><strong>OUTORGADO:</strong> {{advogado}}, {{oab}}</p>
<p><br></p>
<p><strong>PODERES:</strong> Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui seu(sua) bastante procurador(a), com a cláusula "ad judicia", poderes para o foro em geral.</p>`,
    },
    {
        id: "lib4", title: "Notificação Extrajudicial", category: "notificacoes", area: "Cível",
        description: "Modelo de notificação extrajudicial para cobrança.", downloads: 1560,
        variables: [
            { key: "notificante", label: "Notificante", value: "", placeholder: "Nome do notificante" },
            { key: "notificado", label: "Notificado", value: "", placeholder: "Nome do notificado" },
            { key: "objeto", label: "Objeto da Notificação", value: "", placeholder: "Descreva..." },
            { key: "prazo", label: "Prazo", value: "", placeholder: "10 (dez) dias" },
        ],
        content: `<h1 style="text-align:center">NOTIFICAÇÃO EXTRAJUDICIAL</h1>
<p><strong>NOTIFICANTE:</strong> {{notificante}}</p>
<p><strong>NOTIFICADO:</strong> {{notificado}}</p>
<p><br></p>
<p>Pela presente NOTIFICAÇÃO EXTRAJUDICIAL, fica V.Sa. notificado(a) para que, no prazo de <strong>{{prazo}}</strong>, tome as providências quanto a: {{objeto}}</p>`,
    },
    {
        id: "lib5", title: "Recurso de Apelação", category: "recursos", area: "Cível",
        description: "Modelo de recurso de apelação.", downloads: 980,
        variables: [
            { key: "apelante", label: "Apelante", value: "", placeholder: "Nome" },
            { key: "apelado", label: "Apelado", value: "", placeholder: "Nome" },
            { key: "processo", label: "Nº do Processo", value: "", placeholder: "0000000-00.2026.8.26.0000" },
        ],
        content: `<h1 style="text-align:center">RECURSO DE APELAÇÃO</h1>
<p><strong>Processo:</strong> {{processo}}</p>
<p><strong>Apelante:</strong> {{apelante}}</p>
<p><strong>Apelado:</strong> {{apelado}}</p>
<p><br></p>
<p>Vem interpor o presente RECURSO DE APELAÇÃO, com fundamento no artigo 1.009 do CPC.</p>`,
    },
    {
        id: "lib6", title: "Parecer Jurídico", category: "pareceres", area: "Consultivo",
        description: "Modelo de parecer sobre questão consultiva.", downloads: 720,
        variables: [
            { key: "consulente", label: "Consulente", value: "", placeholder: "Nome" },
            { key: "assunto", label: "Assunto", value: "", placeholder: "Viabilidade..." },
            { key: "advogado", label: "Parecerista", value: "", placeholder: "Dr. João" },
        ],
        content: `<h1 style="text-align:center">PARECER JURÍDICO</h1>
<p><strong>CONSULENTE:</strong> {{consulente}}</p>
<p><strong>ASSUNTO:</strong> {{assunto}}</p>
<p><strong>PARECERISTA:</strong> {{advogado}}</p>
<p><br></p>
<h3>I — DA CONSULTA</h3>
<p>Fomos consultados por {{consulente}} acerca de {{assunto}}.</p>`,
    },
    {
        id: "lib7", title: "Reclamação Trabalhista", category: "peticoes", area: "Trabalhista",
        description: "Petição inicial de reclamação trabalhista.", downloads: 2100,
        variables: [
            { key: "reclamante", label: "Reclamante", value: "", placeholder: "Nome" },
            { key: "cpf", label: "CPF", value: "", placeholder: "000.000.000-00" },
            { key: "reclamada", label: "Reclamada", value: "", placeholder: "Empresa XYZ" },
            { key: "cnpj", label: "CNPJ", value: "", placeholder: "00.000.000/0001-00" },
            { key: "funcao", label: "Função", value: "", placeholder: "Auxiliar" },
            { key: "salario", label: "Salário", value: "", placeholder: "R$ 3.000,00" },
        ],
        content: `<h1 style="text-align:center">RECLAMAÇÃO TRABALHISTA</h1>
<p><strong>{{reclamante}}</strong>, CPF nº {{cpf}}, vem propor RECLAMAÇÃO TRABALHISTA em face de <strong>{{reclamada}}</strong>, CNPJ nº {{cnpj}}.</p>
<h3>I — DO CONTRATO</h3>
<p>Admitido para a função de {{funcao}}, com salário de {{salario}}.</p>`,
    },
    {
        id: "lib8", title: "Contrato de Locação Comercial", category: "contratos", area: "Imobiliário",
        description: "Contrato de locação para fins comerciais.", downloads: 1450,
        variables: [
            { key: "locador", label: "Locador", value: "", placeholder: "Nome" },
            { key: "locatario", label: "Locatário", value: "", placeholder: "Nome" },
            { key: "imovel", label: "Imóvel", value: "", placeholder: "Rua..." },
            { key: "valor_aluguel", label: "Aluguel", value: "", placeholder: "R$ 3.000,00" },
        ],
        content: `<h1 style="text-align:center">CONTRATO DE LOCAÇÃO COMERCIAL</h1>
<p><strong>LOCADOR:</strong> {{locador}}</p>
<p><strong>LOCATÁRIO:</strong> {{locatario}}</p>
<p><strong>IMÓVEL:</strong> {{imovel}}</p>
<h3>CLÁUSULA 1ª — DO ALUGUEL</h3>
<p>O valor mensal é de <strong>{{valor_aluguel}}</strong>.</p>`,
    },
];

// ── Helpers ────────────────────────────────────────────
async function getOrgId(userId: string): Promise<string> {
    const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", userId).single();
    return data?.organization_id || "";
}

const mapDoc = (r: any, versions: DocumentVersion[]): MinutaDocument => ({
    id: r.id, title: r.title, category: r.category || "outros",
    content: r.content || "", variables: r.variables || [],
    tags: r.tags || [], favorite: r.favorite || false,
    usageCount: r.usage_count || 0, createdAt: r.created_at?.split("T")[0] || "",
    updatedAt: r.updated_at?.split("T")[0] || "", source: r.source || "manual", versions,
});

// ── Context ────────────────────────────────────────────
interface MinutasContextType {
    documents: MinutaDocument[];
    library: LibraryTemplate[];
    isLoading: boolean;
    createDocument: (data: Omit<MinutaDocument, "id" | "createdAt" | "updatedAt" | "usageCount" | "versions">) => string;
    updateDocument: (id: string, data: Partial<MinutaDocument>) => void;
    deleteDocument: (id: string) => void;
    toggleFavorite: (id: string) => void;
    duplicateFromLibrary: (templateId: string) => string;
    saveVersion: (docId: string, label: string) => void;
    openDocument: string | null;
    setOpenDocument: (id: string | null) => void;
}

const MinutasContext = createContext<MinutasContextType | null>(null);

export const useMinutas = () => {
    const ctx = useContext(MinutasContext);
    if (!ctx) throw new Error("useMinutas must be used within MinutasProvider");
    return ctx;
};

export function MinutasProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const qc = useQueryClient();
    const uid = user?.id || "";
    const [openDocument, setOpenDocument] = useState<string | null>(null);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["minutas_documents"] });

    // ── Fetch org_id once ──
    const { data: orgProfile } = useQuery({
        queryKey: ["minutas_org_profile", uid],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", uid).single();
            return data;
        },
        enabled: !!uid,
    });
    const orgId = orgProfile?.organization_id || "";

    // ── Fetch documents + versions ──
    const { data: documents = [], isLoading } = useQuery({
        queryKey: ["minutas_documents", orgId], enabled: !!orgId,
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from("minutas_documents")
                .select("*")
                .eq("organization_id", orgId)
                .order("updated_at", { ascending: false });
            if (error) throw error;
            if (!rows?.length) return [];

            const ids = rows.map((r: any) => r.id);
            const { data: verRows } = await supabase
                .from("minutas_versions").select("*").in("document_id", ids).order("saved_at");

            const versByDoc: Record<string, DocumentVersion[]> = {};
            (verRows || []).forEach((v: any) => {
                if (!versByDoc[v.document_id]) versByDoc[v.document_id] = [];
                versByDoc[v.document_id].push({
                    id: v.id, content: v.content || "", savedAt: v.saved_at || "", label: v.label || "",
                });
            });

            return rows.map((r: any) => mapDoc(r, versByDoc[r.id] || []));
        },
    });

    // ── Mutations ──
    const createMut = useMutation({
        mutationFn: async (data: any) => {
            const orgId = await getOrgId(uid);
            const { error } = await supabase.from("minutas_documents").insert({
                id: data.id, organization_id: orgId, user_id: uid,
                title: data.title, category: data.category, content: data.content,
                variables: data.variables, tags: data.tags, favorite: data.favorite,
                source: data.source,
            });
            if (error) throw error;
        },
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e.message),
    });

    const createDocument = useCallback((data: Omit<MinutaDocument, "id" | "createdAt" | "updatedAt" | "usageCount" | "versions">): string => {
        const id = crypto.randomUUID();
        createMut.mutate({ ...data, id });
        return id;
    }, []);

    const updateMut = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const payload: any = { updated_at: new Date().toISOString() };
            if (data.title !== undefined) payload.title = data.title;
            if (data.category !== undefined) payload.category = data.category;
            if (data.content !== undefined) payload.content = data.content;
            if (data.variables !== undefined) payload.variables = data.variables;
            if (data.tags !== undefined) payload.tags = data.tags;
            if (data.favorite !== undefined) payload.favorite = data.favorite;
            if (data.usageCount !== undefined) payload.usage_count = data.usageCount;
            const orgId = await getOrgId(uid);
            const { error } = await supabase.from("minutas_documents").update(payload).eq("id", id).eq("organization_id", orgId);
            if (error) throw error;
        },
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e.message),
    });

    const updateDocument = useCallback((id: string, data: Partial<MinutaDocument>) => {
        updateMut.mutate({ id, ...data });
    }, []);

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("minutas_documents").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(),
        onError: (e: any) => toast.error(e.message),
    });

    const deleteDocument = useCallback((id: string) => {
        deleteMut.mutate(id);
        if (openDocument === id) setOpenDocument(null);
    }, [openDocument]);

    const toggleFavorite = useCallback((id: string) => {
        const doc = documents.find((d) => d.id === id);
        if (!doc) return;
        updateMut.mutate({ id, favorite: !doc.favorite });
    }, [documents]);

    const duplicateFromLibrary = useCallback((templateId: string): string => {
        const template = LIBRARY_TEMPLATES.find((t) => t.id === templateId);
        if (!template) return "";
        const id = crypto.randomUUID();
        createMut.mutate({
            id, title: template.title, category: template.category,
            content: template.content, variables: template.variables.map((v) => ({ ...v })),
            tags: [template.area], favorite: false, source: "library",
        });
        return id;
    }, []);

    const saveVersionMut = useMutation({
        mutationFn: async ({ docId, label }: any) => {
            const doc = documents.find((d) => d.id === docId);
            if (!doc) throw new Error("Document not found");
            const { error } = await supabase.from("minutas_versions").insert({
                document_id: docId, content: doc.content, label,
            });
            if (error) throw error;
        },
        onSuccess: () => { invalidate(); toast.success("Versão salva"); },
        onError: (e: any) => toast.error(e.message),
    });

    const saveVersion = useCallback((docId: string, label: string) => {
        saveVersionMut.mutate({ docId, label });
    }, [documents]);

    return (
        <MinutasContext.Provider value={{
            documents, library: LIBRARY_TEMPLATES, isLoading,
            createDocument, updateDocument, deleteDocument,
            toggleFavorite, duplicateFromLibrary, saveVersion,
            openDocument, setOpenDocument,
        }}>
            {children}
        </MinutasContext.Provider>
    );
}
