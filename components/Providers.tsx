"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /** Evita refetch em cascata ao focar a aba (muitas queries no painel). */
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 2,
            retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 10_000),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
