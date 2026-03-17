import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Client, ClientDocumento } from "../types";
import { trpc } from "@/shared/lib/trpc";

const PAGE_SIZE = 15;

export function useClientes() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const utils = trpc.useUtils();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const clientsQuery = trpc.cliente.list.useQuery({
        page,
        search,
        pageSize: PAGE_SIZE,
    });

    const biCountsQuery = trpc.cliente.getCounts.useQuery();

    const clients = (clientsQuery.data?.data || []) as Client[];
    const totalCount = clientsQuery.data?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // ── Client Docs ──
    const useClientDocs = (clientId: string | undefined, enabled: boolean) =>
        trpc.cliente.getDocs.useQuery(clientId as string, {
            enabled: !!clientId && enabled,
        });

    // ── Mutations ──
    const createMutation = trpc.cliente.create.useMutation({
        onSuccess: () => {
            utils.cliente.list.invalidate();
            toast.success("Cliente criado com sucesso");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(`Erro ao criar cliente: ${message}`);
        },
    });

    const updateMutation = trpc.cliente.update.useMutation({
        onSuccess: () => {
            utils.cliente.list.invalidate();
            toast.success("Cliente atualizado com sucesso");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(`Erro ao atualizar cliente: ${message}`);
        },
    });

    const deleteMutation = trpc.cliente.delete.useMutation({
        onSuccess: () => {
            utils.cliente.list.invalidate();
            toast.success("Cliente excluído com sucesso");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(`Erro ao excluir cliente: ${message}`);
        },
    });

    const uploadDocMutation = trpc.documento.create.useMutation({
        onSuccess: (_, variables) => {
            toast.success("Documento enviado com sucesso");
            if (variables.client_id) {
                utils.cliente.getDocs.invalidate(variables.client_id);
            }
        },
        onError: (error) => {
            console.error("Erro ao enviar documento:", error);
            toast.error("Erro ao enviar documento");
        },
    });

    const requestSignatureMutation = trpc.documento.requestSignature.useMutation({
        onSuccess: () => {
            toast.success("Solicitação de assinatura enviada");
        },
        onError: (error) => {
            console.error("Erro ao solicitar assinatura:", error);
            toast.error("Erro ao solicitar assinatura");
        },
    });

    const syncAsaasMutation = trpc.cliente.syncAsaas.useMutation({
        onSuccess: () => {
            toast.success("Sincronizado com Asaas!");
            utils.cliente.list.invalidate();
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(`Erro ao sincronizar: ${message}`);
        },
    });

    const generatePortalAuth = trpc.cliente.generatePortalAuth.useMutation({
        onSuccess: (data) => {
            const portalUrl = `${window.location.origin}/portal?token=${data.token}&email=${encodeURIComponent(data.email)}`;
            navigator.clipboard.writeText(portalUrl).catch(() => { });
            toast.success(`Link do portal gerado!`, {
                duration: 6000,
                description: "Link copiado para a área de transferência."
            });
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(`Erro ao gerar portal: ${message}`);
        },
    });

    // ── Helpers ──
    const handleSearch = (v: string) => { setSearch(v); setPage(1); };

    const handleDocDownload = async (doc: ClientDocumento) => {
        const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    };

    const handleUpload = async (file: File, clientId: string) => {
        try {
            const fileExt = file.name.split(".").pop();
            const filePath = `docs/${clientId}/${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("documentos")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            await uploadDocMutation.mutateAsync({
                file_name: file.name,
                file_path: filePath,
                file_type: file.type || null,
                client_id: clientId,
                size: file.size,
            });
        } catch (error: unknown) {
            console.error("Erro no upload:", error);
            throw error;
        }
    };

    return {
        user,
        clients,
        totalCount,
        totalPages,
        page,
        setPage,
        search,
        isLoading: clientsQuery.isLoading,
        biCounts: biCountsQuery.data || { total: 0, pf: 0, pj: 0 },
        handleSearch,
        handleDocDownload,
        useClientDocs,
        createMutation,
        updateMutation: {
            ...updateMutation,
            mutate: (payload: { id: string } & Partial<Client>) => {
                const { id, ...data } = payload;
                updateMutation.mutate({ id, data: data as any });
            }
        },
        deleteMutation,
        uploadDoc: handleUpload,
        requestSignature: (docId: string, clientId: string, signerData: { name: string; email: string; document?: string | null }) =>
            requestSignatureMutation.mutate({
                document_id: docId,
                client_id: clientId,
                signer_name: signerData.name,
                signer_email: signerData.email,
                signer_document: signerData.document || null,
            }),
        syncAsaas: (client: Client) => syncAsaasMutation.mutate(client.id),
        generatePortalAuth: {
            ...generatePortalAuth,
            mutate: (client: Client) => generatePortalAuth.mutate(client.id)
        },
        PAGE_SIZE,
    };
}
