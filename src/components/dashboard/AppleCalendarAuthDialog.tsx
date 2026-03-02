import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Info } from "lucide-react";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";

interface AppleCalendarAuthDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AppleCalendarAuthDialog({ open, onOpenChange }: AppleCalendarAuthDialogProps) {
    const { connect, connecting } = useAppleCalendar();
    const [appleId, setAppleId] = useState("");
    const [password, setPassword] = useState("");

    const handleConnect = async () => {
        if (!appleId || !password) return;
        const success = await connect(appleId, password);
        if (success) {
            onOpenChange(false);
            setAppleId("");
            setPassword("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Conectar ao Apple Calendar</DialogTitle>
                    <DialogDescription>
                        A Apple exige que você utilize uma <strong>Senha de Aplicativo Específica</strong> (App-Specific Password) para conectar calendários em apps de terceiros com segurança.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 p-4 rounded-lg flex gap-3 text-sm my-2">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-medium">Como gerar sua senha:</p>
                        <ol className="list-decimal list-inside text-muted-foreground space-y-1 ml-1 text-xs">
                            <li>Acesse <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">appleid.apple.com <ExternalLink className="w-3 h-3 ml-1" /></a></li>
                            <li>Vá em <strong>Início de Sessão e Segurança</strong></li>
                            <li>Clique em <strong>Senhas Específicas de Apps</strong></li>
                            <li>Gere uma nova senha (ex: <code>xxxx-xxxx-xxxx-xxxx</code>)</li>
                        </ol>
                    </div>
                </div>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="appleId">Apple ID (E-mail)</Label>
                        <Input
                            id="appleId"
                            type="email"
                            placeholder="seu-email@icloud.com"
                            value={appleId}
                            onChange={(e) => setAppleId(e.target.value)}
                            disabled={connecting}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Senha de Aplicativo</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={connecting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={connecting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConnect} disabled={connecting || !appleId || !password}>
                        {connecting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Conectando...
                            </>
                        ) : (
                            "Conectar Conta"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
