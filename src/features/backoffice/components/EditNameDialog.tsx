import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditNameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgName: string;
    onNameChange: (name: string) => void;
    onSubmit: () => void;
    isPending: boolean;
}

export function EditNameDialog({ open, onOpenChange, orgName, onNameChange, onSubmit, isPending }: EditNameDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="text-xl">Editar Nome do Inquilino</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Atualize a razão social ou nome fantasia desta organização.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Input
                        value={orgName}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Nome da Organização"
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
                    <Button onClick={onSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending || !orgName.trim()}>
                        {isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
