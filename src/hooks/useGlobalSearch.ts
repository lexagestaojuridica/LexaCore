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

    useEffect(() => {
        if (!query || query.length < 3) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const searchTerm = `%${query}%`;

                // Exemplo simplificado de múltiplas chamadas, idealmente seria uma rpc (função no supabase) para alta escala.
                const [processosRes, clientesRes, wikiRes] = await Promise.all([
                    supabase
                        .from("processos_juridicos")
                        .select("id, title")
                        .ilike("title", searchTerm)
                        .limit(5),
                    supabase
                        .from("clients")
                        .select("id, name")
                        .ilike("name", searchTerm)
                        .limit(5),
                    supabase
                        .from("wiki_juridica")
                        .select("id, title, category")
                        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
                        .limit(5)
                ]);

                const combined: SearchResult[] = [];

                if (processosRes.data && !processosRes.error) {
                    combined.push(
                        ...(processosRes.data as any[]).map((p: any) => ({
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
                        ...(clientesRes.data as any[]).map((c: any) => ({
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
                        ...(wikiRes.data as any[]).map((w: any) => ({
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
    }, [query, user?.id]);

    return { results, isLoading };
}
