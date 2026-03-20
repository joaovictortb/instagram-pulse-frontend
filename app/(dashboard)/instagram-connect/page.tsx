"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Instagram,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  KeyRound,
  Hash,
} from "lucide-react";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { useUIStore } from "@/src/store/ui";

type ConnectionGet = {
  ok?: boolean;
  configured?: boolean;
  accountId?: string;
  username?: string;
  name?: string;
  businessAccountId?: string | null;
  validationError?: string;
  hasCredentials?: boolean;
};

type ConnectionPost = {
  ok?: boolean;
  error?: string;
  accountId?: string;
  username?: string;
  name?: string;
};

export default function InstagramConnectPage() {
  const queryClient = useQueryClient();
  const { dateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);

  const [token, setToken] = useState("");
  const [businessId, setBusinessId] = useState("");

  const { data: status, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["instagram-connection"],
    queryFn: async () => {
      const res = await apiFetch("/api/instagram/connection");
      return readJsonBody<ConnectionGet>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/instagram/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaAccessToken: token.trim(),
          instagramBusinessAccountId: businessId.trim(),
        }),
      });
      const data = await readJsonBody<ConnectionPost>(res);
      if (!res.ok) throw new Error(data.error || "Falha ao guardar");
      return data;
    },
    onSuccess: () => {
      setToken("");
      void invalidateAll();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/sync/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromStr, to: toStr }),
      });
      const data = await readJsonBody(res);
      if (!res.ok)
        throw new Error((data as { error?: string })?.error || "Sync falhou");
      return data;
    },
    onSuccess: () => {
      void invalidateAll();
    },
  });

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ["instagram-connection"] });
    await queryClient.invalidateQueries({ queryKey: ["api-health"] });
    await queryClient.invalidateQueries({ queryKey: ["instagram-account"] });
    await queryClient.invalidateQueries({ queryKey: ["instagram-media"] });
    await queryClient.invalidateQueries({ queryKey: ["metrics-kpis"] });
    await queryClient.invalidateQueries({ queryKey: ["metrics-engagement"] });
    await queryClient.invalidateQueries({
      queryKey: ["metrics-content-by-type"],
    });
    await queryClient.invalidateQueries({ queryKey: ["metrics-followers"] });
    await queryClient.invalidateQueries({ queryKey: ["metrics-dow"] });
    await queryClient.invalidateQueries({ queryKey: ["ai-executive-summary"] });
  }

  const reloadMutation = useMutation({
    mutationFn: async () => {
      await refetch();
      await invalidateAll();
    },
  });

  const connected = status?.configured === true;
  const partialError =
    status?.hasCredentials && !status?.configured && status?.validationError;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Instagram className="text-brand-primary" size={28} />
          Conexão Instagram
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Liga a Graph API da Meta com o token de acesso e o ID da conta Instagram
          Business. Os dados são gravados em{" "}
          <code className="text-xs bg-zinc-800 px-1 rounded">
            api/.instagram-runtime.json
          </code>{" "}
          (local, não versionado no Git) e aplicados de imediato — não precisas de editar
          manualmente o <code className="text-xs bg-zinc-800 px-1 rounded">.env</code>{" "}
          para desenvolvimento local.
        </p>
      </div>

      <div className="glass-card p-6 space-y-4 border border-dashboard-border/80">
        <p className="text-sm text-zinc-400">
          Precisas de um token com permissões de{" "}
          <code className="text-xs text-zinc-300">instagram_basic</code>,{" "}
          <code className="text-xs text-zinc-300">instagram_manage_insights</code>{" "}
          (e páginas ligadas). O ID é o Instagram Business Account ID (número),
          não o @username.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/overview"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline"
          >
            Documentação Graph API
            <ExternalLink size={14} />
          </a>
          <a
            href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline"
          >
            Get started
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Estado atual */}
      <div className="glass-card p-6 border border-dashboard-border/80">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">
          Estado
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="animate-spin" size={18} />
            A verificar…
          </div>
        ) : connected ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={22} />
            <div>
              <p className="text-zinc-100 font-medium">
                Ligado como @{status?.username}
                {status?.name ? ` (${status.name})` : ""}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                ID: {status?.accountId ?? status?.businessAccountId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="text-zinc-300">
                  {partialError
                    ? "Credenciais presentes mas inválidas ou expiradas."
                    : "Ainda não há conexão válida com a Graph API."}
                </p>
                {partialError && (
                  <p className="text-xs text-amber-200/80 mt-2 font-mono">
                    {status?.validationError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulário */}
      <form
        className="glass-card p-6 space-y-5 border border-dashboard-border/80"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
          Credenciais Meta
        </h3>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
            <KeyRound size={14} />
            META_GRAPH_ACCESS_TOKEN (token de acesso)
          </span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token long-lived ou de sistema"
            className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-brand-primary font-mono"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
            <Hash size={14} />
            INSTAGRAM_BUSINESS_ACCOUNT_ID
          </span>
          <input
            type="text"
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="ex: 17841400008460056"
            className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-brand-primary font-mono"
          />
        </label>

        {saveMutation.isError && (
          <p className="text-sm text-red-400">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Erro ao guardar"}
          </p>
        )}
        {saveMutation.isSuccess && saveMutation.data?.username && (
          <p className="text-sm text-emerald-400">
            Conta validada: @{saveMutation.data.username}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={
              saveMutation.isPending || !token.trim() || !businessId.trim()
            }
            className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="inline animate-spin mr-2" size={16} />
                A validar…
              </>
            ) : (
              "Guardar e validar"
            )}
          </button>
        </div>
      </form>

      <div className="glass-card p-6 space-y-4 border border-dashboard-border/80">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
          Dados no painel
        </h3>
        <p className="text-sm text-zinc-400">
          Depois de conectar, sincroniza para o Supabase (KPIs e gráficos usam a
          base de dados). O intervalo de datas segue o seletor global do painel.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={syncMutation.isPending || !connected}
            onClick={() => syncMutation.mutate()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold border border-dashboard-border"
          >
            {syncMutation.isPending ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            Sincronizar Instagram → Supabase
          </button>
          <button
            type="button"
            disabled={reloadMutation.isPending || isFetching}
            onClick={() => reloadMutation.mutate()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold border border-dashboard-border"
          >
            {reloadMutation.isPending || isFetching ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            Recarregar dados
          </button>
        </div>
        {syncMutation.isError && (
          <p className="text-sm text-red-400">
            {syncMutation.error instanceof Error
              ? syncMutation.error.message
              : "Erro no sync"}
          </p>
        )}
        {syncMutation.isSuccess && syncMutation.data && (
          <p className="text-sm text-emerald-400">
            Sync ok — dias gravados:{" "}
            {(syncMutation.data as { daily_rows?: number }).daily_rows ?? "—"},
            mídias:{" "}
            {(syncMutation.data as { media_rows?: number }).media_rows ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}
