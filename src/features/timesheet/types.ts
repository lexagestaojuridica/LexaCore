export interface TimesheetEntry {
    id: string;
    organization_id: string;
    user_id: string;
    process_id: string | null;
    description: string | null;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    hourly_rate: number | null;
    billing_status: string;
    created_at: string;
}

export interface TimerLog {
    id: string;
    timesheet_entry_id: string;
    action: string;
    logged_at: string;
    notes: string | null;
}

export interface ProcessoTimesheet {
    id: string;
    title: string;
    number: string | null;
    client_id: string | null;
    clients?: { id: string; name: string; asaas_customer_id: string | null; };
}
