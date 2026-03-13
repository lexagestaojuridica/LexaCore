import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { Processo } from "../types";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export const KANBAN_COLUMNS = [
    { status: "ativo", label: "Ativo", color: "border-t-emerald-500 dark:border-t-emerald-400" },
    { status: "suspenso", label: "Suspenso", color: "border-t-amber-500 dark:border-t-amber-400" },
    { status: "arquivado", label: "Arquivado", color: "border-t-muted-foreground" },
    { status: "encerrado", label: "Encerrado", color: "border-t-rose-500 dark:border-t-rose-400" },
];

export function KanbanCard({ p, onEdit, onView, onDelete }: {
    p: Processo;
    onEdit: (p: Processo) => void;
    onView: (p: Processo) => void;
    onDelete: (p: Processo) => void;
}) {
    return (
        <div
            className="group rounded-xl border border-border/60 bg-card p-3.5 hover:border-primary/30 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing space-y-2 mt-3"
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
        </div>
    );
}

export function ProcessKanban({
    processos,
    onEdit,
    onView,
    onDelete,
    onStatusChange
}: {
    processos: Processo[],
    onEdit: (p: Processo) => void,
    onView: (p: Processo) => void,
    onDelete: (p: Processo) => void,
    onStatusChange: (processId: string, newStatus: string) => void
}) {
    // Local state for optimistic UI during drag
    const [localProcessos, setLocalProcessos] = useState<Processo[]>(processos);

    // Sync with external updates
    useEffect(() => {
        setLocalProcessos(processos);
    }, [processos]);

    const handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a valid column
        if (!destination) return;

        // Dropped in exactly the same place
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const newStatus = destination.droppableId;
        const oldStatus = source.droppableId;
        
        // Only trigger DB update if status actually changed
        if (newStatus !== oldStatus) {
            // Optimistic update
            const updated = localProcessos.map(p => 
                p.id === draggableId ? { ...p, status: newStatus } : p
            );
            setLocalProcessos(updated);

            // Call parent mutation
            onStatusChange(draggableId, newStatus);
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {KANBAN_COLUMNS.map((col) => {
                    const colProcessos = localProcessos.filter((p) => p.status === col.status);
                    
                    return (
                        <div key={col.status} className="flex flex-col gap-2">
                            <div className={cn("rounded-xl border border-border/60 bg-muted/20 overflow-hidden shadow-sm", col.color, "border-t-4")}>
                                <div className="flex items-center justify-between px-4 py-3 bg-white/40 dark:bg-card/40 backdrop-blur-sm">
                                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">{col.label}</span>
                                    <Badge variant="secondary" className="text-[10px] font-bold bg-white/60 dark:bg-muted/60">{colProcessos.length}</Badge>
                                </div>
                            </div>

                            <Droppable droppableId={col.status}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={cn(
                                            "flex-1 min-h-[500px] rounded-xl p-2 transition-colors",
                                            snapshot.isDraggingOver ? "bg-muted/30 border border-primary/20 border-dashed" : "bg-transparent"
                                        )}
                                    >
                                        {colProcessos.length === 0 && !snapshot.isDraggingOver ? (
                                            <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border/60 mt-3">
                                                <p className="text-xs text-muted-foreground/50">Vazio</p>
                                            </div>
                                        ) : (
                                            colProcessos.map((p, index) => (
                                                <Draggable key={p.id} draggableId={p.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                opacity: snapshot.isDragging ? 0.8 : 1,
                                                            }}
                                                        >
                                                            <KanbanCard
                                                                p={p}
                                                                onEdit={onEdit}
                                                                onView={onView}
                                                                onDelete={onDelete}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}
