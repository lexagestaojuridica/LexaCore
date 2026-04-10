"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const data = [
    { name: "nov", receita: 15000, despesa: 4000 },
    { name: "dez", receita: 45000, despesa: 1000 },
    { name: "jan", receita: 25000, despesa: 28000 },
    { name: "fev", receita: 12000, despesa: 8000 },
    { name: "mar", receita: 42000, despesa: 6000 },
    { name: "abr", receita: 2000, despesa: 1000 },
];

export function FinancialChart() {
    return (
        <div className="bg-white rounded-[24px] border border-lexa-grey-200 p-8 w-full flex flex-col h-full shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                    Financeiro — Últimos 6 Meses
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
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorReceita)"
                        />
                        <Area
                            type="monotone"
                            dataKey="despesa"
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
