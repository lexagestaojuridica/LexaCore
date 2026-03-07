import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus, Briefcase, Users, Search, Filter, MoreVertical,
    ArrowRight, Star, Mail, Phone, ExternalLink, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";

const STAGES = [
    { id: "novo", label: "Novos", color: "bg-blue-500" },
    { id: "entrevista", label: "Entrevista", color: "bg-amber-500" },
    { id: "teste", label: "Teste Técnico", color: "bg-purple-500" },
    { id: "proposta", label: "Proposta", color: "bg-emerald-500" },
];

export default function RecrutamentoPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedJobId, setSelectedJobId] = useState<string>("all");
    const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
    const [newJob, setNewJob] = useState({ title: "", department: "", description: "" });

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    const { data: vagas } = useQuery({
        queryKey: ["rh-vagas", orgId],
        queryFn: async () => {
            const { data, error } = await supabase.from("rh_recrutamento_vagas").select("*").eq("organization_id", orgId!);
            if (error) throw error;
            return data;
        },
        enabled: !!orgId,
    });

    const { data: candidatos, isLoading } = useQuery({
        queryKey: ["rh-candidatos", orgId, selectedJobId],
        queryFn: async () => {
            let query = supabase.from("rh_recrutamento_candidatos").select("*, rh_recrutamento_vagas(title)").eq("organization_id", orgId!);
            if (selectedJobId !== "all") {
                query = query.eq("job_id", selectedJobId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!orgId,
    });

    const moveMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: string, stage: string }) => {
            const { error } = await supabase.from("rh_recrutamento_candidatos").update({ pipeline_stage: stage }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rh-candidatos"] });
            toast.success("Candidato movido no pipeline!");
        },
    });

    const jobMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("rh_recrutamento_vagas").insert([{ ...payload, organization_id: orgId! }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rh-vagas"] });
            setIsJobDialogOpen(false);
            setNewJob({ title: "", department: "", description: "" });
            toast.success("Nova vaga aberta!");
        },
    });

    if (isLoading) return <LexaLoadingOverlay visible />;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-[calc(100vh-4rem)] flex flex-col bg-background/50">
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Talent Acquisition e ATS</h1>
                    </div>
                    <p className="text-sm text-muted-foreground ml-10">Controle de pipeline e aquisição estratégica de talentos</p>
                </div>

                <div className="flex gap-2">
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                        <SelectTrigger className="w-[220px] bg-background border-border/50 h-9">
                            <SelectValue placeholder="Filtrar por Vaga" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Vagas</SelectItem>
                            {vagas?.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 h-9 shadow-sm" onClick={() => setIsJobDialogOpen(true)}>
                                <Plus className="h-4 w-4" /> Abrir Vaga
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Criar Nova Vaga</DialogTitle>
                                <DialogDescription>Abra uma nova posição no diretório de talentos.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Título da Vaga</Label>
                                    <Input id="title" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} placeholder="Ex: Desenvolvedor Senior" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dept">Departamento</Label>
                                    <Input id="dept" value={newJob.department} onChange={e => setNewJob({ ...newJob, department: e.target.value })} placeholder="Ex: Tecnologia" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsJobDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={() => jobMutation.mutate(newJob)}>Abrir Posição</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex gap-4 flex-1 overflow-x-auto pb-4 pt-2">
                {STAGES.map((stage) => (
                    <div key={stage.id} className="min-w-[300px] w-[300px] flex flex-col h-full rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
                        <div className="p-3 border-b border-border/50 bg-background/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{stage.label}</h3>
                            </div>
                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 font-bold">
                                {candidatos?.filter(c => c.pipeline_stage === stage.id).length || 0}
                            </Badge>
                        </div>

                        <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {candidatos?.filter(c => c.pipeline_stage === stage.id).map((c) => (
                                    <motion.div
                                        key={c.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group p-3 bg-card border border-border/50 rounded-lg shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer relative"
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm text-foreground leading-none">{c.full_name}</h4>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <span className="text-[10px] font-medium text-primary flex items-center gap-1">
                                                <Briefcase className="h-3 w-3" />
                                                {(c.rh_recrutamento_vagas as { title?: string } | null)?.title || "Vaga Geral"}
                                            </span>

                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} className={`h-2.5 w-2.5 ${s <= (c.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                                                    ))}
                                                </div>
                                                <div className="flex-1" />
                                                {stage.id !== 'proposta' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 text-muted-foreground hover:text-primary"
                                                        onClick={() => {
                                                            const nextStageIdx = STAGES.findIndex(s => s.id === stage.id) + 1;
                                                            if (nextStageIdx < STAGES.length) {
                                                                moveMutation.mutate({ id: c.id, stage: STAGES[nextStageIdx].id });
                                                            }
                                                        }}
                                                    >
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {(!candidatos || candidatos.filter(c => c.pipeline_stage === stage.id).length === 0) && (
                                <div className="border-2 border-dashed border-border/30 rounded-lg h-24 flex flex-center items-center justify-center p-4 text-center">
                                    <span className="text-[10px] text-muted-foreground/50 font-medium">Arraste para mover</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

