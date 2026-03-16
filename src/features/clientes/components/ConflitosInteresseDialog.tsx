import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, CheckCircle2, Search, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { motion } from "framer-motion";

interface ConflictResult {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    conflictType: "name" | "document" | "email";
}

interface Props {
    open: boolean;
    onClose: () => void;
    clientName: string;
    clientEmail: string;
    clientDocument: string;
    onProceed: () => void;
}

export function ConflitosInteresseDialog({
    open,
    onClose,
    clientName,
    clientEmail,
    clientDocument,
    onProceed,
}: Props) {
    const { user } = useAuth();

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user && open,
    });
    const orgId = profile?.organization_id;

    const { data: conflitos = [], isLoading } = useQuery({
        queryKey: ["conflito-check", clientName, clientEmail, clientDocument, orgId],
        queryFn: async () => {
            if (!orgId) return [];
            // Check existing clients and opposing parties in processes
            const results: ConflictResult[] = [];

            // Check clients with similar name
            if (clientName.trim().length >= 3) {
                const { data: nameMatches } = await supabase
                    .from("clientes")
                    .select("id, name, email, phone")
                    .eq("organization_id", orgId)
                    .ilike("name", `%${clientName.trim()}%`)
                    .limit(10);

                (nameMatches ?? []).forEach((c) => results.push({ ...c, conflictType: "name" as const }));
            }

            // Check by email
            if (clientEmail.trim()) {
                const { data: emailMatches } = await supabase
                    .from("clientes")
                    .select("id, name, email, phone")
                    .eq("organization_id", orgId)
                    .eq("email", clientEmail.trim())
                    .limit(5);

                (emailMatches ?? []).forEach((c) => {
                    if (!results.find((r) => r.id === c.id)) {
                        results.push({ ...c, conflictType: "email" as const });
                    }
                });
            }

            // Check by CPF/CNPJ
            if (clientDocument.replace(/\D/g, "").length >= 11) {
                const { data: docMatches } = await supabase
                    .from("clientes")
                    .select("id, name, email, phone")
                    .eq("organization_id", orgId)
                    .eq("document", clientDocument.trim())
                    .limit(5);

                (docMatches ?? []).forEach((c) => {
                    if (!results.find((r) => r.id === c.id)) {
                        results.push({ ...c, conflictType: "document" as const });
                    }
                });
            }

            return results;
        },
        enabled: open && !!orgId && clientName.length >= 3,
    });

    const hasConflicts = conflitos.length > 0;
    const conflictTypeLabel: Record<string, string> = {
        name: "Nome similar",
        email: "E-mail igual",
        document: "CPF/CNPJ igual",
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg p-0">
                <div className={cn(
                    "flex items-center gap-3 border-b border-border px-6 py-4",
                    hasConflicts ? "bg-amber-500/5" : "bg-card"
                )}>
                    {isLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : hasConflicts ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                    <div>
                        <DialogTitle className="text-base font-semibold">
                            {isLoading
                                ? "Verificando conflito de interesses..."
                                : hasConflicts
                                    ? `${conflitos.length} possível${conflitos.length > 1 ? "is" : ""} conflito${conflitos.length > 1 ? "s" : ""} encontrado${conflitos.length > 1 ? "s" : ""}`
                                    : "Nenhum conflito detectado"}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Verificação obrigatória conforme Código de Ética OAB (Art. 18)
                        </p>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-8 gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">Cruzando dados com clientes existentes e processos...</p>
                        </div>
                    ) : hasConflicts ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Os seguintes registros podem representar conflito de interesses. Revise antes de prosseguir:
                            </p>
                            <div className="space-y-2">
                                {conflitos.map((c, i) => (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 font-semibold text-sm text-amber-600">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium text-foreground">{c.name}</p>
                                                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5">
                                                    {conflictTypeLabel[c.conflictType]}
                                                </Badge>
                                            </div>
                                            <div className="mt-0.5 space-y-0.5">
                                                {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                                                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                                <p className="text-xs text-destructive font-medium">⚠ Atenção</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Patrocinar cliente em conflito com parte adversa do mesmo processo é vedado pelo Art. 18 do RAOAB.
                                    Prossiga somente após certificar-se que não há conflito real.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center py-6 text-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground">Sem conflitos identificados</p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Nenhum cliente existente com nome, e-mail ou documento semelhante foi encontrado.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <Button variant="outline" onClick={onClose}>
                            {hasConflicts ? "Cancelar cadastro" : "Fechar"}
                        </Button>
                        <Button
                            onClick={() => { onClose(); onProceed(); }}
                            variant={hasConflicts ? "destructive" : "default"}
                            className={!hasConflicts ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        >
                            {hasConflicts ? "Prosseguir mesmo assim" : "Prosseguir com cadastro"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
