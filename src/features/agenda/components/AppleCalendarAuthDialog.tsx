import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Loader2, ExternalLink, Info, ShieldCheck, Mail, Key } from "lucide-react";
import { useAppleCalendar } from "@/features/agenda/hooks/useAppleCalendar";
import { cn } from "@/shared/lib/utils";

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
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
                <DialogHeader className="p-6 pb-4 bg-muted/30">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-zinc-500/10">
                            <ShieldCheck className="h-5 w-5 text-zinc-600" />
                        </div>
                        <DialogTitle className="text-xl font-display font-semibold tracking-tight">
                            Conectar Apple ID
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground ml-11">
                        Autenticação segura via App-Specific Password da Apple.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="bg-blue-500/[0.03] border border-blue-500/10 p-4 rounded-2xl flex gap-3 text-sm">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1.5">
                            <p className="font-semibold text-blue-900">Configuração de Segurança</p>
                            <p className="text-xs text-blue-800/70 leading-relaxed">
                                A Apple exige uma <strong>Senha de App</strong> para apps de terceiros. Sua senha principal do ID Apple não funcionará aqui.
                            </p>
                            <a 
                                href="https://appleid.apple.com" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                            >
                                Gerar senha no site da Apple <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="appleId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Apple ID (E-mail)</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    id="appleId"
                                    type="email"
                                    placeholder="exemplo@icloud.com"
                                    className="pl-10 h-10 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all"
                                    value={appleId}
                                    onChange={(e) => setAppleId(e.target.value)}
                                    disabled={connecting}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Senha de Aplicativo</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="xxxx-xxxx-xxxx-xxxx"
                                    className="pl-10 h-10 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all font-mono"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={connecting}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground px-1">Geralmente no formato de 16 caracteres com hífens.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/10 border-t border-border/50">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={connecting} className="rounded-xl">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConnect} 
                        disabled={connecting || !appleId || !password}
                        className="rounded-xl px-6 gap-2 bg-zinc-900 hover:bg-zinc-800 text-white"
                    >
                        {connecting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Conectando...
                            </>
                        ) : (
                            "Conectar iCloud"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
