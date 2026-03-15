import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card";
import { Settings, Save, AlertTriangle, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/shared/ui/skeleton";

interface PlatformSetting {
    key: string;
    value: any;
    description: string;
}

export default function AdminSettings() {
    const queryClient = useQueryClient();

    const [settingsState, setSettingsState] = useState<{
        maintenance_mode: boolean;
        disable_new_signups: boolean;
        platform_notice: string;
    }>({
        maintenance_mode: false,
        disable_new_signups: false,
        platform_notice: ""
    });

    const { data: settingsData, isLoading } = useQuery({
        queryKey: ["admin-platform-settings"],
        queryFn: async () => {
            const { data, error } = await (supabase as any).from("platform_settings").select("*");
            if (error) throw error;
            return data as PlatformSetting[];
        },
    });

    useEffect(() => {
        if (settingsData) {
            const newState = { ...settingsState };
            settingsData.forEach((setting: PlatformSetting) => {
                if (setting.key === 'maintenance_mode') newState.maintenance_mode = setting.value;
                if (setting.key === 'disable_new_signups') newState.disable_new_signups = setting.value;
                if (setting.key === 'platform_notice') newState.platform_notice = setting.value;
            });
            setSettingsState(newState);
        }
    }, [settingsData]);

    const saveSettingsMutation = useMutation({
        mutationFn: async () => {
            const updates = [
                { key: 'maintenance_mode', value: settingsState.maintenance_mode, description: 'Bloqueio total da plataforma para manutenção' },
                { key: 'disable_new_signups', value: settingsState.disable_new_signups, description: 'Impede o registro de novas organizações' },
                { key: 'platform_notice', value: settingsState.platform_notice, description: 'Mensagem de aviso global no painel dos clientes' }
            ];
            const { error } = await (supabase as any).from('platform_settings').upsert(updates, { onConflict: 'key' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
            toast.success("Configurações globais salvas com sucesso!");
        },
        onError: (err: any) => {
            toast.error(`Falha ao salvar configurações: ${err.message}`);
        }
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-4xl">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-indigo-500" />
                    Configurações Globais
                </h2>
                <p className="text-zinc-400 text-sm">Variáveis e interruptores que afetam toda a plataforma e inquilinos em tempo real.</p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-4">
                    <CardTitle className="text-zinc-200 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-400" /> Web App Toggles
                    </CardTitle>
                    <CardDescription className="text-zinc-500">Alterações nestas chaves entram em vigor imediatamente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full bg-zinc-800" />
                            <Skeleton className="h-12 w-full bg-zinc-800" />
                            <Skeleton className="h-12 w-full bg-zinc-800" />
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-base text-zinc-200">Modo de Manutenção</Label>
                                    <p className="text-sm text-zinc-500">Desconecta usuários e exibe a tela de manutenção.</p>
                                </div>
                                <Switch checked={settingsState.maintenance_mode} onCheckedChange={(c) => setSettingsState({ ...settingsState, maintenance_mode: c })} className="data-[state=checked]:bg-rose-500" />
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-base text-zinc-200">Desativar Novos Cadastros</Label>
                                    <p className="text-sm text-zinc-500">Oculta formulários de registro e impede a criação de novas contas.</p>
                                </div>
                                <Switch checked={settingsState.disable_new_signups} onCheckedChange={(c) => setSettingsState({ ...settingsState, disable_new_signups: c })} className="data-[state=checked]:bg-amber-500" />
                            </div>
                            <div className="flex flex-col gap-3 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                <div className="space-y-1">
                                    <Label className="text-base text-zinc-200">Aviso Global no Header</Label>
                                    <p className="text-sm text-zinc-500">Exibe uma faixa de alerta no topo do Dashboard.</p>
                                </div>
                                <Input value={settingsState.platform_notice} onChange={(e) => setSettingsState({ ...settingsState, platform_notice: e.target.value })} placeholder="Ex: Sistema passará por instabilidade hoje às 22h..." className="bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500" />
                            </div>
                            {settingsState.maintenance_mode && (
                                <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <p className="text-sm"><strong>Cuidado!</strong> Ao salvar em Modo de Manutenção, qualquer usuário que não tenha Role de admin será bloqueado.</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
                <CardFooter className="bg-zinc-950/50 border-t border-zinc-800 pt-6 flex justify-end">
                    <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending || isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Save className="h-4 w-4" />
                        {saveSettingsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
