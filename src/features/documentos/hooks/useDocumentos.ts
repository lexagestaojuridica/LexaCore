import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Documento } from "../types";

export function useDocumentos() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentFolder, setCurrentFolder] = useState<string>("/");

    // ── Queries ──
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });
    const orgId = profile?.organization_id;

    const { data: processos = [] } = useQuery({
        queryKey: ["processos-select", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("processos_juridicos").select("id, title, number").eq("organization_id", orgId!).order("title");
            return data || [];
        },
        enabled: !!orgId,
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes-select", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId!).order("name");
            return data || [];
        },
        enabled: !!orgId,
    });

    const { data: documentos = [], isLoading } = useQuery({
        queryKey: ["documentos", orgId],
        queryFn: async () => {
            const { data, error } = await supabase.from("documentos").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
            if (error) throw error;
            return data as Documento[];
        },
        enabled: !!orgId,
    });

    // ── Mutations ──
    const uploadMutation = useMutation({
        mutationFn: async ({ files, linkProcessId, linkClientId }: { files: File[]; linkProcessId: string; linkClientId: string }) => {
            let uploadedCount = 0;
            for (const file of files) {
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const filePath = `${orgId}/${crypto.randomUUID()}-${safeName}`;
                const { error: storageError } = await supabase.storage.from("documentos").upload(filePath, file);
                if (storageError) throw storageError;
                const { error: dbError } = await supabase.from("documentos").insert({
                    file_name: file.name, file_path: filePath,
                    file_type: file.type || file.name.split(".").pop() || "unknown",
                    size: file.size, folder_path: currentFolder,
                    user_id: user!.id, organization_id: orgId!,
                    process_id: linkProcessId === "none" ? null : linkProcessId,
                    client_id: linkClientId === "none" ? null : linkClientId,
                });
                if (dbError) throw dbError;
                uploadedCount++;
            }
            return uploadedCount;
        },
        onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: ["documentos"] }); toast.success(`${count} arquivo(s) enviado(s).`); },
        onError: (err: Error) => toast.error(`Erro no upload: ${err.message}`),
    });

    const requestSignatureMutation = useMutation({
        mutationFn: async ({ docId, clientId, signerName, signerEmail, signerDoc }: { docId: string; clientId: string | null; signerName: string; signerEmail: string; signerDoc: string }) => {
            if (!signerName || !signerEmail) throw new Error("Nome e E-mail são obrigatórios");
            const signingToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const { error } = await supabase.from("document_signatures").insert({
                organization_id: orgId, document_id: docId, client_id: clientId,
                signer_name: signerName, signer_email: signerEmail, signer_document: signerDoc,
                signing_token: signingToken, expires_at: expiresAt, status: "pendente",
            });
            if (error) throw error;
            return `${window.location.origin}/assinar?token=${signingToken}`;
        },
        onSuccess: (signingUrl) => {
            navigator.clipboard.writeText(signingUrl).catch(() => { });
            toast.success("Solicitação de assinatura criada!", { duration: 8000, description: "Link de assinatura copiado." });
        },
        onError: (err: Error) => toast.error(`Erro ao solicitar: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (doc: Documento) => {
            const { error: storageError } = await supabase.storage.from("documentos").remove([doc.file_path]);
            if (storageError) throw storageError;
            const { error: dbError } = await supabase.from("documentos").delete().eq("id", doc.id);
            if (dbError) throw dbError;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documentos"] }); toast.success("Documento excluído"); },
        onError: (err: Error) => toast.error(`Erro ao excluir: ${err.message}`),
    });

    // ── Actions ──
    const handleDownload = async (doc: Documento) => {
        toast.loading("Gerando link...", { id: "download" });
        const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
        if (error || !data?.signedUrl) { toast.error("Erro ao gerar link", { id: "download" }); return; }
        toast.dismiss("download");
        const link = document.createElement("a");
        link.href = data.signedUrl; link.download = doc.file_name;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const generateShareLink = async (doc: Documento) => {
        const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60 * 60 * 24 * 7);
        if (error || !data?.signedUrl) { toast.error("Erro ao criar link"); return; }
        navigator.clipboard.writeText(data.signedUrl);
        toast.success("Link copiado (Válido 7 dias)");
    };

    return {
        user, orgId, documentos, processos, clientes, isLoading,
        fileInputRef, currentFolder, setCurrentFolder,
        uploadMutation, requestSignatureMutation, deleteMutation,
        handleDownload, generateShareLink,
    };
}
