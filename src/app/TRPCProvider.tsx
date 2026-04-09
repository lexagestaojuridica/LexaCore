"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import superjson from "superjson";
import { trpc } from "@/shared/lib/trpc";

/**
 * Provedor que encapsula o tRPC e o TanStack Query.
 */
export function TRPCProvider(props: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        gcTime: 10 * 60 * 1000,   // 10 minutes
                    },
                },
            })
    );
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: "/api/trpc",
                    transformer: superjson,
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {props.children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}
