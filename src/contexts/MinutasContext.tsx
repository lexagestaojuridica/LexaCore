import { createContext, useContext, useState, ReactNode, useCallback } from "react";

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

// ── Library Templates ──────────────────────────────────
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
<ul>
<li>A citação do réu para contestar;</li>
<li>A condenação ao pagamento de indenização por danos morais e materiais;</li>
<li>A condenação em custas e honorários advocatícios.</li>
</ul>
<p><br></p>
<p>Dá-se à causa o valor de <strong>{{valor_causa}}</strong>.</p>
<p><br></p>
<p style="text-align:right">{{comarca}}, {{data}}</p>
<p style="text-align:right"><strong>____________________________</strong></p>
<p style="text-align:right">Advogado — OAB/XX nº 00.000</p>`,
    },
    {
        id: "lib2", title: "Contrato de Prestação de Serviços Advocatícios", category: "contratos", area: "Geral",
        description: "Contrato padrão de honorários entre advogado e cliente.",
        downloads: 2350,
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
<p>Pelo presente instrumento particular, as partes abaixo qualificadas:</p>
<p><br></p>
<p><strong>CONTRATANTE:</strong> {{cliente}}, CPF nº {{cpf}}</p>
<p><strong>CONTRATADO:</strong> {{advogado}}, {{oab}}</p>
<p><br></p>
<p>Têm entre si justo e contratado o seguinte:</p>
<p><br></p>
<h3>CLÁUSULA 1ª — DO OBJETO</h3>
<p>O presente contrato tem por objeto a prestação de serviços advocatícios consistentes em: {{objeto}}</p>
<p><br></p>
<h3>CLÁUSULA 2ª — DOS HONORÁRIOS</h3>
<p>O CONTRATANTE pagará ao CONTRATADO o valor de <strong>{{valor_honorarios}}</strong> a título de honorários advocatícios.</p>
<p><br></p>
<h3>CLÁUSULA 3ª — DAS OBRIGAÇÕES</h3>
<p>O CONTRATADO se compromete a defender os interesses do CONTRATANTE com zelo, diligência e sigilo profissional.</p>
<p><br></p>
<p style="text-align:right">{{cidade}}, {{data}}</p>
<p><br></p>
<p>____________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;____________________________</p>
<p>CONTRATANTE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CONTRATADO</p>`,
    },
    {
        id: "lib3", title: "Procuração Ad Judicia", category: "procuracoes", area: "Geral",
        description: "Instrumento de mandato para representação judicial.",
        downloads: 3120,
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
<p><br></p>
<p><strong>OUTORGADO:</strong> {{advogado}}, {{oab}}</p>
<p><br></p>
<p><strong>PODERES:</strong> Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui seu(sua) bastante procurador(a) o(a) OUTORGADO(A), a quem confere amplos poderes para o foro em geral, com a cláusula "ad judicia", em qualquer Juízo, Instância ou Tribunal, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras, até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe, ainda, poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre que se funda a ação, receber, dar quitação e firmar compromisso.</p>
<p><br></p>
<p style="text-align:right">________, __ de ________ de 20__</p>
<p><br></p>
<p style="text-align:center">____________________________</p>
<p style="text-align:center">{{outorgante}}</p>`,
    },
    {
        id: "lib4", title: "Notificação Extrajudicial", category: "notificacoes", area: "Cível",
        description: "Modelo de notificação extrajudicial para cobrança ou ciência.",
        downloads: 1560,
        variables: [
            { key: "notificante", label: "Notificante", value: "", placeholder: "Nome do notificante" },
            { key: "notificado", label: "Notificado", value: "", placeholder: "Nome do notificado" },
            { key: "endereco_notificado", label: "Endereço do Notificado", value: "", placeholder: "Rua..." },
            { key: "objeto", label: "Objeto da Notificação", value: "", placeholder: "Descreva..." },
            { key: "prazo", label: "Prazo", value: "", placeholder: "10 (dez) dias" },
            { key: "cidade", label: "Cidade", value: "", placeholder: "São Paulo/SP" },
        ],
        content: `<h1 style="text-align:center">NOTIFICAÇÃO EXTRAJUDICIAL</h1>
<p><br></p>
<p><strong>NOTIFICANTE:</strong> {{notificante}}</p>
<p><strong>NOTIFICADO:</strong> {{notificado}}</p>
<p><strong>ENDEREÇO:</strong> {{endereco_notificado}}</p>
<p><br></p>
<p>Prezado(a) Senhor(a),</p>
<p><br></p>
<p>Pela presente NOTIFICAÇÃO EXTRAJUDICIAL, venho, por meio de meu advogado constituído, NOTIFICAR Vossa Senhoria acerca do seguinte:</p>
<p><br></p>
<p>{{objeto}}</p>
<p><br></p>
<p>Assim sendo, fica Vossa Senhoria <strong>NOTIFICADO(A)</strong> para que, no prazo de <strong>{{prazo}}</strong>, tome as providências cabíveis, sob pena de serem adotadas as medidas judiciais pertinentes.</p>
<p><br></p>
<p style="text-align:right">{{cidade}}, {{data}}</p>
<p style="text-align:right">____________________________</p>
<p style="text-align:right">Advogado — OAB/XX nº 00.000</p>`,
    },
    {
        id: "lib5", title: "Recurso de Apelação", category: "recursos", area: "Cível",
        description: "Modelo de recurso de apelação contra sentença de primeiro grau.",
        downloads: 980,
        variables: [
            { key: "apelante", label: "Apelante", value: "", placeholder: "Nome do apelante" },
            { key: "apelado", label: "Apelado", value: "", placeholder: "Nome do apelado" },
            { key: "processo", label: "Nº do Processo", value: "", placeholder: "0000000-00.2026.8.26.0000" },
            { key: "vara", label: "Vara de Origem", value: "", placeholder: "1ª Vara Cível" },
            { key: "comarca", label: "Comarca", value: "", placeholder: "São Paulo/SP" },
        ],
        content: `<h1 style="text-align:center">RECURSO DE APELAÇÃO</h1>
<p><br></p>
<p><strong>Processo nº:</strong> {{processo}}</p>
<p><strong>Vara de Origem:</strong> {{vara}} — Comarca de {{comarca}}</p>
<p><strong>Apelante:</strong> {{apelante}}</p>
<p><strong>Apelado:</strong> {{apelado}}</p>
<p><br></p>
<p>EGRÉGIO TRIBUNAL,</p>
<p><br></p>
<p><strong>{{apelante}}</strong>, já qualificado(a) nos autos, vem, respeitosamente, interpor o presente <strong>RECURSO DE APELAÇÃO</strong>, com fundamento no artigo 1.009 do CPC, contra a sentença proferida nos autos, pelas razões que seguem em anexo.</p>
<p><br></p>
<h3>RAZÕES DA APELAÇÃO</h3>
<p><br></p>
<h3>I — DA TEMPESTIVIDADE</h3>
<p>O presente recurso é tempestivo, eis que interposto dentro do prazo legal de 15 (quinze) dias úteis.</p>
<p><br></p>
<h3>II — DOS FATOS E DO DIREITO</h3>
<p>[Desenvolver argumentação]</p>
<p><br></p>
<h3>III — DO PEDIDO</h3>
<p>Ante o exposto, requer o conhecimento e provimento do presente recurso para reformar a sentença recorrida.</p>`,
    },
    {
        id: "lib6", title: "Parecer Jurídico", category: "pareceres", area: "Consultivo",
        description: "Modelo de parecer jurídico sobre questão consultiva.",
        downloads: 720,
        variables: [
            { key: "consulente", label: "Consulente", value: "", placeholder: "Nome do consulente" },
            { key: "assunto", label: "Assunto", value: "", placeholder: "Viabilidade jurídica de..." },
            { key: "advogado", label: "Parecerista", value: "", placeholder: "Dr. João Pereira" },
            { key: "oab", label: "OAB", value: "", placeholder: "OAB/SP 123.456" },
        ],
        content: `<h1 style="text-align:center">PARECER JURÍDICO</h1>
<p><br></p>
<p><strong>CONSULENTE:</strong> {{consulente}}</p>
<p><strong>ASSUNTO:</strong> {{assunto}}</p>
<p><strong>PARECERISTA:</strong> {{advogado}} — {{oab}}</p>
<p><br></p>
<h3>I — DA CONSULTA</h3>
<p>Fomos consultados por {{consulente}} acerca de {{assunto}}.</p>
<p><br></p>
<h3>II — DOS FATOS</h3>
<p>[Descrever os fatos narrados]</p>
<p><br></p>
<h3>III — DA ANÁLISE JURÍDICA</h3>
<p>[Desenvolver fundamentação]</p>
<p><br></p>
<h3>IV — DA CONCLUSÃO</h3>
<p>É o parecer, S.M.J.</p>
<p><br></p>
<p style="text-align:right">{{data}}</p>
<p style="text-align:right"><strong>{{advogado}}</strong></p>
<p style="text-align:right">{{oab}}</p>`,
    },
    {
        id: "lib7", title: "Reclamação Trabalhista", category: "peticoes", area: "Trabalhista",
        description: "Petição inicial de reclamação trabalhista com pedidos comuns.",
        downloads: 2100,
        variables: [
            { key: "reclamante", label: "Reclamante", value: "", placeholder: "Nome do reclamante" },
            { key: "cpf", label: "CPF", value: "", placeholder: "000.000.000-00" },
            { key: "reclamada", label: "Reclamada", value: "", placeholder: "Empresa XYZ Ltda" },
            { key: "cnpj", label: "CNPJ", value: "", placeholder: "00.000.000/0001-00" },
            { key: "funcao", label: "Função exercida", value: "", placeholder: "Auxiliar administrativo" },
            { key: "admissao", label: "Data de admissão", value: "", placeholder: "01/01/2020" },
            { key: "demissao", label: "Data de demissão", value: "", placeholder: "31/12/2025" },
            { key: "salario", label: "Último salário", value: "", placeholder: "R$ 3.000,00" },
        ],
        content: `<h1 style="text-align:center">RECLAMAÇÃO TRABALHISTA</h1>
<p><br></p>
<p><strong>{{reclamante}}</strong>, CPF nº {{cpf}}, vem propor a presente <strong>RECLAMAÇÃO TRABALHISTA</strong> em face de <strong>{{reclamada}}</strong>, CNPJ nº {{cnpj}}, pelos fatos e fundamentos seguintes:</p>
<p><br></p>
<h3>I — DO CONTRATO DE TRABALHO</h3>
<p>O Reclamante foi admitido em {{admissao}} para exercer a função de {{funcao}}, com último salário de {{salario}}, tendo sido dispensado em {{demissao}}.</p>
<p><br></p>
<h3>II — DAS VERBAS RESCISÓRIAS</h3>
<p>[Detalhar verbas não pagas]</p>
<p><br></p>
<h3>III — DOS PEDIDOS</h3>
<ul><li>Pagamento de verbas rescisórias</li><li>Pagamento de horas extras</li><li>FGTS + multa de 40%</li><li>Seguro-desemprego</li><li>Honorários advocatícios</li></ul>`,
    },
    {
        id: "lib8", title: "Contrato de Locação Comercial", category: "contratos", area: "Imobiliário",
        description: "Contrato de locação para fins comerciais.",
        downloads: 1450,
        variables: [
            { key: "locador", label: "Locador", value: "", placeholder: "Nome do proprietário" },
            { key: "locatario", label: "Locatário", value: "", placeholder: "Nome do inquilino" },
            { key: "imovel", label: "Endereço do Imóvel", value: "", placeholder: "Rua..." },
            { key: "valor_aluguel", label: "Valor do Aluguel", value: "", placeholder: "R$ 3.000,00" },
            { key: "prazo", label: "Prazo (meses)", value: "", placeholder: "36 meses" },
        ],
        content: `<h1 style="text-align:center">CONTRATO DE LOCAÇÃO COMERCIAL</h1>
<p><br></p>
<p><strong>LOCADOR:</strong> {{locador}}</p>
<p><strong>LOCATÁRIO:</strong> {{locatario}}</p>
<p><strong>IMÓVEL:</strong> {{imovel}}</p>
<p><br></p>
<h3>CLÁUSULA 1ª — DO OBJETO</h3>
<p>O LOCADOR cede ao LOCATÁRIO o imóvel acima descrito para fins comerciais.</p>
<h3>CLÁUSULA 2ª — DO ALUGUEL</h3>
<p>O valor mensal é de <strong>{{valor_aluguel}}</strong>, com vencimento todo dia 10.</p>
<h3>CLÁUSULA 3ª — DO PRAZO</h3>
<p>Prazo de <strong>{{prazo}}</strong>.</p>`,
    },
];

// ── Sample User Documents ──────────────────────────────
const SAMPLE_DOCUMENTS: MinutaDocument[] = [
    {
        id: "d1", title: "Petição — Caso Silva vs. TechCorp", category: "peticoes",
        content: "<h1>Petição Inicial</h1><p>Texto da petição do caso Silva...</p>",
        variables: [{ key: "cliente", label: "Cliente", value: "Carlos Silva", placeholder: "" }],
        tags: ["Urgente", "Trabalhista"], favorite: true, usageCount: 5,
        createdAt: "2026-02-10", updatedAt: "2026-02-18", source: "library",
        versions: [{ id: "v1", content: "<p>Versão inicial</p>", savedAt: "2026-02-10T10:00:00", label: "Versão 1" }],
    },
    {
        id: "d2", title: "Contrato de Honorários — Padrão", category: "contratos",
        content: "<h1>Contrato</h1><p>Modelo padrão de honorários do escritório...</p>",
        variables: [], tags: ["Template", "Recorrente"], favorite: true, usageCount: 23,
        createdAt: "2026-01-15", updatedAt: "2026-02-15", source: "manual",
        versions: [],
    },
    {
        id: "d3", title: "Procuração — Cliente Pedro Almeida", category: "procuracoes",
        content: "<h1>Procuração</h1><p>Procuração ad judicia...</p>",
        variables: [{ key: "outorgante", label: "Outorgante", value: "Pedro Almeida", placeholder: "" }],
        tags: ["Empresarial"], favorite: false, usageCount: 1,
        createdAt: "2026-02-18", updatedAt: "2026-02-18", source: "library",
        versions: [],
    },
];

// ── Context ────────────────────────────────────────────
interface MinutasContextType {
    documents: MinutaDocument[];
    library: LibraryTemplate[];
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
    const [documents, setDocuments] = useState<MinutaDocument[]>(SAMPLE_DOCUMENTS);
    const [openDocument, setOpenDocument] = useState<string | null>(null);

    const createDocument = useCallback((data: Omit<MinutaDocument, "id" | "createdAt" | "updatedAt" | "usageCount" | "versions">): string => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString().split("T")[0];
        setDocuments((prev) => [{ ...data, id, createdAt: now, updatedAt: now, usageCount: 0, versions: [] }, ...prev]);
        return id;
    }, []);

    const updateDocument = useCallback((id: string, data: Partial<MinutaDocument>) => {
        setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString().split("T")[0] } : d));
    }, []);

    const deleteDocument = useCallback((id: string) => {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (openDocument === id) setOpenDocument(null);
    }, [openDocument]);

    const toggleFavorite = useCallback((id: string) => {
        setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, favorite: !d.favorite } : d));
    }, []);

    const duplicateFromLibrary = useCallback((templateId: string): string => {
        const template = LIBRARY_TEMPLATES.find((t) => t.id === templateId);
        if (!template) return "";
        const id = crypto.randomUUID();
        const now = new Date().toISOString().split("T")[0];
        const doc: MinutaDocument = {
            id, title: template.title, category: template.category,
            content: template.content, variables: template.variables.map((v) => ({ ...v })),
            tags: [template.area], favorite: false, usageCount: 0,
            createdAt: now, updatedAt: now, source: "library", versions: [],
        };
        setDocuments((prev) => [doc, ...prev]);
        return id;
    }, []);

    const saveVersion = useCallback((docId: string, label: string) => {
        setDocuments((prev) => prev.map((d) => {
            if (d.id !== docId) return d;
            const version: DocumentVersion = { id: crypto.randomUUID(), content: d.content, savedAt: new Date().toISOString(), label };
            return { ...d, versions: [...d.versions, version] };
        }));
    }, []);

    return (
        <MinutasContext.Provider value={{
            documents, library: LIBRARY_TEMPLATES,
            createDocument, updateDocument, deleteDocument,
            toggleFavorite, duplicateFromLibrary, saveVersion,
            openDocument, setOpenDocument,
        }}>
            {children}
        </MinutasContext.Provider>
    );
}
