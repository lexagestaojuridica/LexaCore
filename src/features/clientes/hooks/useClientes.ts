import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { asaasService } from "@/services/asaasService";
import type { Client, ClientDocumento } from "../types";

const PAGE_SIZE = 15;

export function useClientes() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    // ── Profile query (org_id) ──
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    // ── Clients (paginated) ──
    const { data: clientsData, isLoading } = useQuery({
        queryKey: ["clients", orgId, page, search],
        queryFn: async () => {
            let query = supabase.from("clients").select("*", { count: "exact" }).eq("organization_id", orgId!).order("created_at", { ascending: false });
            if (search) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document.ilike.%${search}%,company_name.ilike.%${search}%`);
            }
            const from = (page - 1) * PAGE_SIZE;
            query = query.range(from, from + PAGE_SIZE - 1);
            const { data, error, count } = await query;
            if (error) throw error;
            return { data: (data ?? []) as unknown as Client[], count: count ?? 0 };
        },
        enabled: !!orgId,
        placeholderData: keepPreviousData,
    });

    const clients = clientsData?.data || [];
    const totalCount = clientsData?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // ── Client Docs ──
    const useClientDocs = (clientId: string | undefined, enabled: boolean) =>
        useQuery({
            queryKey: ["client-docs", clientId],
            queryFn: async () => {
                const { data } = await supabase.from("documentos").select("id, file_name, file_path, file_type, created_at").eq("client_id", clientId!).order("created_at", { ascending: false });
                return (data || []) as ClientDocumento[];
            },
            enabled: !!clientId && enabled,
        });

    // ── Mutations ──
    const createMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const { error } = await supabase.from("clients").insert(payload as Database["public"]["Tables"]["clients"]["Insert"]);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente criado com sucesso"); },
        onError: (err: Error) => toast.error(`Erro ao criar cliente: ${err.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
            delete payload.organization_id;
            delete payload.created_at;
            const { error } = await supabase.from("clients").update(payload).eq("id", id).eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente atualizado com sucesso"); },
        onError: (err: Error) => toast.error(`Erro ao atualizar cliente: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("clients").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente excluído com sucesso"); },
        onError: (err: Error) => toast.error(`Erro ao excluir cliente: ${err.message}`),
    });

    const uploadDocMutation = useMutation({
        mutationFn: async ({ file, clientId }: { file: File; clientId: string }) => {
            const filePath = `${orgId}/${crypto.randomUUID()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file);
            if (uploadError) throw uploadError;
            const { error: dbError } = await supabase.from("documentos").insert({
                file_name: file.name, file_path: filePath, file_type: file.type || null,
                user_id: user!.id, organization_id: orgId!, client_id: clientId,
            });
            if (dbError) throw dbError;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-docs"] }); toast.success("Documento vinculado ao cliente"); },
        onError: () => toast.error("Erro ao enviar documento"),
    });

    const requestSignatureMutation = useMutation({
        mutationFn: async ({ doc, client }: { doc: ClientDocumento; client: Client }) => {
            const token = crypto.randomUUID();
            const { error } = await supabase.from("document_signatures").insert({
                document_id: doc.id, organization_id: orgId,
                signer_name: client.name, signer_email: client.email, signer_document: client.document,
                token, status: "pendente",
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
            if (error) throw error;
            return `${window.location.origin}/portal/assinatura/${token}`;
        },
        onSuccess: (link) => {
            if (link) { navigator.clipboard.writeText(link); toast.success("Link de assinatura copiado!"); }
        },
        onError: (err: Error) => toast.error(`Erro ao solicitar assinatura: ${err.message}`),
    });

    const syncAsaasMutation = useMutation({
        mutationFn: async (client: Client) => {
            if (!orgId) throw new Error("ID da organização não encontrado");
            const customerData = {
                name: client.name, email: client.email || "", phone: client.phone || "",
                cpfCnpj: client.document || "", externalReference: client.id,
                address: client.address_street || "", addressNumber: client.address_number || "",
                complement: client.address_complement || "", province: client.address_neighborhood || "",
                postalCode: client.address_zip || "",
            };
            let asaasId = client.asaas_customer_id;
            if (asaasId) {
                await asaasService.updateCustomer(orgId, asaasId, customerData);
            } else {
                const response = await asaasService.createCustomer(orgId, customerData);
                asaasId = response.id;
                const { error } = await supabase.from("clients").update({ asaas_customer_id: asaasId }).eq("id", client.id);
                if (error) throw error;
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Sincronizado com Asaas!"); },
        onError: (err: Error) => toast.error(`Erro ao sincronizar: ${err.message}`),
    });

    const generatePortalAuth = useMutation({
        mutationFn: async (client: Client) => {
            if (!client.email) throw new Error("O cliente precisa de um e-mail cadastrado.");
            if (!orgId) throw new Error("Organização não encontrada.");
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            // TODO: Add client_portal_tokens type to types.ts when migration is created
            const { error } = await (supabase as any).from("client_portal_tokens").insert({
                client_id: client.id, organization_id: orgId, token, expires_at: expiresAt,
            });
            if (error && !error.message.includes("does not exist")) throw error;
            const portalUrl = `${window.location.origin}/portal?token=${token}&email=${encodeURIComponent(client.email)}`;
            return { portalUrl, client };
        },
        onSuccess: ({ portalUrl, client }) => {
            navigator.clipboard.writeText(portalUrl).catch(() => { });
            toast.success(`Link do portal gerado para ${client.name}!`, { duration: 6000, description: "Compartilhe com o cliente para acesso ao portal." });
        },
        onError: (err: Error) => toast.error(`Erro ao gerar portal: ${err.message}`),
    });

    // ── Helpers ──
    const handleSearch = (v: string) => { setSearch(v); setPage(1); };

    const handleDocDownload = async (doc: ClientDocumento) => {
        const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    };

    // ── BI Counts (for StatCards) ──
    const { data: biCounts } = useQuery({
        queryKey: ["clients-bi", orgId],
        queryFn: async () => {
            const { count: total } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!);
            const { count: pf } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("client_type", "pessoa_fisica");
            const { count: pj } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("client_type", "pessoa_juridica");
            return { total: total || 0, pf: pf || 0, pj: pj || 0 };
        },
        enabled: !!orgId,
    });

    return {
        user, orgId, clients, totalCount, totalPages, page, setPage, search, isLoading,
        biCounts: biCounts || { total: 0, pf: 0, pj: 0 },
        handleSearch, handleDocDownload, useClientDocs,
        createMutation, updateMutation, deleteMutation, uploadDocMutation,
        requestSignatureMutation, syncAsaasMutation, generatePortalAuth,
        PAGE_SIZE,
    };
}
