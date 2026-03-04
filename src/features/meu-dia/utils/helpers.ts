import { parseISO, isAfter, isBefore, differenceInMinutes } from "date-fns";
import type { Evento } from "../types";

// Re-export category config from agenda to avoid duplication
export { getCategoryConfig, CATEGORIES } from "@/features/agenda/utils/categories";

/** Currency formatter (BRL) */
export const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Check if an event is currently happening */
export function isHappeningNow(event: Evento): boolean {
    const now = new Date();
    return isAfter(now, parseISO(event.start_time)) && isBefore(now, parseISO(event.end_time));
}

/** Get a human-readable duration label (e.g., "1h30min") */
export function getDurationLabel(start: string, end: string): string {
    const mins = differenceInMinutes(parseISO(end), parseISO(start));
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
}
