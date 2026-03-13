import { useState, useEffect } from "react";
import { trpc } from "@/shared/lib/trpc";

export interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    type: "processo" | "cliente" | "wiki" | "documento";
    url: string;
}

export function useGlobalSearch(query: string) {
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 400);
        return () => clearTimeout(handler);
    }, [query]);

    const searchQuery = trpc.meuDia.globalSearch.useQuery(
        { query: debouncedQuery },
        {
            enabled: debouncedQuery.length >= 3,
        }
    );

    return {
        results: (searchQuery.data || []) as SearchResult[],
        isLoading: searchQuery.isLoading
    };
}
