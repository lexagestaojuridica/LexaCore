import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useBilling } from "@/hooks/useBilling";
import type { Plan, Employee, OrgFormState, EmployeeFormState, CustomRole, GatewaySettings, CustomOption, TeamMember } from "../types";
import { emptyEmployee, emptyOrgForm, FALLBACK_PLANS } from "../types";

export function useConfiguracoes() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // ── Queries ──
    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile-full", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    const { data: org } = useQuery({
        queryKey: ["org", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("organizations").select("*").eq("id", orgId!).single();
            return data;
        },
        enabled: !!orgId,
    });

    const { data: userRole } = useQuery({
        queryKey: ["user-role", user?.id, orgId],
        queryFn: async () => {
            const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("organization_id", orgId!).single();
            return data;
        },
        enabled: !!user && !!orgId,
    });

    const { data: teamMembers = [] } = useQuery({
        queryKey: ["team-members", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("*, user_roles(role), custom_roles(name)").eq("organization_id", orgId!);
            return (data ?? []) as unknown as TeamMember[];
        },
        enabled: !!orgId,
    });

    const { data: customRoles = [] } = useQuery({
        queryKey: ["custom-roles", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("custom_roles").select("*").eq("organization_id", orgId!);
            return (data ?? []) as CustomRole[];
        },
        enabled: !!orgId,
    });

    const { data: dbPlans = [] } = useQuery({
        queryKey: ["subscription-plans"],
        queryFn: async () => {
            const { data } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
            return (data ?? []) as unknown as Plan[];
        },
    });
    const plans = dbPlans.length > 0 ? dbPlans : FALLBACK_PLANS;

    const { data: employees = [] } = useQuery({
        queryKey: ["employees", orgId],
        queryFn: async () => {
            const { data, error } = await supabase.from("rh_colaboradores").select("*").eq("organization_id", orgId!);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const { data: units = [] } = useQuery({
        queryKey: ["units", orgId],
        queryFn: async () => {
            const { data, error } = await supabase.from("units").select("*").eq("organization_id", orgId!);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const { data: customOptions = [] } = useQuery({
        queryKey: ["custom-options", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("custom_options").select("*").eq("organization_id", orgId!);
            return (data ?? []) as CustomOption[];
        },
        enabled: !!orgId,
    });

    const { data: gatewaySettings } = useQuery({
        queryKey: ["gateway-settings", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("gateway_settings").select("*").eq("organization_id", orgId!).eq("gateway_name", "asaas").maybeSingle();
            return data as GatewaySettings | null;
        },
        enabled: !!orgId,
    });

    const { subscription: orgSubscription, isLoading: loadingSub, createCheckout } = useBilling();

    // ── Form State ──
    const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
    const [orgForm, setOrgForm] = useState<OrgFormState>(emptyOrgForm);
    const [formInitialized, setFormInitialized] = useState(false);

    useEffect(() => {
        if (profile && org && !formInitialized) {
            setProfileForm({ full_name: profile.full_name || "", phone: profile.phone || "" });
            // TODO: Add whatsapp_instance_id, jusbrasil_token, escavador_token to organizations type
            const o = org as Record<string, unknown>;
            setOrgForm({
                whatsapp_instance_id: o.whatsapp_instance_id || "",
                whatsapp_token: o.whatsapp_token || "",
                whatsapp_enabled: o.whatsapp_enabled || false,
                asaas_api_key: "",
                asaas_environment: "sandbox",
                asaas_enabled: false,
                jusbrasil_token: o.jusbrasil_token || "",
                escavador_token: o.escavador_token || "",
            });
            setFormInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, org]);

    useEffect(() => {
        if (gatewaySettings && formInitialized && !orgForm.asaas_api_key && gatewaySettings.api_key) {
            setOrgForm(prev => ({
                ...prev,
                asaas_api_key: gatewaySettings.api_key,
                asaas_environment: gatewaySettings.environment || "sandbox",
                asaas_enabled: gatewaySettings.status === "active",
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gatewaySettings, formInitialized]);

    // ── Mutations ──
    const updateProfileMutation = useMutation({
        mutationFn: async (payload: { full_name: string; phone: string }) => {
            const { error } = await supabase.from("profiles").update(payload).eq("user_id", user!.id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile-full"] }); toast.success("Perfil atualizado"); },
        onError: () => toast.error("Erro ao atualizar perfil"),
    });

    const updateOrgMutation = useMutation({
        mutationFn: async (payload: { whatsapp_instance_id: string; whatsapp_token: string; whatsapp_enabled: boolean; jusbrasil_token?: string; escavador_token?: string }) => {
            // TODO: Add integration fields (whatsapp_instance_id, etc.) to organizations type
            const { error } = await supabase.from("organizations").update(payload as unknown as Record<string, unknown>).eq("id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["org"] }); toast.success("Configurações salvas"); },
        onError: () => toast.error("Erro ao atualizar as configurações"),
    });

    const uploadAvatarMutation = useMutation({
        mutationFn: async (file: File) => {
            const filePath = `avatars/${user!.id}-${Date.now()}.${file.name.split(".").pop()}`;
            const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);
            const { error: dbError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user!.id);
            if (dbError) throw dbError;
            return urlData.publicUrl;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile-full"] }); toast.success("Foto atualizada"); },
        onError: () => toast.error("Erro ao atualizar foto"),
    });

    const updateMemberRoleMutation = useMutation({
        mutationFn: async ({ userId, custom_role_id }: { userId: string; custom_role_id: string }) => {
            const { error } = await supabase.from("profiles").update({ custom_role_id }).eq("user_id", userId);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["team-members"] }); toast.success("Nível de acesso atualizado"); },
    });

    const createEmployeeMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const { error } = await supabase.from("rh_colaboradores").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Funcionário cadastrado!"); },
        onError: (err: Error) => toast.error(`Erro ao cadastrar funcionário: ${err.message}`),
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
            const { error } = await supabase.from("rh_colaboradores").update(payload).eq("id", id).eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Funcionário atualizado!"); },
        onError: (err: Error) => toast.error(`Erro ao atualizar funcionário: ${err.message}`),
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("rh_colaboradores").delete().eq("id", id).eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Funcionário removido"); },
        onError: (err: Error) => toast.error(`Erro ao remover funcionário: ${err.message}`),
    });

    const createOptionMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const { error } = await supabase.from("custom_options").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["custom-options"] }); toast.success("Opção criada!"); },
        onError: () => toast.error("Erro ao criar opção"),
    });

    const deleteOptionMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("custom_options").delete().eq("id", id).eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["custom-options"] }); toast.success("Opção removida"); },
    });

    const updateGatewayMutation = useMutation({
        mutationFn: async (payload: { asaas_api_key: string; asaas_environment: string; asaas_enabled: boolean }) => {
            const { data: existing } = await supabase.from("gateway_settings").select("id").eq("organization_id", orgId!).eq("gateway_name", "asaas").maybeSingle();

            if (existing) {
                const { error } = await supabase.from("gateway_settings").update({
                    api_key: payload.asaas_api_key, environment: payload.asaas_environment,
                    status: payload.asaas_enabled ? "active" : "inactive", updated_at: new Date().toISOString(),
                }).eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("gateway_settings").insert({
                    organization_id: orgId!, gateway_name: "asaas",
                    api_key: payload.asaas_api_key, environment: payload.asaas_environment,
                    status: payload.asaas_enabled ? "active" : "inactive",
                });
                if (error) throw error;
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gateway-settings"] }); toast.success("Configurações de gateway salvas!"); },
        onError: () => toast.error("Erro ao salvar configurações de gateway"),
    });

    // ── Billing ──
    const handleSubscribe = (planSlug: string) => {
        toast.promise(
            new Promise((resolve) => { createCheckout({ planId: planSlug }); resolve(true); }),
            { loading: "Iniciando checkout...", success: "Redirecionando...", error: "Erro ao iniciar pagamento" }
        );
    };

    // ── Integration save ──
    const handleSaveIntegration = () => {
        if (orgForm.asaas_api_key) {
            updateGatewayMutation.mutate({
                asaas_api_key: orgForm.asaas_api_key,
                asaas_environment: orgForm.asaas_environment,
                asaas_enabled: orgForm.asaas_enabled,
            });
        }
        updateOrgMutation.mutate({
            whatsapp_instance_id: orgForm.whatsapp_instance_id,
            whatsapp_token: orgForm.whatsapp_token,
            whatsapp_enabled: orgForm.whatsapp_enabled,
            jusbrasil_token: orgForm.jusbrasil_token || undefined,
            escavador_token: orgForm.escavador_token || undefined,
        });
    };

    return {
        user, profile, org, userRole, isLoading,
        teamMembers, customRoles, plans, employees, units, customOptions,
        orgSubscription, loadingSub,
        profileForm, setProfileForm, orgForm, setOrgForm,
        avatarInputRef,

        // Mutations
        updateProfileMutation, updateOrgMutation, uploadAvatarMutation,
        updateMemberRoleMutation,
        createEmployeeMutation, updateEmployeeMutation, deleteEmployeeMutation,
        createOptionMutation, deleteOptionMutation, updateGatewayMutation,

        // Handlers
        handleSubscribe, handleSaveIntegration,
    };
}
