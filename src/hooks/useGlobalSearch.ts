import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    type: "processo" | "cliente" | "wiki" | "documento";
    url: string;
}

export function useGlobalSearch(query: string) {
    const { user } = useAuth();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Load org_id once
    useEffect(() => {
        if (!user?.id) return;
        supabase.from("profiles").select("organization_id").eq("user_id", user.id).single()
            .then(({ data }) => { if (data?.organization_id) setOrgId(data.organization_id); });
    }, [user?.id]);

    useEffect(() => {
        if (!query || query.length < 3 || !orgId) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const searchTerm = `%${query}%`;

                const [processosRes, clientesRes, wikiRes] = await Promise.all([
                    supabase
                        .from("processos_juridicos")
                        .select("id, title")
                        .eq("organization_id", orgId)
                        .ilike("title", searchTerm)
                        .limit(5),
                    supabase
                        .from("clients")
                        .select("id, name")
                        .eq("organization_id", orgId)
                        .ilike("name", searchTerm)
                        .limit(5),
                    supabase
                        .from("wiki_juridica")
                        .select("id, title, category")
                        .eq("organization_id", orgId)
                        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
                        .limit(5)
                ]);

                const combined: SearchResult[] = [];

                if (processosRes.data && !processosRes.error) {
                    combined.push(
                        ...processosRes.data.map((p) => ({
                            id: p.id,
                            title: p.title,
                            subtitle: "Processo Jurídico",
                            type: "processo" as const,
                            url: `/dashboard/processos?id=${p.id}`
                        }))
                    );
                }

                if (clientesRes.data && !clientesRes.error) {
                    combined.push(
                        ...clientesRes.data.map((c) => ({
                            id: c.id,
                            title: c.name,
                            subtitle: "Cliente",
                            type: "cliente" as const,
                            url: `/dashboard/clientes?id=${c.id}`
                        }))
                    );
                }

                if (wikiRes.data && !wikiRes.error) {
                    combined.push(
                        ...wikiRes.data.map((w) => ({
                            id: w.id,
                            title: w.title,
                            subtitle: `Categoria: ${w.category}`,
                            type: "wiki" as const,
                            url: `/dashboard/wiki?id=${w.id}`
                        }))
                    );
                }

                setResults(combined);
            } catch (error) {
                console.error("Erro na busca global:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 400); // 400ms debounce
        return () => clearTimeout(timeoutId);
    }, [query, orgId]);

    return { results, isLoading };
}
