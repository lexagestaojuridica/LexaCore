// ─── Backoffice Types ────────────────────────────────────

export interface Organization {
    id: string;
    name: string;
    created_at: string;
    whatsapp_enabled: boolean;
    escavador_token: string | null;
    jusbrasil_token: string | null;
    profiles?: OrgProfile[];
    subscriptions?: OrgSubscription[];
}

export interface OrgProfile {
    id: string;
    full_name: string | null;
    user_id: string;
}

export interface OrgSubscription {
    status: string;
    plan: SubscriptionPlanRef | null;
}

export interface SubscriptionPlanRef {
    id: string;
    name: string;
    slug: string;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    max_users: number;
    max_processes: number;
    features: string[];
    is_active: boolean;
    sort_order: number;
}

export interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_id: string;
    organization_id: string;
    metadata: Record<string, unknown>;
    created_at: string;
    profiles?: { full_name: string | null };
    organizations?: { name: string };
}

export interface SupportTicket {
    id: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    user_id: string;
    organization_id: string;
    created_at: string;
    profiles?: { full_name: string | null };
    organizations?: { name: string };
}

export interface PlatformSetting {
    key: string;
    value: unknown;
    description: string;
}
