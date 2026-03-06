export const STATUS_COLORS = {
    ativo: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    suspenso: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    arquivado: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    baixado: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    encerrado: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    pendente: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    pago: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    atrasado: "bg-destructive/10 text-destructive border-destructive/20",
};

export const STATUS_OPTIONS = [
    { value: "ativo", label: "Ativo", color: STATUS_COLORS.ativo },
    { value: "suspenso", label: "Suspenso", color: STATUS_COLORS.suspenso },
    { value: "arquivado", label: "Arquivado", color: STATUS_COLORS.arquivado },
    { value: "baixado", label: "Baixado", color: STATUS_COLORS.baixado },
];

export const AREAS_DIREITO = [
    "Trabalhista", "Cível", "Previdenciário", "Família", "Criminal",
    "Tributário", "Imobiliário", "Consumidor", "Empresarial", "Outro"
];

export const INSTANCIAS = ["1ª Instância", "2ª Instância", "Tribunais Superiores", "STJ", "STF", "Administrativo"];

export const FASES_PROCESSUAIS = [
    "Conhecimento", "Execução", "Recursal", "Arquivado", "Incial",
    "Saneamento", "Sentença", "Acórdão", "Trânsito em Julgado", "Cumprimento de Sentença"
];

export const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];
