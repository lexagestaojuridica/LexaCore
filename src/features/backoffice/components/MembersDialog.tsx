import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Organization } from "../types";

interface MembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    org: Organization | null;
    onGenerateLink: (userId: string) => Promise<string | null>;
}

export function MembersDialog({ open, onOpenChange, org, onGenerateLink }: MembersDialogProps) {
    const [impersonationLink, setImpersonationLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async (userId: string) => {
        setIsGenerating(true);
        setImpersonationLink(null);
        const link = await onGenerateLink(userId);
        if (link) setImpersonationLink(link);
        setIsGenerating(false);
    };

    const copyToClipboard = () => {
        if (impersonationLink) {
            navigator.clipboard.writeText(impersonationLink);
            toast.success("Link copiado! Cole em uma aba anônima.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setImpersonationLink(null); }}>
            <DialogContent className="sm:max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        Equipe do Escritório: <span className="text-emerald-400">{org?.name}</span>
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Acesse as contas como administrador para fornecer suporte e depurar problemas relatados diretamente na sessão do cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {org?.profiles && org.profiles.length > 0 ? (
                        <div className="space-y-3">
                            {org.profiles.map((profile) => (
                                <div key={profile.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-zinc-200">{profile.full_name || "Usuário Sem Nome"}</span>
                                        <span className="text-xs text-zinc-500 font-mono">{profile.id}</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
                                        onClick={() => handleGenerate(profile.user_id)}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? "Gerando..." : "Logar Como"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg text-zinc-500 text-sm">
                            Nenhum membro registrado para este escritório.
                        </div>
                    )}

                    {impersonationLink && (
                        <div className="mt-6 space-y-3 border-t border-zinc-800 pt-4">
                            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-md text-sm border border-rose-500/20">
                                <Shield className="h-5 w-5 shrink-0" />
                                <p>
                                    <strong>Atenção:</strong> Abra o link em uma <b>janela anônima (Incógnito)</b> para não desconectar sua sessão atual de Administrador Master!
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={impersonationLink}
                                    className="bg-zinc-900 border-emerald-500/30 text-emerald-300 focus-visible:ring-emerald-500 font-mono text-xs"
                                />
                                <Button onClick={copyToClipboard} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0">
                                    <Copy className="h-4 w-4 mr-2" /> Copiar URL
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
