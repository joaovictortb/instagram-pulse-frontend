"use client";

import { useState, useEffect } from "react";
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
  Download,
} from "lucide-react";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { useUIStore } from "@/src/store/ui";
import { useAuth } from "@/src/components/AuthProvider";
import { useInstagramConnectionStore } from "@/src/store/instagramConnection";

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

type MeSessionInfo = {
  ok?: boolean;
  encryptionConfigured?: boolean;
  connectionCount?: number;
  tokenExpiresSoon?: boolean;
};

type MeConnectionsGet = {
  ok?: boolean;
  connections?: Array<{
    id: string;
    instagram_business_account_id: string;
    token_expires_at: string | null;
    updated_at: string;
  }>;
};

export default function InstagramConnectPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { dateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);

  const [token, setToken] = useState("");
  const [businessId, setBusinessId] = useState("");
  const activeConnectionId = useInstagramConnectionStore(
    (s) => s.activeConnectionId,
  );
  const setActiveConnectionId = useInstagramConnectionStore(
    (s) => s.setActiveConnectionId,
  );

  const {
    data: status,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["instagram-connection"],
    queryFn: async () => {
      const res = await apiFetch("/api/instagram/connection");
      return readJsonBody<ConnectionGet>(res);
    },
  });

  const { data: meInfo, isLoading: meInfoLoading } = useQuery({
    queryKey: ["me-session-info"],
    enabled: !!session,
    queryFn: async () => {
      const res = await apiFetch("/api/me/session-info");
      return readJsonBody<MeSessionInfo>(res);
    },
  });

  const { data: meConnections } = useQuery({
    queryKey: ["me-instagram-connections"],
    enabled: !!session,
    queryFn: async () => {
      const res = await apiFetch("/api/me/instagram-connections");
      return readJsonBody<MeConnectionsGet>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        metaAccessToken: token.trim(),
        instagramBusinessAccountId: businessId.trim(),
      };
      const path = session
        ? "/api/me/instagram-connections"
        : "/api/instagram/connection";
      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonBody<ConnectionPost>(res);
      if (!res.ok) throw new Error(data.error || "Falha ao guardar");
      return data;
    },
    onSuccess: () => {
      setToken("");
      void queryClient.invalidateQueries({ queryKey: ["me-session-info"] });
      void queryClient.invalidateQueries({
        queryKey: ["me-instagram-connections"],
      });
      void invalidateAll();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { from: fromStr, to: toStr };
      if (activeConnectionId) body.connectionId = activeConnectionId;
      const res = await apiFetch("/api/sync/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    await queryClient.invalidateQueries({ queryKey: ["me-session-info"] });
    await queryClient.invalidateQueries({
      queryKey: ["me-instagram-connections"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["api-me-integration-health"],
    });
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

  /** Com sessão, só permite guardar depois de saber que ENCRYPTION_KEY existe na API. */
  const encryptionReady =
    !session || (!meInfoLoading && meInfo?.encryptionConfigured === true);
  const needsEncryptionOnServer =
    !!session && !meInfoLoading && meInfo?.encryptionConfigured === false;

  return (
    <div className="mx-auto space-y-8">
      {session && meInfo?.tokenExpiresSoon && (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="status"
        >
          <p className="font-medium">Token Meta / Instagram a expirar</p>
          <p className="mt-1 text-rose-200/90">
            Pelo menos uma ligação tem{" "}
            <code className="text-xs">token_expires_at</code> nos próximos 7
            dias. Gera um token novo na Meta ou usa &quot;Ligar com Meta&quot;
            abaixo.
          </p>
        </div>
      )}

      {needsEncryptionOnServer && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          <p className="font-medium">Falta ENCRYPTION_KEY na API</p>
          <p className="mt-1 text-amber-200/90">
            No ficheiro <code className="text-xs">api/.env</code> (ou{" "}
            <code className="text-xs">.env</code> na raiz), define{" "}
            <code className="rounded bg-black/30 px-1">ENCRYPTION_KEY</code> com
            uma string longa (ex.:{" "}
            <code className="text-xs">
              node -e
              &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;
            </code>
            ) e reinicia o servidor da API. Sem isto não é possível guardar o
            token com sessão.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Instagram className="text-brand-primary" size={28} />
          Conexão Instagram
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Liga a Graph API da Meta com o token de acesso e o ID da conta
          Instagram Business.{" "}
          {session ? (
            <>
              Com sessão ativa, as credenciais são gravadas no Supabase (token
              encriptado na API com{" "}
              <code className="text-xs bg-zinc-800 px-1 rounded">
                ENCRYPTION_KEY
              </code>
              ).
            </>
          ) : (
            <>
              Sem sessão, os dados são gravados em{" "}
              <code className="text-xs bg-zinc-800 px-1 rounded">
                api/.instagram-runtime.json
              </code>{" "}
              (local) e aplicados de imediato.
            </>
          )}
        </p>
      </div>

      <div className="glass-card p-6 space-y-4 border border-dashboard-border/80">
        <p className="text-sm text-zinc-400">
          Precisas de um token com permissões de{" "}
          <code className="text-xs text-zinc-300">instagram_basic</code>,{" "}
          <code className="text-xs text-zinc-300">
            instagram_manage_insights
          </code>{" "}
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
            <Loader2 className="animate-spin" size={18} />A verificar…
          </div>
        ) : connected ? (
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="text-emerald-400 shrink-0 mt-0.5"
              size={22}
            />
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
              <AlertTriangle
                className="text-amber-400 shrink-0 mt-0.5"
                size={22}
              />
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

      {session && (meConnections?.connections?.length ?? 0) > 0 && (
        <div className="glass-card p-6 border border-dashboard-border/80 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            Conta ativa (Supabase)
          </h3>
          <p className="text-xs text-zinc-500">
            Com várias ligações, escolhe qual usar nos gráficos e no sync. O
            pedido envia o header{" "}
            <code className="text-[10px]">X-Instagram-Connection-Id</code>.
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs text-zinc-400">Instagram Business ID</span>
            <select
              value={activeConnectionId ?? ""}
              onChange={(e) =>
                setActiveConnectionId(e.target.value || null)
              }
              className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-1 ring-brand-primary"
            >
              {(meConnections?.connections ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.instagram_business_account_id}
                  {c.token_expires_at
                    ? ` · expira ${new Date(c.token_expires_at).toLocaleDateString()}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!encryptionReady}
            onClick={async () => {
              try {
                const res = await apiFetch("/api/me/meta-oauth/url");
                const data = await readJsonBody<{
                  ok?: boolean;
                  url?: string;
                  error?: string;
                }>(res);
                if (!res.ok || !data.url) {
                  throw new Error(
                    data.error || "Não foi possível obter URL OAuth",
                  );
                }
                window.location.href = data.url;
              } catch (e: unknown) {
                window.alert(
                  e instanceof Error ? e.message : "Erro ao iniciar OAuth Meta",
                );
              }
            }}
            className="inline-flex items-center gap-2 text-sm text-brand-primary hover:underline disabled:opacity-50"
          >
            Ligar com Meta (OAuth)
            <ExternalLink size={14} />
          </button>
        </div>
      )}

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
              saveMutation.isPending ||
              !token.trim() ||
              !businessId.trim() ||
              !encryptionReady
            }
            className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="inline animate-spin mr-2" size={16} />A
                validar…
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
          <button
            type="button"
            onClick={async () => {
              const path = `/api/metrics/kpis/export.csv?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`;
              const res = await apiFetch(path);
              if (!res.ok) {
                const t = await res.text();
                throw new Error(t || "Falha ao exportar CSV");
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `kpis-${fromStr}-${toStr}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold border border-dashboard-border"
          >
            <Download size={18} />
            Exportar CSV (KPIs)
          </button>
          <button
            type="button"
            onClick={async () => {
              const path = `/api/metrics/kpis/export.pdf?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`;
              const res = await apiFetch(path);
              if (!res.ok) {
                const t = await res.text();
                throw new Error(t || "Falha ao exportar PDF");
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `kpis-${fromStr}-${toStr}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold border border-dashboard-border"
          >
            <Download size={18} />
            Exportar PDF (KPIs)
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
