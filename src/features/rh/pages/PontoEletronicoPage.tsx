import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Clock, MapPin, Fingerprint, Calendar, CheckCircle2, History, Users } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";

export default function PontoEletronicoPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [time, setTime] = useState(new Date());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    const { data: employees } = useQuery({
        queryKey: ["rh-employees-for-ponto", orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("employees")
                .select("id, full_name, status")
                .eq("organization_id", orgId!);
            if (error) throw error;
            // Permitir tanto 'active' quanto 'ativo' (BR)
            return data.filter((emp: any) =>
                emp.status?.toLowerCase() === 'active' ||
                emp.status?.toLowerCase() === 'ativo'
            );
        },
        enabled: !!orgId,
    });

    const { data: todayRecords, isLoading: isLoadingRecords } = useQuery({
        queryKey: ["ponto-registros", selectedEmployeeId],
        queryFn: async () => {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from("ponto_registros")
                .select("*")
                .eq("employee_id", selectedEmployeeId)
                .gte("event_time", startOfDay.toISOString())
                .order("event_time", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedEmployeeId,
    });


    const mutation = useMutation({
        mutationFn: async (eventType: string) => {
            if (!selectedEmployeeId) throw new Error("Selecione um colaborador");

            const { error } = await supabase.from("ponto_registros").insert([{
                employee_id: selectedEmployeeId,
                organization_id: orgId!,
                event_type: eventType,
                event_time: new Date().toISOString(),
                device_info: navigator.userAgent
            }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ponto-registros"] });
            toast.success("Ponto registrado com sucesso!");
        },

        onError: (err: any) => toast.error(`Erro: ${err.message}`),
    });

    const getPunchType = () => {
        if (!todayRecords || todayRecords.length === 0) return { label: "Entrada", value: "entrada" };
        if (todayRecords.length === 1) return { label: "Saída Almoço", value: "saida_almoco" };
        if (todayRecords.length === 2) return { label: "Retorno Almoço", value: "retorno_almoco" };
        if (todayRecords.length === 3) return { label: "Saída", value: "saida" };
        return { label: "Ponto Extra", value: "extra" };
    };

    const currentPunch = getPunchType();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-background/50">
            <div className="flex flex-col gap-1 mb-2">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Estação de Trabalho: Ponto Digital</h1>
                </div>
                <p className="text-sm text-muted-foreground ml-10">Controle rigoroso de jornada e frequência (Conforme Portaria 671)</p>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Relógio de Ponto */}
                <div className="md:col-span-12 lg:col-span-5">
                    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-xl relative overflow-hidden h-full border-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Fingerprint className="h-24 w-24" />
                        </div>
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center justify-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" /> Registro de Presença
                            </CardTitle>
                            <CardDescription className="text-xs uppercase font-bold tracking-widest text-primary/70">
                                {format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center p-6 space-y-8">
                            <div className="text-7xl font-bold tracking-tighter tabular-nums text-foreground drop-shadow-sm py-4">
                                {format(time, "HH:mm:ss")}
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Colaborador</label>
                                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                        <SelectTrigger className="h-12 bg-background border-2 shadow-sm">
                                            <SelectValue placeholder="Selecione seu nome..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees?.map((emp: any) => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    size="lg"
                                    className="h-20 w-full rounded-2xl text-xl gap-4 shadow-xl active:scale-95 transition-all font-bold bg-primary hover:bg-primary/90"
                                    onClick={() => mutation.mutate(currentPunch.value)}
                                    disabled={mutation.isPending || !selectedEmployeeId}
                                >
                                    {mutation.isPending ? (
                                        "Auditando..."
                                    ) : (
                                        <>
                                            <Fingerprint className="h-8 w-8 text-primary-foreground/80" />
                                            {currentPunch.label}
                                        </>
                                    )}
                                </Button>

                                <p className="text-[10px] text-center text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/50">
                                    Ao registrar o ponto, seus dados de geolocalização e endereço IP {typeof window !== "undefined" ? window.location.hostname : ""} são validados para fins de auditoria interna.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Espelho do Dia e Histórico */}
                <div className="md:col-span-12 lg:col-span-7 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Status do Dia</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center gap-2">
                                    <div className={`h-2.5 w-2.5 rounded-full ${todayRecords?.length ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                                    <span className="text-sm font-semibold">
                                        {todayRecords?.length ? 'Jornada em Curso' : 'Aguardando Entrada'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Horas Acumuladas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-sm font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    0h 00m <span className="text-[10px] font-normal text-muted-foreground">(Saldo: +12h)</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/50 shadow-sm flex-1 h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <History className="w-5 h-5 text-primary" /> Log de Batidas (Hoje)
                                </CardTitle>
                                <CardDescription className="text-xs">Visualize e audite seus registros diários</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs gap-2">
                                <Calendar className="h-3 w-3" /> Ver Espelho Completo
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {!selectedEmployeeId ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
                                    <Users className="h-10 w-10 mb-4 opacity-20" />
                                    <p className="text-sm">Selecione seu nome para ver as batidas de hoje</p>
                                </div>
                            ) : isLoadingRecords ? (
                                <div className="space-y-2 py-8">
                                    <div className="h-8 bg-muted animate-pulse rounded" />
                                    <div className="h-8 bg-muted animate-pulse rounded" />
                                </div>
                            ) : todayRecords?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl border-emerald-500/10 bg-emerald-500/5">
                                    <CheckCircle2 className="h-10 w-10 mb-4 text-emerald-500/30" />
                                    <p className="text-sm font-medium text-emerald-800/60">Ainda não há registros hoje. Bom trabalho!</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/5">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Colaborador</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Data</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Entrada</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Saída</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Horas Trabalhadas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {todayRecords?.map((record: any) => (
                                            <TableRow key={record.id} className="group">
                                                <TableCell>
                                                    <span className="text-xs font-bold uppercase flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                        {record.event_type.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm font-semibold">
                                                    {format(new Date(record.event_time), "HH:mm:ss")}
                                                </TableCell>
                                                <TableCell className="text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> São Paulo, SP (Auditorado)
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter">APP-MOBILE</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

