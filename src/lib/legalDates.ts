import { addDays, isWeekend, isBefore, isSameDay, startOfDay } from "date-fns";

/**
 * Módulo Jurídico: Cálculo de Prazos (CPC/2015)
 * Regra: Contagem em dias úteis, exclui o dia do começo e inclui o dia do vencimento.
 */

// Placeholder para feriados (deve ser expandido ou vir de uma API/BD)
const NATIONAL_HOLIDAYS = [
    "2026-01-01", // Ano Novo
    "2026-04-21", // Tiradentes
    "2026-05-01", // Trabalho
    "2026-09-07", // Independência
    "2026-10-12", // Padroeira
    "2026-11-02", // Finados
    "2026-11-15", // Proclamação
    "2026-12-25", // Natal
    // Recesso Forense (20/12 a 20/01) - CPC Art. 220
];

export function isBusinessDay(date: Date): boolean {
    if (isWeekend(date)) return false;

    const dateStr = date.toISOString().split('T')[0];
    if (NATIONAL_HOLIDAYS.includes(dateStr)) return false;

    // Recesso Forense CPC Art. 220 (20/12 a 20/01)
    const month = date.getMonth();
    const day = date.getDate();
    if ((month === 11 && day >= 20) || (month === 0 && day <= 20)) {
        return false;
    }

    return true;
}

/**
 * Calcula a data final com base em dias úteis (CPC)
 */
export function calculateDeadline(startDate: Date, days: number): Date {
    let currentDate = startOfDay(startDate);
    let daysAdded = 0;

    // CPC: Exclui o dia do começo. Começa a contar no próximo dia útil.
    while (daysAdded < days) {
        currentDate = addDays(currentDate, 1);
        if (isBusinessDay(currentDate)) {
            daysAdded++;
        }
    }

    return currentDate;
}

export function isOverdue(deadline: Date): boolean {
    const today = startOfDay(new Date());
    return isBefore(deadline, today) && !isSameDay(deadline, today);
}
