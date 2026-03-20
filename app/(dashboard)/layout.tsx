"use client";

import { useUIStore } from "@/src/store/ui";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, readJsonBody } from "@/src/lib/api";

type Health = {
  ok?: boolean;
  instagram?: {
    configured?: boolean;
    hasToken?: boolean;
    hasBusinessAccountId?: boolean;
  };
  supabase?: { configured?: boolean };
};

const routeTitles: Record<string, string> = {
  "/dashboard": "Painel",
  "/analytics": "Análise",
  "/content": "Conteúdo",
  "/comments": "Comentários",
  "/audience": "Público",
  "/growth-ai": "Crescimento IA",
  "/growth-plan": "Plano 7 dias",
  "/orchestrator": "Orquestrador",
  "/studio": "",
  "/reports": "Relatórios",
  "/instagram-connect": "Instagram",
  "/settings": "Configurações",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const headerTitle = routeTitles[pathname] ?? "Dashboard";
  const { isSidebarOpen } = useUIStore();

  const {
    data: health,
    isError: healthError,
    isFetching: healthLoading,
  } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await apiFetch("/api/health");
      return readJsonBody<Health>(res);
    },
    refetchInterval: 60_000,
    retry: 2,
  });

  const apiReachable = !healthError && health?.ok === true;
  const instagramReady = !!health?.instagram?.configured;
  const supabaseReady = !!health?.supabase?.configured;

  return (
    <div className="flex min-h-screen bg-dashboard-bg">
      <Sidebar />
      <motion.main
        initial={false}
        animate={{ marginLeft: isSidebarOpen ? 272 : 80 }}
        className="flex-1 transition-all duration-300"
      >
        <header className="h-16 border-b border-dashboard-border bg-dashboard-bg/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full text-xs font-medium text-zinc-300 max-w-[min(100vw-12rem,22rem)]"
              title={
                healthLoading
                  ? "Verificando API…"
                  : !apiReachable
                    ? "Não foi possível falar com a API (porta 3000 rodando? proxy / CORS?)."
                    : !instagramReady
                      ? "API ok, mas falta META_GRAPH_ACCESS_TOKEN ou META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID no .env da raiz."
                      : !supabaseReady
                        ? "Instagram configurado; configure Supabase para métricas históricas e rode Sincronizar no painel."
                        : "API, Instagram e Supabase configurados. Use Sincronizar para preencher gráficos."
              }
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${healthLoading ? "bg-amber-400 animate-pulse" : apiReachable ? "bg-emerald-500" : "bg-red-500"}`}
              />
              <span className="truncate">
                {healthLoading
                  ? "API…"
                  : !apiReachable
                    ? "API offline"
                    : !instagramReady
                      ? "Instagram .env"
                      : !supabaseReady
                        ? "Supabase .env"
                        : "API OK"}
              </span>
            </div>
            <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
              Generate Report
            </button>
          </div>
        </header>
        <div className="p-8">{children || <Outlet />}</div>
      </motion.main>
    </div>
  );
}
