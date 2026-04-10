"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const data = [
    { name: "Civel", value: 2, color: "#2563EB" },
    { name: "Trabalhista", value: 1, color: "#10B981" },
    { name: "Consumidor", value: 1, color: "#F59E0B" },
    { name: "Tributário", value: 2, color: "#7C3AED" },
    { name: "Família", value: 1, color: "#EF4444" },
];

export function ProcessDistributionChart() {
    return (
        <div className="bg-white rounded-[24px] border border-lexa-grey-200 p-8 w-full flex flex-col h-full shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-8">
                Processos por Área
            </h3>

            <div className="flex-1 w-full min-h-[240px] flex flex-col items-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value, entry: any) => (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                    {value} ({entry.payload.value})
                                </span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
