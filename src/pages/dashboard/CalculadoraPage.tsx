import { useState } from "react";
import { Calculator, Scale, Briefcase, Landmark, Building2, Car, Users, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/* ------------------------------------------------------------------ */
/*  TRABALHISTA                                                        */
/* ------------------------------------------------------------------ */
function CalcTrabalhista() {
  const [salario, setSalario] = useState("");
  const [meses, setMeses] = useState("");
  const [tipo, setTipo] = useState("sem_justa_causa");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const s = Number(salario); const m = Number(meses);
    if (!s || !m) { toast.error("Preencha salário e tempo de serviço"); return; }
    const saldoSalario = s; // último mês proporcional simplificado
    const avioPrevio = tipo === "sem_justa_causa" ? s + (Math.min(Math.floor(m / 12), 20) * (s / 30) * 3) : 0;
    const ferias = s + s / 3;
    const feriasProporcionais = ((m % 12) / 12) * s + ((m % 12) / 12) * s / 3;
    const decimoTerceiro = ((m % 12) / 12) * s;
    const fgts = s * 0.08 * m;
    const multaFGTS = tipo === "sem_justa_causa" ? fgts * 0.4 : 0;
    setResult({ "Saldo de Salário": saldoSalario, "Aviso Prévio": avioPrevio, "Férias Vencidas + 1/3": ferias, "Férias Proporcionais + 1/3": feriasProporcionais, "13º Proporcional": decimoTerceiro, "FGTS Acumulado (est.)": fgts, "Multa 40% FGTS": multaFGTS, "TOTAL ESTIMADO": saldoSalario + avioPrevio + ferias + feriasProporcionais + decimoTerceiro + multaFGTS });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Salário Bruto" value={salario} onChange={setSalario} placeholder="R$ 0,00" type="number" />
        <Field label="Meses Trabalhados" value={meses} onChange={setMeses} placeholder="Ex: 24" type="number" />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Tipo de Rescisão</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sem_justa_causa">Sem Justa Causa</SelectItem>
              <SelectItem value="com_justa_causa">Com Justa Causa</SelectItem>
              <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CÍVEL - Correção Monetária e Juros                                  */
/* ------------------------------------------------------------------ */
function CalcCivel() {
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("1");
  const [meses, setMeses] = useState("");
  const [correcao, setCorrecao] = useState("0.5");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const v = Number(valor); const m = Number(meses); const t = Number(taxa); const c = Number(correcao);
    if (!v || !m) { toast.error("Preencha valor e período"); return; }
    const juros = v * (t / 100) * m;
    const correcaoVal = v * (c / 100) * m;
    setResult({ "Valor Original": v, "Juros de Mora": juros, "Correção Monetária": correcaoVal, "TOTAL ATUALIZADO": v + juros + correcaoVal });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Valor Original" value={valor} onChange={setValor} placeholder="R$ 0,00" type="number" />
        <Field label="Meses de Atraso" value={meses} onChange={setMeses} placeholder="Ex: 12" type="number" />
        <Field label="Juros de Mora (% a.m.)" value={taxa} onChange={setTaxa} placeholder="1" type="number" />
        <Field label="Correção Monet. (% a.m.)" value={correcao} onChange={setCorrecao} placeholder="0.5" type="number" />
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TRIBUTÁRIO                                                          */
/* ------------------------------------------------------------------ */
function CalcTributario() {
  const [valor, setValor] = useState("");
  const [aliquota, setAliquota] = useState("");
  const [meses, setMeses] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const v = Number(valor); const a = Number(aliquota); const m = Number(meses);
    if (!v || !a) { toast.error("Preencha valor e alíquota"); return; }
    const imposto = v * (a / 100);
    const multa = imposto * 0.20;
    const selic = m ? imposto * 0.0083 * m : 0; // aprox. Selic mensal
    setResult({ "Base de Cálculo": v, "Imposto Devido": imposto, "Multa (20%)": multa, "Juros SELIC (est.)": selic, "TOTAL COM ENCARGOS": imposto + multa + selic });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Base de Cálculo" value={valor} onChange={setValor} placeholder="R$ 0,00" type="number" />
        <Field label="Alíquota (%)" value={aliquota} onChange={setAliquota} placeholder="Ex: 15" type="number" />
        <Field label="Meses em Atraso" value={meses} onChange={setMeses} placeholder="Ex: 6" type="number" />
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PREVIDENCIÁRIO                                                     */
/* ------------------------------------------------------------------ */
function CalcPrevidenciario() {
  const [salarios, setSalarios] = useState("");
  const [contribuicoes, setContribuicoes] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const s = Number(salarios); const c = Number(contribuicoes);
    if (!s || !c) { toast.error("Preencha os campos"); return; }
    const media = s; // média simplificada
    const coeficiente = Math.min(0.6 + (c - 15) * 0.02, 1);
    const beneficio = media * coeficiente;
    const teto = 7786.02;
    setResult({ "Média Salarial": media, "Tempo de Contribuição (meses)": c, "Coeficiente": Number(coeficiente.toFixed(4)), "Benefício Estimado": Math.min(beneficio, teto), "Teto INSS (ref.)": teto });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Média Salarial (80% maiores)" value={salarios} onChange={setSalarios} placeholder="R$ 0,00" type="number" />
        <Field label="Meses de Contribuição" value={contribuicoes} onChange={setContribuicoes} placeholder="Ex: 180" type="number" />
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAMÍLIA / ALIMENTOS                                                 */
/* ------------------------------------------------------------------ */
function CalcFamilia() {
  const [renda, setRenda] = useState("");
  const [percentual, setPercentual] = useState("33");
  const [filhos, setFilhos] = useState("1");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const r = Number(renda); const p = Number(percentual); const f = Number(filhos);
    if (!r || !f) { toast.error("Preencha os campos"); return; }
    const total = r * (p / 100);
    const porFilho = total / f;
    setResult({ "Renda do Alimentante": r, "Percentual Aplicado": p, "Pensão Total": total, "Número de Filhos": f, "Valor por Filho": porFilho });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Renda Mensal do Alimentante" value={renda} onChange={setRenda} placeholder="R$ 0,00" type="number" />
        <Field label="Percentual (%)" value={percentual} onChange={setPercentual} placeholder="33" type="number" />
        <Field label="Nº de Filhos" value={filhos} onChange={setFilhos} placeholder="1" type="number" />
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IMOBILIÁRIO                                                        */
/* ------------------------------------------------------------------ */
function CalcImobiliario() {
  const [valor, setValor] = useState("");
  const [itbi, setItbi] = useState("3");
  const [registro, setRegistro] = useState("1");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const v = Number(valor);
    if (!v) { toast.error("Preencha o valor do imóvel"); return; }
    const itbiVal = v * (Number(itbi) / 100);
    const regVal = v * (Number(registro) / 100);
    setResult({ "Valor do Imóvel": v, "ITBI": itbiVal, "Registro": regVal, "TOTAL DE CUSTOS": itbiVal + regVal });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Valor do Imóvel" value={valor} onChange={setValor} placeholder="R$ 0,00" type="number" />
        <Field label="ITBI (%)" value={itbi} onChange={setItbi} placeholder="3" type="number" />
        <Field label="Registro (%)" value={registro} onChange={setRegistro} placeholder="1" type="number" />
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HONORÁRIOS                                                          */
/* ------------------------------------------------------------------ */
function CalcHonorarios() {
  const [causa, setCausa] = useState("");
  const [percentual, setPercentual] = useState("20");
  const [horas, setHoras] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const calcular = () => {
    const c = Number(causa); const p = Number(percentual); const h = Number(horas); const vh = Number(valorHora);
    const exitoHon = c ? c * (p / 100) : 0;
    const horasHon = h && vh ? h * vh : 0;
    if (!exitoHon && !horasHon) { toast.error("Preencha pelo menos um cenário"); return; }
    const r: Record<string, number> = {};
    if (exitoHon) { r["Valor da Causa"] = c; r["Honorários de Êxito (%)"] = p; r["Honorários de Êxito"] = exitoHon; }
    if (horasHon) { r["Horas Estimadas"] = h; r["Valor/Hora"] = vh; r["Honorários por Hora"] = horasHon; }
    r["TOTAL HONORÁRIOS"] = exitoHon + horasHon;
    setResult(r);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Calcule honorários por êxito e/ou por hora.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Valor da Causa" value={causa} onChange={setCausa} placeholder="R$ 0,00" type="number" />
        <Field label="Percentual de Êxito (%)" value={percentual} onChange={setPercentual} placeholder="20" type="number" />
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Horas Estimadas" value={horas} onChange={setHoras} placeholder="Ex: 40" type="number" />
        <Field label="Valor da Hora" value={valorHora} onChange={setValorHora} placeholder="R$ 0,00" type="number" />
      </div>
      <Button onClick={calcular} className="gap-2"><Calculator className="h-4 w-4" /> Calcular</Button>
      {result && <ResultTable data={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Componentes auxiliares                                              */
/* ------------------------------------------------------------------ */
function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </div>
  );
}

function ResultTable({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const lastKey = entries[entries.length - 1][0];
  return (
    <Card className="border-border bg-muted/30">
      <CardContent className="p-4 space-y-2">
        {entries.map(([label, value]) => {
          const isTotal = label === lastKey;
          return (
            <div key={label} className={`flex items-center justify-between text-sm ${isTotal ? "pt-2 border-t border-border font-bold text-foreground" : "text-muted-foreground"}`}>
              <span>{label}</span>
              <span className={isTotal ? "text-primary text-base" : "text-foreground font-medium"}>
                {label.includes("%") || label.includes("Nº") || label.includes("Coeficiente") || label.includes("Tempo") || label.includes("Horas") || label.includes("Filhos")
                  ? value.toLocaleString("pt-BR")
                  : formatCurrency(value)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  TABS CONFIG                                                         */
/* ------------------------------------------------------------------ */
const TABS = [
  { value: "trabalhista", label: "Trabalhista", icon: Briefcase, component: CalcTrabalhista },
  { value: "civel", label: "Cível", icon: Scale, component: CalcCivel },
  { value: "tributario", label: "Tributário", icon: Landmark, component: CalcTributario },
  { value: "previdenciario", label: "Previdenciário", icon: Users, component: CalcPrevidenciario },
  { value: "familia", label: "Família", icon: Users, component: CalcFamilia },
  { value: "imobiliario", label: "Imobiliário", icon: Building2, component: CalcImobiliario },
  { value: "honorarios", label: "Honorários", icon: DollarSign, component: CalcHonorarios },
];

/* ------------------------------------------------------------------ */
/*  PÁGINA PRINCIPAL                                                    */
/* ------------------------------------------------------------------ */
export default function CalculadoraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Calculadora Jurídica</h1>
        <p className="text-sm text-muted-foreground">Cálculos para todas as áreas do direito</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="trabalhista" className="w-full">
            <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value}>
                <t.component />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
