export interface Evento {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    category: string | null;
    organization_id: string;
    user_id: string;
    process_id: string | null;
    recurrence_rule: string | null;
}

export type ViewMode = "month" | "week" | "day" | "list";

export interface EventFormState {
    title: string;
    description: string;
    start_date: string;
    start_hour: string;
    end_hour: string;
    category: string;
    process_id: string | null;
    recurrence_rule: string;
}

export const emptyEventForm: EventFormState = {
    title: "",
    description: "",
    start_date: "",
    start_hour: "09:00",
    end_hour: "10:00",
    category: "compromisso",
    process_id: null,
    recurrence_rule: "none",
};
