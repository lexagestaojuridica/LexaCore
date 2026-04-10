import { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { db as supabase } from "@/integrations/supabase/db"; // Only for Realtime now
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";

import { CrmContact, CrmLead, CrmDeal, CrmActivity } from "../types";
export type { CrmDeal };

// ── DB row mappers ─────────────────────────────────────
const mapContact = (r: {
    id: string; name: string; email?: string | null; phone?: string | null;
    type?: string | null; company?: string | null; city?: string | null;
    state?: string | null; tags?: string[] | null; score?: number | null;
    notes?: string | null; created_at?: string | null; source?: string | null;
}): CrmContact => ({
    id: r.id, name: r.name, email: r.email || "", phone: r.phone || "",
    type: (r.type as any) || "pessoa_fisica", company: r.company || "", city: r.city || "",
    state: r.state || "", tags: r.tags || [], score: r.score || 1,
    notes: r.notes || "", createdAt: r.created_at?.split("T")[0] || "", source: (r.source as any) || "manual",
});

const mapLead = (r: {
    id: string; name: string; contact_id?: string | null; contact_name?: string | null;
    value?: number | string | null; priority?: string | null; date?: string | null;
    notes?: string | null; stage_id?: string | null;
}): CrmLead => ({
    id: r.id, name: r.name, contactId: r.contact_id || "", contactName: r.contact_name || "",
    value: Number(r.value) || 0, priority: (r.priority as any) || "media", date: r.date || "",
    notes: r.notes || "", stageId: r.stage_id || "novo_lead",
});

const mapDeal = (r: {
    id: string; name: string; contact_id?: string | null; contact_name?: string | null;
    value?: number | string | null; probability?: number | null; stage?: string | null;
    due_date?: string | null; notes?: string | null; created_at?: string | null;
}): CrmDeal => ({
    id: r.id, name: r.name, contactId: r.contact_id || "", contactName: r.contact_name || "",
    value: Number(r.value) || 0, probability: r.probability || 50, stage: r.stage || "Qualificação",
    dueDate: r.due_date || "", notes: r.notes || "", createdAt: r.created_at?.split("T")[0] || "",
});

const mapActivity = (r: {
    id: string; type?: string | null; title: string; description?: string | null;
    contact_id?: string | null; contact_name?: string | null;
    date?: string | null; time?: string | null; completed?: boolean | null;
}): CrmActivity => ({
    id: r.id, type: (r.type as any) || "tarefa", title: r.title, description: r.description || "",
    contactId: r.contact_id || "", contactName: r.contact_name || "",
    date: r.date || "", time: r.time || "09:00", completed: r.completed || false,
});

// ── Context ────────────────────────────────────────────
interface CrmContextType {
    contacts: CrmContact[];
    leads: CrmLead[];
    deals: CrmDeal[];
    activities: CrmActivity[];
    isLoading: boolean;
    addContact: (contact: Omit<CrmContact, "id" | "createdAt">) => Promise<CrmContact>;
    updateContact: (id: string, data: Partial<CrmContact>) => void;
    deleteContact: (id: string) => void;
    addLead: (lead: Omit<CrmLead, "id" | "contactId">) => void;
    updateLead: (id: string, data: Partial<CrmLead>) => void;
    deleteLead: (id: string) => void;
    addDeal: (deal: Omit<CrmDeal, "id" | "contactId" | "createdAt">) => void;
    updateDeal: (id: string, data: Partial<CrmDeal>) => void;
    deleteDeal: (id: string) => void;
    addActivity: (activity: Omit<CrmActivity, "id" | "contactId">) => void;
    updateActivity: (id: string, data: Partial<CrmActivity>) => void;
    deleteActivity: (id: string) => void;
    findOrCreateContact: (name: string) => Promise<CrmContact>;
}

const CrmContext = createContext<CrmContextType | null>(null);

export const useCrm = () => {
    const ctx = useContext(CrmContext);
    if (!ctx) throw new Error("useCrm must be used within CrmProvider");
    return ctx;
};

// ── Provider ───────────────────────────────────────────
export function CrmProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const utils = trpc.useUtils();

    // ── Queries ──
    const contactsQuery = trpc.crm.listContacts.useQuery(undefined, { enabled: !!user });
    const leadsQuery = trpc.crm.listLeads.useQuery(undefined, { enabled: !!user });
    const dealsQuery = trpc.crm.listDeals.useQuery(undefined, { enabled: !!user });
    const activitiesQuery = trpc.crm.listActivities.useQuery(undefined, { enabled: !!user });

    const contacts = (contactsQuery.data || []).map(mapContact);
    const leads = (leadsQuery.data || []).map(mapLead);
    const deals = (dealsQuery.data || []).map(mapDeal);
    const activities = (activitiesQuery.data || []).map(mapActivity);

    const isLoading = contactsQuery.isLoading || leadsQuery.isLoading || dealsQuery.isLoading || activitiesQuery.isLoading;

    // ── Realtime Subscriptions (Keeping legacy sync for now) ──
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase.channel('crm_realtime_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
                utils.crm.listLeads.invalidate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, () => {
                utils.crm.listContacts.invalidate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals' }, () => {
                utils.crm.listDeals.invalidate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities' }, () => {
                utils.crm.listActivities.invalidate();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, utils]);

    // ── Mutations ──
    const findOrCreateMut = trpc.crm.findOrCreateContact.useMutation({
        onSuccess: () => utils.crm.listContacts.invalidate(),
    });

    const findOrCreateContact = async (name: string): Promise<CrmContact> => {
        const existing = contacts.find((c: CrmContact) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;
        const data = await findOrCreateMut.mutateAsync(name);
        return mapContact(data);
    };

    const contactUpsertMut = trpc.crm.upsertContact.useMutation({
        onSuccess: () => utils.crm.listContacts.invalidate(),
        onError: (e) => toast.error(e.message),
    });

    const contactDeleteMut = trpc.crm.deleteContact.useMutation({
        onSuccess: () => utils.crm.listContacts.invalidate(),
        onError: (e) => toast.error(e.message),
    });

    const addContact = async (data: Omit<CrmContact, "id" | "createdAt">): Promise<CrmContact> => {
        const res = await contactUpsertMut.mutateAsync({ data: data as any });
        return mapContact(res as any);
    };
    const updateContact = (id: string, data: Partial<CrmContact>) => contactUpsertMut.mutate({ id, data });
    const deleteContact = (id: string) => contactDeleteMut.mutate(id);

    // Lead
    const leadUpsertMut = trpc.crm.upsertLead.useMutation({
        onSuccess: () => {
            utils.crm.listLeads.invalidate();
            utils.crm.listContacts.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });
    const leadDeleteMut = trpc.crm.deleteLead.useMutation({
        onSuccess: () => utils.crm.listLeads.invalidate(),
    });

    const addLead = async (data: Omit<CrmLead, "id" | "contactId">) => {
        const contact = await findOrCreateContact(data.contactName);
        leadUpsertMut.mutate({ data: { ...data, contact_id: contact.id, contact_name: data.contactName, stage_id: data.stageId } });
    };
    const updateLead = async (id: string, data: Partial<CrmLead>) => {
        let payload = { ...data };
        if (data.contactName) {
            const c = await findOrCreateContact(data.contactName);
            payload = { ...payload, contactId: c.id } as any;
        }
        const dbData: Record<string, unknown> = {};
        if (data.name !== undefined) dbData.name = data.name;
        if (data.contactName !== undefined) dbData.contact_name = data.contactName;
        if (data.value !== undefined) dbData.value = data.value;
        if (data.priority !== undefined) dbData.priority = data.priority;
        if (data.date !== undefined) dbData.date = data.date;
        if (data.notes !== undefined) dbData.notes = data.notes;
        if (data.stageId !== undefined) dbData.stage_id = data.stageId;

        leadUpsertMut.mutate({ id, data: dbData });
    };
    const deleteLead = (id: string) => leadDeleteMut.mutate(id);

    // Deal
    const dealUpsertMut = trpc.crm.upsertDeal.useMutation({
        onSuccess: () => {
            utils.crm.listDeals.invalidate();
            utils.crm.listContacts.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });
    const dealDeleteMut = trpc.crm.deleteDeal.useMutation({
        onSuccess: () => utils.crm.listDeals.invalidate(),
    });

    const addDeal = async (data: Omit<CrmDeal, "id" | "contactId" | "createdAt">) => {
        const contact = await findOrCreateContact(data.contactName);
        dealUpsertMut.mutate({ data: { ...data, contact_id: contact.id, contact_name: data.contactName, due_date: data.dueDate } });
    };
    const updateDeal = async (id: string, data: Partial<CrmDeal>) => {
        const dbData: Record<string, unknown> = {};
        if (data.name !== undefined) dbData.name = data.name;
        if (data.contactName !== undefined) {
            const c = await findOrCreateContact(data.contactName);
            dbData.contact_id = c.id;
            dbData.contact_name = data.contactName;
        }
        if (data.value !== undefined) dbData.value = data.value;
        if (data.probability !== undefined) dbData.probability = data.probability;
        if (data.stage !== undefined) dbData.stage = data.stage;
        if (data.dueDate !== undefined) dbData.due_date = data.dueDate;
        if (data.notes !== undefined) dbData.notes = data.notes;

        dealUpsertMut.mutate({ id, data: dbData });
    };
    const deleteDeal = (id: string) => dealDeleteMut.mutate(id);

    // Activity
    const activityUpsertMut = trpc.crm.upsertActivity.useMutation({
        onSuccess: () => {
            utils.crm.listActivities.invalidate();
            utils.crm.listContacts.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });
    const activityDeleteMut = trpc.crm.deleteActivity.useMutation({
        onSuccess: () => utils.crm.listActivities.invalidate(),
    });

    const addActivity = async (data: Omit<CrmActivity, "id" | "contactId">) => {
        const contact = await findOrCreateContact(data.contactName);
        activityUpsertMut.mutate({ data: { ...data, contact_id: contact.id, contact_name: data.contactName } });
    };
    const updateActivity = (id: string, data: Partial<CrmActivity>) => activityUpsertMut.mutate({ id, data });
    const deleteActivity = (id: string) => activityDeleteMut.mutate(id);

    return (
        <CrmContext.Provider value={{
            contacts, leads, deals, activities, isLoading,
            addContact, updateContact, deleteContact,
            addLead, updateLead, deleteLead,
            addDeal, updateDeal, deleteDeal,
            addActivity, updateActivity, deleteActivity,
            findOrCreateContact,
        }}>
            {children}
        </CrmContext.Provider>
    );
}
