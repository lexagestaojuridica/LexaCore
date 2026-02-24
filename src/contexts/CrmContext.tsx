import { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Shared CRM Types ───────────────────────────────────
export interface CrmContact {
    id: string;
    name: string;
    email: string;
    phone: string;
    type: "pessoa_fisica" | "pessoa_juridica";
    company: string;
    city: string;
    state: string;
    tags: string[];
    score: number;
    notes: string;
    createdAt: string;
    source: "manual" | "lead" | "deal";
}

export interface CrmLead {
    id: string;
    name: string;
    contactId: string;
    contactName: string;
    value: number;
    priority: "alta" | "media" | "baixa";
    date: string;
    notes: string;
    stageId: string;
}

export interface CrmDeal {
    id: string;
    name: string;
    contactId: string;
    contactName: string;
    value: number;
    probability: number;
    stage: string;
    dueDate: string;
    notes: string;
    createdAt: string;
}

export interface CrmActivity {
    id: string;
    type: "ligacao" | "email" | "reuniao" | "tarefa";
    title: string;
    description: string;
    contactId: string;
    contactName: string;
    date: string;
    time: string;
    completed: boolean;
}

// ── DB row mappers ─────────────────────────────────────
const mapContact = (r: any): CrmContact => ({
    id: r.id, name: r.name, email: r.email || "", phone: r.phone || "",
    type: r.type || "pessoa_fisica", company: r.company || "", city: r.city || "",
    state: r.state || "", tags: r.tags || [], score: r.score || 1,
    notes: r.notes || "", createdAt: r.created_at?.split("T")[0] || "", source: r.source || "manual",
});

const mapLead = (r: any): CrmLead => ({
    id: r.id, name: r.name, contactId: r.contact_id || "", contactName: r.contact_name || "",
    value: Number(r.value) || 0, priority: r.priority || "media", date: r.date || "",
    notes: r.notes || "", stageId: r.stage_id || "novo_lead",
});

const mapDeal = (r: any): CrmDeal => ({
    id: r.id, name: r.name, contactId: r.contact_id || "", contactName: r.contact_name || "",
    value: Number(r.value) || 0, probability: r.probability || 50, stage: r.stage || "Qualificação",
    dueDate: r.due_date || "", notes: r.notes || "", createdAt: r.created_at?.split("T")[0] || "",
});

const mapActivity = (r: any): CrmActivity => ({
    id: r.id, type: r.type || "tarefa", title: r.title, description: r.description || "",
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
    addContact: (contact: Omit<CrmContact, "id" | "createdAt">) => CrmContact;
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
    findOrCreateContact: (name: string) => CrmContact;
}

const CrmContext = createContext<CrmContextType | null>(null);

export const useCrm = () => {
    const ctx = useContext(CrmContext);
    if (!ctx) throw new Error("useCrm must be used within CrmProvider");
    return ctx;
};

// ── Helper: get org_id ─────────────────────────────────
async function getOrgId(userId: string): Promise<string> {
    const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", userId).single();
    return data?.organization_id || "";
}

// ── Provider ───────────────────────────────────────────
export function CrmProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const qc = useQueryClient();
    const uid = user?.id || "";

    // ── Queries ──
    const { data: contacts = [], isLoading: loadingContacts } = useQuery({
        queryKey: ["crm_contacts"], enabled: !!uid,
        queryFn: async () => {
            const { data, error } = await supabase.from("crm_contacts").select("*").order("created_at", { ascending: false }).limit(300);
            if (error) throw error;
            return (data || []).map(mapContact);
        },
    });

    const { data: leads = [], isLoading: loadingLeads } = useQuery({
        queryKey: ["crm_leads"], enabled: !!uid,
        queryFn: async () => {
            const { data, error } = await supabase.from("crm_leads").select("*").order("created_at", { ascending: false }).limit(300);
            if (error) throw error;
            return (data || []).map(mapLead);
        },
    });

    const { data: deals = [], isLoading: loadingDeals } = useQuery({
        queryKey: ["crm_deals"], enabled: !!uid,
        queryFn: async () => {
            const { data, error } = await supabase.from("crm_deals").select("*").order("created_at", { ascending: false }).limit(300);
            if (error) throw error;
            return (data || []).map(mapDeal);
        },
    });

    const { data: activities = [], isLoading: loadingActivities } = useQuery({
        queryKey: ["crm_activities"], enabled: !!uid,
        queryFn: async () => {
            const { data, error } = await supabase.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(300);
            if (error) throw error;
            return (data || []).map(mapActivity);
        },
    });

    const isLoading = loadingContacts || loadingLeads || loadingDeals || loadingActivities;
    const invalidate = useCallback((keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })), [qc]);

    // ── Realtime Subscriptions ──
    useEffect(() => {
        if (!uid) return;
        const channel = supabase.channel('crm_realtime_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
                invalidate(["crm_leads"]);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, () => {
                invalidate(["crm_contacts"]);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals' }, () => {
                invalidate(["crm_deals"]);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities' }, () => {
                invalidate(["crm_activities"]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [uid, invalidate]);

    // ── findOrCreateContact ──
    const findOrCreateContact = useCallback((name: string): CrmContact => {
        const existing = contacts.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;
        // Optimistic: return a temp object. The DB insert happens async.
        const tempId = crypto.randomUUID();
        const temp: CrmContact = {
            id: tempId, name, email: "", phone: "", type: "pessoa_fisica",
            company: "", city: "", state: "", tags: ["Novo"], score: 1,
            notes: "", createdAt: new Date().toISOString().split("T")[0], source: "lead",
        };
        // Fire-and-forget insert
        (async () => {
            const orgId = await getOrgId(uid);
            if (!orgId) return;
            await supabase.from("crm_contacts").insert({
                id: tempId, name, organization_id: orgId, user_id: uid, source: "lead", tags: ["Novo"],
            });
            invalidate(["crm_contacts"]);
        })();
        return temp;
    }, [contacts, uid]);

    // ── Contact mutations ──
    const addContactMut = useMutation({
        mutationFn: async (data: Omit<CrmContact, "id" | "createdAt"> & { _tempId: string }) => {
            const orgId = await getOrgId(uid);
            const { error } = await supabase.from("crm_contacts").insert({
                id: data._tempId, organization_id: orgId, user_id: uid,
                name: data.name, email: data.email, phone: data.phone, type: data.type,
                company: data.company, city: data.city, state: data.state,
                tags: data.tags, score: data.score, notes: data.notes, source: data.source,
            });
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_contacts"]),
        onError: (e: any) => toast.error(e.message),
    });

    const addContact = useCallback((data: Omit<CrmContact, "id" | "createdAt">): CrmContact => {
        const id = crypto.randomUUID();
        addContactMut.mutate({ ...data, _tempId: id });
        return { ...data, id, createdAt: new Date().toISOString().split("T")[0] };
    }, []);

    const updateContactMut = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<CrmContact>) => {
            const payload: any = {};
            if (data.name !== undefined) payload.name = data.name;
            if (data.email !== undefined) payload.email = data.email;
            if (data.phone !== undefined) payload.phone = data.phone;
            if (data.type !== undefined) payload.type = data.type;
            if (data.company !== undefined) payload.company = data.company;
            if (data.city !== undefined) payload.city = data.city;
            if (data.state !== undefined) payload.state = data.state;
            if (data.tags !== undefined) payload.tags = data.tags;
            if (data.score !== undefined) payload.score = data.score;
            if (data.notes !== undefined) payload.notes = data.notes;
            const { error } = await supabase.from("crm_contacts").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_contacts"]),
        onError: (e: any) => toast.error(e.message),
    });
    const updateContact = useCallback((id: string, data: Partial<CrmContact>) => updateContactMut.mutate({ id, ...data }), []);

    const deleteContactMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_contacts"]),
        onError: (e: any) => toast.error(e.message),
    });
    const deleteContact = useCallback((id: string) => deleteContactMut.mutate(id), []);

    // ── Lead mutations ──
    const addLeadMut = useMutation({
        mutationFn: async (data: Omit<CrmLead, "id" | "contactId">) => {
            const orgId = await getOrgId(uid);
            const contact = findOrCreateContact(data.contactName);
            const { error } = await supabase.from("crm_leads").insert({
                organization_id: orgId, contact_id: contact.id, name: data.name,
                contact_name: data.contactName, value: data.value, priority: data.priority,
                date: data.date || null, notes: data.notes, stage_id: data.stageId,
            });
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_leads", "crm_contacts"]),
        onError: (e: any) => toast.error(e.message),
    });
    const addLead = useCallback((data: Omit<CrmLead, "id" | "contactId">) => addLeadMut.mutate(data), []);

    const updateLeadMut = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<CrmLead>) => {
            const payload: any = {};
            if (data.name !== undefined) payload.name = data.name;
            if (data.contactName !== undefined) {
                payload.contact_name = data.contactName;
                const c = findOrCreateContact(data.contactName);
                payload.contact_id = c.id;
            }
            if (data.value !== undefined) payload.value = data.value;
            if (data.priority !== undefined) payload.priority = data.priority;
            if (data.date !== undefined) payload.date = data.date;
            if (data.notes !== undefined) payload.notes = data.notes;
            if (data.stageId !== undefined) payload.stage_id = data.stageId;
            const { error } = await supabase.from("crm_leads").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_leads"]),
        onError: (e: any) => toast.error(e.message),
    });
    const updateLead = useCallback((id: string, data: Partial<CrmLead>) => updateLeadMut.mutate({ id, ...data }), []);

    const deleteLeadMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("crm_leads").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_leads"]),
        onError: (e: any) => toast.error(e.message),
    });
    const deleteLead = useCallback((id: string) => deleteLeadMut.mutate(id), []);

    // ── Deal mutations ──
    const addDealMut = useMutation({
        mutationFn: async (data: Omit<CrmDeal, "id" | "contactId" | "createdAt">) => {
            const orgId = await getOrgId(uid);
            const contact = findOrCreateContact(data.contactName);
            const { error } = await supabase.from("crm_deals").insert({
                organization_id: orgId, contact_id: contact.id, name: data.name,
                contact_name: data.contactName, value: data.value, probability: data.probability,
                stage: data.stage, due_date: data.dueDate || null, notes: data.notes,
            });
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_deals", "crm_contacts"]),
        onError: (e: any) => toast.error(e.message),
    });
    const addDeal = useCallback((data: Omit<CrmDeal, "id" | "contactId" | "createdAt">) => addDealMut.mutate(data), []);

    const updateDealMut = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<CrmDeal>) => {
            const payload: any = {};
            if (data.name !== undefined) payload.name = data.name;
            if (data.contactName !== undefined) {
                payload.contact_name = data.contactName;
                const c = findOrCreateContact(data.contactName);
                payload.contact_id = c.id;
            }
            if (data.value !== undefined) payload.value = data.value;
            if (data.probability !== undefined) payload.probability = data.probability;
            if (data.stage !== undefined) payload.stage = data.stage;
            if (data.dueDate !== undefined) payload.due_date = data.dueDate;
            if (data.notes !== undefined) payload.notes = data.notes;
            const { error } = await supabase.from("crm_deals").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_deals"]),
        onError: (e: any) => toast.error(e.message),
    });
    const updateDeal = useCallback((id: string, data: Partial<CrmDeal>) => updateDealMut.mutate({ id, ...data }), []);

    const deleteDealMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("crm_deals").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_deals"]),
        onError: (e: any) => toast.error(e.message),
    });
    const deleteDeal = useCallback((id: string) => deleteDealMut.mutate(id), []);

    // ── Activity mutations ──
    const addActivityMut = useMutation({
        mutationFn: async (data: Omit<CrmActivity, "id" | "contactId">) => {
            const orgId = await getOrgId(uid);
            const contact = findOrCreateContact(data.contactName);
            const { error } = await supabase.from("crm_activities").insert({
                organization_id: orgId, contact_id: contact.id, type: data.type,
                title: data.title, description: data.description, contact_name: data.contactName,
                date: data.date || null, time: data.time, completed: data.completed,
            });
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_activities", "crm_contacts"]),
        onError: (e: any) => toast.error(e.message),
    });
    const addActivity = useCallback((data: Omit<CrmActivity, "id" | "contactId">) => addActivityMut.mutate(data), []);

    const updateActivityMut = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<CrmActivity>) => {
            const payload: any = {};
            if (data.type !== undefined) payload.type = data.type;
            if (data.title !== undefined) payload.title = data.title;
            if (data.description !== undefined) payload.description = data.description;
            if (data.date !== undefined) payload.date = data.date;
            if (data.time !== undefined) payload.time = data.time;
            if (data.completed !== undefined) payload.completed = data.completed;
            const { error } = await supabase.from("crm_activities").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_activities"]),
        onError: (e: any) => toast.error(e.message),
    });
    const updateActivity = useCallback((id: string, data: Partial<CrmActivity>) => updateActivityMut.mutate({ id, ...data }), []);

    const deleteActivityMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("crm_activities").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => invalidate(["crm_activities"]),
        onError: (e: any) => toast.error(e.message),
    });
    const deleteActivity = useCallback((id: string) => deleteActivityMut.mutate(id), []);

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
