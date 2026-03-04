import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import type { Organization, SubscriptionPlanRef } from "../types";

interface ManageSubscriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    org: Organization | null;
    plansList: SubscriptionPlanRef[] | undefined;
    selectedPlanId: string;
    onSelectPlan: (planId: string) => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function ManageSubscriptionDialog({
    open, onOpenChange, org, plansList, selectedPlanId, onSelectPlan, onConfirm, isPending
}: ManageSubscriptionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="text-xl">Gerenciar Plano</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Force uma atualização no plano de {org?.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {plansList?.map((plan) => (
                        <button
                            key={plan.id}
                            onClick={() => onSelectPlan(plan.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${selectedPlanId === plan.id
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                                }`}
                        >
                            <div>
                                <div className="font-semibold">{plan.name}</div>
                                <div className="text-xs opacity-70 mt-1 uppercase tracking-wider">{plan.slug}</div>
                            </div>
                            {selectedPlanId === plan.id && <CheckCircle className="h-5 w-5" />}
                        </button>
                    ))}
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
                    <Button onClick={onConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending || !selectedPlanId}>
                        {isPending ? "Atualizando..." : "Confirmar Plano"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
