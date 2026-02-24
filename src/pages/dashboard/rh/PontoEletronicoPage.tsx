import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Fingerprint } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function PontoEletronicoPage() {
    const [time, setTime] = useState(new Date());
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleRegister = async () => {
        setIsRegistering(true);
        try {
            // Geoloc API integration mock
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log("Batido em:", position.coords.latitude, position.coords.longitude);
                        toast.success("Ponto registrado com sucesso!");
                        setIsRegistering(false);
                    },
                    (error) => {
                        console.error(error);
                        toast.error("Erro ao obter localização. Ponto não registrado.");
                        setIsRegistering(false);
                    }
                );
            } else {
                toast.error("Geolocalização não suportada pelo navegador.");
                setIsRegistering(false);
            }
        } catch (error) {
            toast.error("Erro no sistema de ponto.");
            setIsRegistering(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ponto Eletrônico</h1>
                <p className="text-sm text-muted-foreground">Registro de jornada de trabalho (Portaria 671 MTE)</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Relógio de Ponto */}
                <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-lg relative overflow-hidden">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-lg font-medium">Relógio Virtual</CardTitle>
                        <CardDescription>{format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-8">
                        <div className="text-6xl font-bold tracking-tighter tabular-nums text-foreground">
                            {format(time, "HH:mm:ss")}
                        </div>

                        <Button
                            size="lg"
                            className="h-16 w-full max-w-sm rounded-full text-lg gap-3 shadow-xl"
                            onClick={handleRegister}
                            disabled={isRegistering}
                        >
                            {isRegistering ? (
                                "Registrando..."
                            ) : (
                                <>
                                    <Fingerprint className="h-6 w-6" />
                                    Registrar Ponto
                                </>
                            )}
                        </Button>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                            <MapPin className="h-3 w-3" />
                            <span>Sua localização será gravada no registro</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Espelho do Dia */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-primary" /> Espelho do Dia
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Entrada</span>
                                    <span className="text-xl font-bold">--:--</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Saída Pausa</span>
                                    <span className="text-xl font-bold">--:--</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Retorno Pausa</span>
                                    <span className="text-xl font-bold">--:--</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Saída</span>
                                    <span className="text-xl font-bold">--:--</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
