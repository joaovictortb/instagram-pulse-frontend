"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Database,
  Globe,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  PlugZap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  apiFetch,
  apiFetchJson,
  getApiBaseUrl,
  readJsonBody,
} from "@/src/lib/api";

type Health = {
  ok?: boolean;
  instagram?: {
    configured?: boolean;
    hasToken?: boolean;
    hasBusinessAccountId?: boolean;
  };
  supabase?: {
    configured?: boolean;
    hasUrl?: boolean;
    hasServiceRoleOrAnonKey?: boolean;
  };
  openai?: { configured?: boolean };
  sync?: {
    lastAccountUpdatedAt?: string | null;
    lastDailyInsightDate?: string | null;
  };
};

function formatRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `há ${h} h`;
  return d.toLocaleString("pt-BR");
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const { data: account } = useQuery({
    queryKey: ["instagram-account"],
    queryFn: async () =>
      readJsonBody(await apiFetch("/api/instagram/account")),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const r = await apiFetch("/api/health");
      return readJsonBody<Health>(r);
    },
    refetchInterval: 60_000,
  });

  const openaiTestMutation = useMutation({
    mutationFn: async () => {
      const j = await apiFetchJson<{
        ok?: boolean;
        latencyMs?: number;
        error?: string;
      }>("/api/openai/test", { method: "POST" });
      if (!j.ok) throw new Error(j.error || "Falha ao testar OpenAI");
      return j;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/sync/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await readJsonBody<{
        error?: string;
        ok?: boolean;
      }>(r);
      if (!r.ok) throw new Error(j?.error || r.statusText);
      return j;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-health"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-account"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-media"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-comments"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });

  const instagramOk = !!health?.instagram?.configured;
  const supabaseOk = !!health?.supabase?.configured;
  const openaiOk = !!health?.openai?.configured;

  const igMissing: string[] = [];
  if (!health?.instagram?.hasToken) {
    igMissing.push("META_GRAPH_ACCESS_TOKEN (ou META_ACCESS_TOKEN)");
  }
  if (!health?.instagram?.hasBusinessAccountId) {
    igMissing.push("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  }

  const sbMissing: string[] = [];
  if (!health?.supabase?.hasUrl) sbMissing.push("SUPABASE_URL");
  if (!health?.supabase?.hasServiceRoleOrAnonKey) {
    sbMissing.push("SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Integrações reais (Meta, Supabase, OpenAI) e sincronização de dados.
        </p>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold">Integração Meta + Supabase</h3>
                <p className="text-xs text-zinc-500">
                  Status derivado de variáveis de ambiente e última gravação no banco
                </p>
              </div>
            </div>
            {healthLoading ? (
              <Loader2 className="animate-spin text-zinc-500" size={22} />
            ) : instagramOk && supabaseOk ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold">
                <CheckCircle2 size={14} />
                PRONTO PARA SYNC
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold">
                <AlertTriangle size={14} />
                CONFIG INCOMPLETA
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-zinc-900 border border-dashboard-border flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">Instagram (token + ID)</span>
              {healthLoading ? (
                <Loader2 size={14} className="animate-spin text-zinc-500" />
              ) : instagramOk ? (
                <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              ) : (
                <XCircle className="text-rose-400 shrink-0" size={18} />
              )}
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-dashboard-border flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">Supabase</span>
              {healthLoading ? (
                <Loader2 size={14} className="animate-spin text-zinc-500" />
              ) : supabaseOk ? (
                <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              ) : (
                <XCircle className="text-rose-400 shrink-0" size={18} />
              )}
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-dashboard-border flex flex-col gap-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-zinc-400">OpenAI (relatórios IA)</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={openaiTestMutation.isPending}
                    onClick={() => {
                      openaiTestMutation.reset();
                      openaiTestMutation.mutate();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                  >
                    {openaiTestMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <PlugZap size={12} />
                    )}
                    Testar conexão
                  </button>
                  {healthLoading ? (
                    <Loader2 size={14} className="animate-spin text-zinc-500" />
                  ) : openaiOk ? (
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                  ) : (
                    <XCircle className="text-amber-400 shrink-0" size={18} />
                  )}
                </div>
              </div>
              {openaiTestMutation.isSuccess && openaiTestMutation.data?.latencyMs != null && (
                <p className="text-[11px] text-emerald-500/90 pl-0.5">
                  Conexão OK — resposta em {openaiTestMutation.data.latencyMs} ms
                </p>
              )}
              {openaiTestMutation.isError && (
                <p className="text-[11px] text-rose-400 pl-0.5">
                  {(openaiTestMutation.error as Error).message}
                </p>
              )}
            </div>
          </div>

          {!healthLoading && (!instagramOk || !supabaseOk) && (
            <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 space-y-2">
              <p className="font-semibold text-amber-50">
                O servidor da API (porta 3000) não vê as mesmas variáveis que o Vite.
              </p>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                Coloca <code className="bg-black/30 px-1 rounded">Meta</code>,{" "}
                <code className="bg-black/30 px-1 rounded">Supabase</code> e{" "}
                <code className="bg-black/30 px-1 rounded">Instagram ID</code> no{" "}
                <code className="bg-black/30 px-1 rounded">.env</code> na{" "}
                <strong>raiz do projeto</strong> ou em{" "}
                <code className="bg-black/30 px-1 rounded">api/.env</code> — não
                só no <code className="bg-black/30 px-1 rounded">frontend/.env</code>
                . Depois reinicia <code className="bg-black/30 px-1 rounded">yarn api</code>
                .
              </p>
              {!instagramOk && igMissing.length > 0 && (
                <p className="text-xs">
                  <span className="text-zinc-400">Instagram:</span> falta{" "}
                  {igMissing.join(" e ")}.
                  {" "}
                  <Link
                    to="/instagram-connect"
                    className="text-brand-primary font-medium underline underline-offset-2"
                  >
                    Ligar pelo assistente
                  </Link>
                </p>
              )}
              {!supabaseOk && sbMissing.length > 0 && (
                <p className="text-xs">
                  <span className="text-zinc-400">Supabase:</span> falta{" "}
                  {sbMissing.join(" e ")}.
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  ID da Conta
                </p>
                <p className="text-sm font-mono">{account?.id || "---"}</p>
              </div>
              <div className="p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Nome de usuário
                </p>
                <p className="text-sm font-mono">@{account?.username || "---"}</p>
              </div>
            </div>
            <div className="p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Token de acesso (no servidor)
              </p>
              <p className="text-xs text-zinc-500 mb-2">
                Este bloco só indica que o valor não é mostrado no browser. O estado
                real é o ícone acima (verde = variável carregada na API).
              </p>
              <p className="text-sm font-mono text-zinc-600">
                {instagramOk ? "••••••••••••••••••••••••••••••••••••••••" : "— (não configurado na API)"}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-dashboard-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>
                Última atualização da conta no banco:{" "}
                <span className="text-zinc-300 font-medium">
                  {formatRelative(health?.sync?.lastAccountUpdatedAt)}
                </span>
              </p>
              <p>
                Último dia de insights diários:{" "}
                <span className="text-zinc-300 font-medium">
                  {health?.sync?.lastDailyInsightDate
                    ? new Date(
                        health.sync.lastDailyInsightDate + "T12:00:00"
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </span>
              </p>
              {syncMutation.isError && (
                <p className="text-rose-400">
                  {(syncMutation.error as Error).message}
                </p>
              )}
              {syncMutation.isSuccess && (
                <p className="text-emerald-500">Sincronização concluída.</p>
              )}
            </div>
            <button
              type="button"
              disabled={syncMutation.isPending || !instagramOk}
              onClick={() => syncMutation.mutate()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCcw
                size={16}
                className={syncMutation.isPending ? "animate-spin" : ""}
              />
              {syncMutation.isPending ? "Sincronizando…" : "Forçar sincronização"}
            </button>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold">IA e privacidade</h3>
              <p className="text-xs text-zinc-500">
                Relatórios só são gerados quando você clica em gerar; não há auto-disparo
                nesta versão.
              </p>
            </div>
          </div>
          <p className="text-sm text-zinc-400">
            Dados enviados à OpenAI são métricas agregadas e texto que você já vê no painel.
            Revise as políticas da Meta e da OpenAI no uso em produção.
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold">Cache local (navegador)</h3>
              <p className="text-xs text-zinc-500">
                React Query mantém cache em memória; limpar recarrega tudo da API.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              queryClient.clear();
              setCacheMsg("Cache do React Query limpo.");
              setTimeout(() => setCacheMsg(null), 4000);
            }}
            className="px-4 py-2 text-amber-500 hover:bg-amber-500/10 rounded-lg text-sm font-medium transition-colors"
          >
            Invalidar cache do painel
          </button>
          {cacheMsg && <p className="text-xs text-zinc-500 mt-2">{cacheMsg}</p>}
        </div>
      </div>
    </div>
  );
}
