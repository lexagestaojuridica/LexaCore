import { useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";

export function ProcessCalculator({ estimatedValue }: { estimatedValue: number | null }) {
    const [percentual, setPercentual] = useState("20");
    const [horas, setHoras] = useState("");
    const [valorHora, setValorHora] = useState("");
    const valor = Number(estimatedValue) || 0;
    const honorariosExito = valor * (Number(percentual) / 100);
    const honorariosHora = Number(horas) * Number(valorHora) || 0;

    const fmtCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    return (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Calculadora do Processo
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs text-muted-foreground">Valor da Causa</span>
                    <p className="font-medium">{valor ? fmtCurrency(valor) : "Não informado"}</p>
                </div>
                <div>
                    <span className="text-xs text-muted-foreground">Honorários (%)</span>
                    <Input type="number" value={percentual} onChange={(e) => setPercentual(e.target.value)} className="h-8 mt-1" />
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Horas estimadas</label>
                    <Input type="number" value={horas} onChange={(e) => setHoras(e.target.value)} className="h-8" placeholder="40" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Valor/hora</label>
                    <Input type="number" value={valorHora} onChange={(e) => setValorHora(e.target.value)} className="h-8" placeholder="R$ 250" />
                </div>
            </div>
            <div className="rounded-lg bg-primary/5 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Honorários Êxito</span>
                    <span className="font-medium">{fmtCurrency(honorariosExito)}</span>
                </div>
                {honorariosHora > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Honorários Hora</span>
                        <span className="font-medium">{fmtCurrency(honorariosHora)}</span>
                    </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span className="text-primary">{fmtCurrency(honorariosExito + honorariosHora)}</span>
                </div>
            </div>
        </div>
    );
}
