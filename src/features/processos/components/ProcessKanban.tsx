import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Processo } from "../types";

export const KANBAN_COLUMNS = [
    { status: "ativo", label: "Ativo", color: "border-t-emerald-500 dark:border-t-emerald-400" },
    { status: "suspenso", label: "Suspenso", color: "border-t-amber-500 dark:border-t-amber-400" },
    { status: "arquivado", label: "Arquivado", color: "border-t-muted-foreground" },
    { status: "encerrado", label: "Encerrado", color: "border-t-rose-500 dark:border-t-rose-400" },
];

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
};

export function KanbanCard({ p, onEdit, onView, onDelete }: {
    p: Processo;
    onEdit: (p: Processo) => void;
    onView: (p: Processo) => void;
    onDelete: (p: Processo) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group rounded-xl border border-border/60 bg-card p-3.5 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer space-y-2"
            onClick={() => onView(p)}
        >
            <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{p.title}</p>
            {p.number && <p className="text-xs text-muted-foreground">Nº {p.number}</p>}
            {p.court && <p className="text-xs text-muted-foreground truncate">{p.court}</p>}
            {p.estimated_value != null && (
                <p className="text-xs font-medium text-primary">
                    R$ {Number(p.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
            )}
            <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-border/40 mt-1">
                <span className="text-[10px] text-muted-foreground">
                    {format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}
                </span>
                <div className="flex gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Edit2 className="h-3 w-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(p); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export function ProcessKanban({
    processos,
    onEdit,
    onView,
    onDelete
}: {
    processos: Processo[],
    onEdit: (p: Processo) => void,
    onView: (p: Processo) => void,
    onDelete: (p: Processo) => void
}) {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        >
            {KANBAN_COLUMNS.map((col) => {
                const colProcessos = processos.filter((p) => p.status === col.status);
                return (
                    <motion.div variants={item} key={col.status} className="flex flex-col gap-4">
                        <div className={cn("rounded-xl border border-border/60 bg-muted/20 overflow-hidden shadow-sm", col.color, "border-t-4")}>
                            <div className="flex items-center justify-between px-4 py-3 bg-white/40 dark:bg-card/40 backdrop-blur-sm">
                                <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">{col.label}</span>
                                <Badge variant="secondary" className="text-[10px] font-bold bg-white/60 dark:bg-muted/60">{colProcessos.length}</Badge>
                            </div>
                        </div>
                        <div className="space-y-3 min-h-[200px] p-1">
                            <AnimatePresence>
                                {colProcessos.length === 0 ? (
                                    <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border/60">
                                        <p className="text-xs text-muted-foreground/50">Nenhum processo</p>
                                    </div>
                                ) : (
                                    colProcessos.map((p) => (
                                        <KanbanCard
                                            key={p.id}
                                            p={p}
                                            onEdit={onEdit}
                                            onView={onView}
                                            onDelete={onDelete}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
