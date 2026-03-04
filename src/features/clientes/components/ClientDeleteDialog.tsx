import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Client } from "../types";

interface ClientDeleteDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (clientId: string) => void;
    client: Client | null;
    isDeleting: boolean;
}

export function ClientDeleteDialog({
    open,
    onClose,
    onConfirm,
    client,
    isDeleting,
}: ClientDeleteDialogProps) {
    if (!client) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle className="font-semibold">Excluir Cliente</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Tem certeza que deseja excluir o cliente <strong className="text-foreground">{client.name}</strong>? Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={() => onConfirm(client.id)}
                    >
                        {isDeleting ? "Excluindo..." : "Excluir"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
