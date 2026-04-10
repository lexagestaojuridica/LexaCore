import { createContext, useContext, ReactNode, useCallback } from "react";
import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";

import { WorkflowStep, WorkflowInstance, Member, Sector, WorkflowTemplate } from "../types";

// ── Helper ──────────────────────────────────────────────
function computeStatus(steps: WorkflowStep[], deadline: string): WorkflowInstance["status"] {
    const allDone = steps.every((s: WorkflowStep) => s.completed);
    const anyDone = steps.some((s: WorkflowStep) => s.completed);

    let overdue = false;
    if (deadline && !allDone) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        overdue = today > deadlineDate;
    }

    return allDone ? "concluido" : overdue ? "atrasado" : anyDone ? "em_andamento" : "pendente";
}

interface WorkflowContextType {
    templates: WorkflowTemplate[];
    members: Member[];
    sectors: Sector[];
    instances: WorkflowInstance[];
    isLoading: boolean;
    addSector: (data: Omit<Sector, "id">) => void;
    updateSector: (id: string, data: Partial<Sector>) => void;
    deleteSector: (id: string) => void;
    startWorkflow: (templateId: string, sectorId: string, assignedTo: string, priority: "alta" | "media" | "baixa", deadline: string) => void;
    completeStep: (instanceId: string, stepId: string) => void;
    uncompleteStep: (instanceId: string, stepId: string) => void;
    updateStepNotes: (instanceId: string, stepId: string, notes: string) => void;
    addCustomStep: (instanceId: string, title: string, description: string) => void;
    deleteWorkflow: (id: string) => void;
    reassignWorkflow: (id: string, assignedTo: string) => void;
    getMember: (id: string) => Member | undefined;
    getSector: (id: string) => Sector | undefined;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const useWorkflow = () => {
    const ctx = useContext(WorkflowContext);
    if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
    return ctx;
};

export function WorkflowProvider({ children }: { children: ReactNode }) {
    const utils = trpc.useUtils();

    const instancesQuery = trpc.workflow.listInstances.useQuery();
    const templatesQuery = trpc.workflow.listTemplates.useQuery();
    const sectorsQuery = trpc.workflow.listSectors.useQuery();
    const collaboratorsQuery = trpc.meuDia.listTeam.useQuery();

    const templates = (templatesQuery.data || []) as WorkflowTemplate[];
    const sectors: Sector[] = (sectorsQuery.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji || "⚖️",
        color: s.color || "bg-blue-500",
        coordinatorId: s.coordinator_id || "",
        memberIds: s.member_ids || [],
    }));

    const instanceIds = (instancesQuery.data || []).map((i: any) => i.id);
    const stepsQuery = trpc.workflow.getSteps.useQuery(instanceIds, {
        enabled: instanceIds.length > 0
    });

    // ── Mapping Members ──
    const members: Member[] = (collaboratorsQuery.data || []).map((c: any) => ({
        id: c.id,
        name: c.full_name || "",
        role: "Equipe",
        avatar: (c.full_name || "").split(" ").map((n: string) => n[0]).slice(0, 2).join(""),
    }));

    // ── Mapping Instances ──
    const instances: WorkflowInstance[] = (instancesQuery.data || []).map((r: any) => {
        const rawSteps = (stepsQuery.data || []).filter((s: any) => s.workflow_id === r.id);
        const steps: WorkflowStep[] = rawSteps.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || "",
            completed: s.completed,
            dueDate: s.due_date || "",
            notes: s.notes || "",
        }));

        return {
            id: r.id,
            templateId: r.template_id || "",
            templateName: r.template_name || "",
            templateEmoji: r.template_emoji || "📋",
            sectorId: r.sector_id || "",
            assignedTo: r.assigned_to || "",
            assignedToName: r.assigned_to_name || "",
            priority: r.priority || "media",
            deadline: r.deadline || "",
            steps,
            status: computeStatus(steps, r.deadline || ""),
            createdAt: r.created_at?.split("T")[0] || "",
            createdBy: r.created_by || "",
        };
    });

    const sectorMut = trpc.workflow.upsertSector.useMutation({
        onSuccess: () => utils.workflow.listSectors.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    const sectorDeleteMut = trpc.workflow.deleteSector.useMutation({
        onSuccess: () => utils.workflow.listSectors.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    const startMut = trpc.workflow.startWorkflow.useMutation({
        onSuccess: () => {
            utils.workflow.listInstances.invalidate();
            toast.success("Workflow iniciado");
        },
        onError: (err) => toast.error(err.message),
    });

    const stepMut = trpc.workflow.updateStep.useMutation({
        onSuccess: () => utils.workflow.getSteps.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    const addStepMut = trpc.workflow.addStep.useMutation({
        onSuccess: () => utils.workflow.getSteps.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    const deleteMut = trpc.workflow.deleteWorkflow.useMutation({
        onSuccess: () => {
            utils.workflow.listInstances.invalidate();
            toast.success("Workflow excluído");
        },
        onError: (err) => toast.error(err.message),
    });

    const reassignMut = trpc.workflow.reassignWorkflow.useMutation({
        onSuccess: () => utils.workflow.listInstances.invalidate(),
        onError: (err) => toast.error(err.message),
    });

    // ── Helpers & Handlers ──
    const getMember = useCallback((id: string) => members.find((m) => m.id === id), [members]);
    const getSector = useCallback((id: string) => sectors.find((s) => s.id === id), [sectors]);

    const startWorkflow = useCallback((templateId: string, sectorId: string, assignedTo: string, priority: any, deadline: string) => {
        const template = templates.find((t: WorkflowTemplate) => t.id === templateId);
        if (!template) return;
        const member = members.find((m: Member) => m.id === assignedTo);

        startMut.mutate({
            templateId,
            templateName: template.name,
            templateEmoji: template.emoji,
            sectorId,
            assignedTo,
            assignedToName: member?.name || "—",
            priority,
            deadline: deadline || null,
            steps: (template.steps as any[]).map(s => ({
                title: s.title,
                description: s.description,
                due_date: s.dueDate || null
            }))
        });
    }, [members, startMut, templates]);

    const completeStep = useCallback((_instanceId: string, stepId: string) => {
        stepMut.mutate({ stepId, data: { completed: true } });
    }, [stepMut]);

    const uncompleteStep = useCallback((_instanceId: string, stepId: string) => {
        stepMut.mutate({ stepId, data: { completed: false } });
    }, [stepMut]);

    const updateStepNotes = useCallback((_instanceId: string, stepId: string, notes: string) => {
        stepMut.mutate({ stepId, data: { notes } });
    }, [stepMut]);

    const addCustomStep = useCallback((instanceId: string, title: string, description: string) => {
        addStepMut.mutate({ instanceId, title, description });
    }, [addStepMut]);

    const deleteWorkflow = useCallback((id: string) => deleteMut.mutate(id), [deleteMut]);

    const reassignWorkflow = useCallback((id: string, assignedTo: string) => {
        const member = members.find((m) => m.id === assignedTo);
        reassignMut.mutate({ id, assignedTo, assignedToName: member?.name || "—" });
    }, [members, reassignMut]);

    return (
        <WorkflowContext.Provider value={{
            templates,
            members,
            sectors,
            instances,
            isLoading: instancesQuery.isLoading || collaboratorsQuery.isLoading || stepsQuery.isLoading || templatesQuery.isLoading || sectorsQuery.isLoading,
            addSector: (data) => sectorMut.mutate({ data }),
            updateSector: (id, data) => sectorMut.mutate({ id, data }),
            deleteSector: (id) => sectorDeleteMut.mutate(id),
            startWorkflow, completeStep, uncompleteStep, updateStepNotes, addCustomStep,
            deleteWorkflow, reassignWorkflow, getMember, getSector,
        }}>
            {children}
        </WorkflowContext.Provider>
    );
}
