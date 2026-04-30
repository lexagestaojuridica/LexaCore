"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";

const localeMap: Record<string, any> = {
    "pt-BR": ptBR,
    en: enUS,
    es: es,
};

export function FinancialChart() {
    const { t, i18n } = useTranslation();
    const currentLocale = localeMap[i18n.language] || ptBR;

    const data = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            months.push({
                name: format(date, "MMM", { locale: currentLocale }),
                receita: Math.floor(Math.random() * 40000) + 5000,
                despesa: Math.floor(Math.random() * 15000) + 1000,
            });
        }
        return months;
    }, [currentLocale]);

    return (
        <div className="bg-white rounded-[24px] border border-lexa-grey-200 p-8 w-full flex flex-col h-full shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                    {t("dashboard.financialLast6Months")}
                </h3>
            </div>

            <div className="flex-1 w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#94A3B8" }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#94A3B8" }}
                            tickCount={5}
                        />
                        <Tooltip
                            labelFormatter={(label) => `${label}`}
                            formatter={(value: any, name: string) => [
                                `R$ ${value.toLocaleString()}`,
                                name === "receita" ? t("dashboard.revenue") : t("dashboard.expense")
                            ]}
                            contentStyle={{
                                backgroundColor: "#FFF",
                                borderRadius: "12px",
                                border: "1px solid #E2E8F0",
                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="receita"
                            name="receita"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorReceita)"
                        />
                        <Area
                            type="monotone"
                            dataKey="despesa"
                            name="despesa"
                            stroke="#EF4444"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorDespesa)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
