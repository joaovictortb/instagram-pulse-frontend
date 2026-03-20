"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Eye,
  Target,
  MousePointer2,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Sparkles,
  TrendingUp,
  Loader2,
  RefreshCw,
  Database,
  ListChecks,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatNumber } from "@/src/lib/utils";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { useUIStore } from "@/src/store/ui";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";

type HealthPayload = {
  ok?: boolean;
  instagram?: { configured?: boolean };
  supabase?: { configured?: boolean };
  openai?: { configured?: boolean };
  sync?: {
    lastAccountUpdatedAt?: string | null;
    lastDailyInsightDate?: string | null;
  };
};

function formatHealthTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { dateRange, setDateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);

  const {
    data: account,
    isLoading: loadingAccount,
    error: accountError,
  } = useQuery({
    queryKey: ["instagram-account"],
    queryFn: async () => {
      const res = await apiFetch("/api/instagram/account");
      const data = await readJsonBody(res);
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error ||
            "Erro ao carregar conta Instagram",
        );
      return data;
    },
  });

  const { data: media, isLoading: loadingMedia } = useQuery({
    queryKey: ["instagram-media"],
    queryFn: async () => {
      const res = await apiFetch("/api/instagram/media");
      const data = await readJsonBody(res);
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error || "Erro ao carregar mídia",
        );
      return data;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await apiFetch("/api/health");
      return readJsonBody<HealthPayload>(res);
    },
    refetchInterval: 120_000,
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
      void queryClient.invalidateQueries({ queryKey: ["metrics-kpis"] });
      void queryClient.invalidateQueries({ queryKey: ["metrics-engagement"] });
      void queryClient.invalidateQueries({
        queryKey: ["metrics-content-by-type"],
      });
      void queryClient.invalidateQueries({ queryKey: ["metrics-followers"] });
      void queryClient.invalidateQueries({ queryKey: ["metrics-dow"] });
      void queryClient.invalidateQueries({ queryKey: ["instagram-account"] });
      void queryClient.invalidateQueries({ queryKey: ["instagram-media"] });
      void queryClient.invalidateQueries({
        queryKey: ["ai-executive-summary"],
      });
      void queryClient.invalidateQueries({ queryKey: ["api-health"] });
    },
  });

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ["metrics-kpis", fromStr, toStr],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/metrics/kpis?from=${fromStr}&to=${toStr}`,
      );
      return readJsonBody(res);
    },
  });

  const { data: engagement, isLoading: loadingEngagement } = useQuery({
    queryKey: ["metrics-engagement", fromStr, toStr],
    queryFn: async () =>
      readJsonBody(
        await apiFetch(`/api/metrics/engagement?from=${fromStr}&to=${toStr}`),
      ),
  });

  const { data: contentByType, isLoading: loadingContentByType } = useQuery({
    queryKey: ["metrics-content-by-type", fromStr, toStr],
    queryFn: async () =>
      readJsonBody(
        await apiFetch(
          `/api/metrics/content-by-type?from=${fromStr}&to=${toStr}`,
        ),
      ),
  });

  const { data: followersWeekly, isLoading: loadingFollowers } = useQuery({
    queryKey: ["metrics-followers", fromStr, toStr],
    queryFn: async () =>
      readJsonBody(
        await apiFetch(`/api/metrics/followers?from=${fromStr}&to=${toStr}`),
      ),
  });

  const { data: dowDays, isLoading: loadingDow } = useQuery({
    queryKey: ["metrics-dow", fromStr, toStr],
    queryFn: async () =>
      readJsonBody(
        await apiFetch(`/api/metrics/dow?from=${fromStr}&to=${toStr}`),
      ),
  });

  /** Só leitura no Supabase — não chama OpenAI no F5. */
  const { data: executiveSummary, isLoading: loadingExecutiveCache } = useQuery(
    {
      queryKey: ["ai-executive-summary", fromStr, toStr],
      queryFn: async () => {
        const res = await apiFetch(
          `/api/ai/executive-summary?from=${fromStr}&to=${toStr}`,
        );
        const j = await readJsonBody(res);
        if (!res.ok)
          throw new Error(
            (j as { error?: string })?.error || "Erro ao carregar resumo salvo",
          );
        return j as {
          ok: boolean;
          cached: boolean;
          result?: string;
          created_at?: string;
        };
      },
      staleTime: 5 * 60_000,
    },
  );

  const generateExecutiveMutation = useMutation({
    mutationFn: async () => {
      const mediaArr = Array.isArray(media) ? media : [];
      const res = await apiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "summary",
          from: fromStr,
          to: toStr,
          data: {
            account,
            kpis,
            engagement,
            performance: contentByType,
            media: mediaArr,
          },
        }),
      });
      const data = await readJsonBody(res);
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error || "Falha ao gerar resumo",
        );
      return data as { ok?: boolean; result?: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ai-executive-summary", fromStr, toStr],
      });
    },
  });

  const nextSteps = useMemo(() => {
    const steps: string[] = [];
    if (!health?.instagram?.configured) {
      steps.push(
        "Configure o token Meta e INSTAGRAM_BUSINESS_ACCOUNT_ID no .env da raiz.",
      );
    }
    if (!health?.supabase?.configured) {
      steps.push(
        "Configure SUPABASE_URL e chave (service role ou anon) para persistir dados.",
      );
    }
    if (health?.supabase?.configured && !health?.sync?.lastDailyInsightDate) {
      steps.push(
        "Use «Sincronizar Instagram → Supabase» para gravar insights diários.",
      );
    }
    if (!health?.openai?.configured) {
      steps.push(
        "Sem OPENAI_API_KEY os relatórios com IA não podem ser gerados.",
      );
    }
    const r = Number(kpis?.reach ?? 0);
    const imp = Number(kpis?.impressions ?? 0);
    if (
      health?.instagram?.configured &&
      health?.supabase?.configured &&
      health?.sync?.lastDailyInsightDate &&
      r === 0 &&
      imp === 0
    ) {
      steps.push(
        "Alcance e impressões zerados no período — amplie as datas ou rode o sync outra vez.",
      );
    }
    if (
      health?.openai?.configured &&
      !loadingExecutiveCache &&
      executiveSummary &&
      !executiveSummary.result
    ) {
      steps.push(
        "Gere o resumo executivo com IA no card «Resumo com IA» abaixo.",
      );
    }
    if (steps.length === 0) {
      steps.push(
        "Consulte Análise (CSV), Growth IA e Relatórios salvos para aprofundar.",
      );
    }
    return steps.slice(0, 6);
  }, [health, kpis, executiveSummary, loadingExecutiveCache]);

  if (
    loadingAccount ||
    loadingMedia ||
    loadingKpis ||
    loadingEngagement ||
    loadingContentByType
  ) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-zinc-800/50 animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  // Garantir arrays (API pode retornar { error } em caso de falha)
  const mediaList = Array.isArray(media) ? media : [];

  const contentByTypeList = Array.isArray(contentByType?.performance)
    ? contentByType.performance
    : [];

  // Format chart data (engagement per day)
  const chartData =
    engagement?.series?.map((item: any) => ({
      name: new Date(item.date).toLocaleDateString("pt-BR", {
        weekday: "short",
      }),
      engagement: item.engagement,
    })) || [];

  const followersChartData = Array.isArray(followersWeekly?.weekly)
    ? followersWeekly.weekly.map((w: any) => ({
        weekStart: w.weekStart,
        gain: w.followersGain,
      }))
    : [];

  const dowChartData = Array.isArray(dowDays?.days)
    ? dowDays.days.map((d: any) => ({
        dow: d.dow,
        engagement: d.engagement,
      }))
    : [];

  return (
    <div className="space-y-8">
      {accountError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong className="font-semibold">Instagram (Graph API):</strong>{" "}
          {accountError instanceof Error
            ? accountError.message
            : "Erro desconhecido"}
          . Confira token e{" "}
          <code className="text-xs bg-black/30 px-1 rounded">
            INSTAGRAM_BUSINESS_ACCOUNT_ID
          </code>{" "}
          no <code className="text-xs bg-black/30 px-1 rounded">.env</code> ou{" "}
          <Link
            to="/instagram-connect"
            className="font-semibold text-amber-50 underline underline-offset-2 hover:text-white"
          >
            ligue na página Instagram
          </Link>
          .
        </div>
      )}

      {/* Hero Section */}
      <div className="flex items-center justify-between p-8 glass-card bg-gradient-to-r from-brand-accent/10 via-transparent to-transparent">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand-accent via-brand-primary to-brand-secondary">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
              <img
                src={
                  account?.profile_picture_url ||
                  "https://picsum.photos/seed/insta/200"
                }
                alt={account?.username}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold">@{account?.username}</h2>
            <p className="text-zinc-400 mt-1">{account?.name}</p>
            <div className="flex gap-4 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold">
                  {formatNumber(account?.followers_count || 0)}
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Seguidores
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">
                  {formatNumber(account?.media_count || 0)}
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Posts
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">
                  {formatNumber(account?.follows_count || 0)}
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Seguindo
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden lg:block max-w-md">
          <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
            <div className="flex items-center gap-2 text-brand-primary mb-2">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Insight de IA
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed italic">
              {executiveSummary?.result
                ? executiveSummary.result.split("\n")[0].replace(/[*#]/g, "")
                : "Use «Gerar resumo com IA» no card abaixo — não geramos automaticamente (economiza OpenAI)."}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 glass-card">
        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              De
            </span>
            <input
              type="date"
              value={fromStr}
              onChange={(e) => {
                const nextFrom = new Date(e.target.value + "T00:00:00.000Z");
                const nextTo =
                  nextFrom.getTime() > dateRange.to.getTime()
                    ? nextFrom
                    : dateRange.to;
                setDateRange({ from: nextFrom, to: nextTo });
              }}
              className="bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-brand-primary"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Até
            </span>
            <input
              type="date"
              value={toStr}
              onChange={(e) => {
                const nextTo = new Date(e.target.value + "T00:00:00.000Z");
                const nextFrom =
                  nextTo.getTime() < dateRange.from.getTime()
                    ? nextTo
                    : dateRange.from;
                setDateRange({ from: nextFrom, to: nextTo });
              }}
              className="bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-brand-primary"
            />
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {syncMutation.isPending
              ? "Sincronizando…"
              : "Sincronizar Instagram → Supabase"}
          </button>
          <p className="text-xs text-zinc-500 text-right max-w-xs">
            KPIs e gráficos usam dados já salvos no Supabase. Clique em
            sincronizar após conectar o Meta.
          </p>
          {syncMutation.isError && (
            <p className="text-xs text-red-400 text-right max-w-xs">
              {syncMutation.error instanceof Error
                ? syncMutation.error.message
                : "Erro no sync"}
            </p>
          )}
          {syncMutation.isSuccess && syncMutation.data && (
            <p className="text-xs text-emerald-400 text-right max-w-xs">
              Sync ok — dias:{" "}
              {(syncMutation.data as { daily_rows?: number }).daily_rows ?? "—"}
              , mídias:{" "}
              {(syncMutation.data as { media_rows?: number }).media_rows ?? "—"}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 flex gap-4 border border-dashboard-border/80">
          <div className="p-2 h-fit rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
            <Database size={22} />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Dados no Supabase
            </p>
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">Conta atualizada:</span>{" "}
              {formatHealthTime(health?.sync?.lastAccountUpdatedAt)}
            </p>
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">Último dia de insights:</span>{" "}
              {health?.sync?.lastDailyInsightDate
                ? new Date(
                    `${health.sync.lastDailyInsightDate}T12:00:00`,
                  ).toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
        </div>
        <div className="glass-card p-5 flex gap-4 border border-dashboard-border/80">
          <div className="p-2 h-fit rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <ListChecks size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Próximos passos sugeridos
            </p>
            <ul className="text-sm text-zinc-300 space-y-1.5 list-disc pl-4">
              {nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Alcance Total"
          value={kpis?.reach || 0}
          icon={Target}
          description="Contas únicas alcançadas"
        />
        <MetricCard
          title="Impressões"
          value={kpis?.impressions || 0}
          icon={Eye}
          description="Visualizações totais no seu conteúdo"
        />
        <MetricCard
          title="Visitas ao Perfil"
          value={kpis?.profile_views || 0}
          icon={Users}
          description="Visitas ao seu perfil"
        />
        <MetricCard
          title="Cliques no Site"
          value={kpis?.website_clicks || 0}
          icon={MousePointer2}
          description="Cliques no link da sua bio"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Engajamento por Dia</h3>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorEngagement"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#E1306C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272A"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#71717A"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717A"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181B",
                    border: "1px solid #27272A",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#E1306C" }}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#E1306C"
                  fillOpacity={1}
                  fill="url(#colorEngagement)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Engajamento Médio por Tipo</h3>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={contentByTypeList}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272A"
                  vertical={false}
                />
                <XAxis
                  dataKey="type"
                  stroke="#71717A"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717A"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181B",
                    border: "1px solid #27272A",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#833AB4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Seguidores ganhos por semana</h3>
            <span className="text-xs text-zinc-500">
              {fromStr} - {toStr}
            </span>
          </div>

          {loadingFollowers ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-full h-full bg-zinc-800/50 rounded-xl animate-pulse" />
            </div>
          ) : followersChartData.length ? (
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={followersChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272A"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="weekStart"
                    stroke="#71717A"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717A"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="gain" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-center p-6 text-zinc-500">
              Sem dados no intervalo. Execute um sync em `/api/sync/instagram`.
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Dias com mais engajamento</h3>
            <span className="text-xs text-zinc-500">
              {fromStr} - {toStr}
            </span>
          </div>

          {loadingDow ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-full h-full bg-zinc-800/50 rounded-xl animate-pulse" />
            </div>
          ) : dowChartData.length ? (
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={dowChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272A"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dow"
                    stroke="#71717A"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717A"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="engagement"
                    fill="#E1306C"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-center p-6 text-zinc-500">
              Sem dados no intervalo. Execute um sync em `/api/sync/instagram`.
            </div>
          )}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Performance de Conteúdo Recente</h3>
          <button className="text-sm text-brand-primary font-medium hover:underline">
            Ver Todo o Conteúdo
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {mediaList.slice(0, 5).map((post: any) => (
            <motion.div
              key={post.id}
              whileHover={{ y: -5 }}
              className="glass-card group cursor-pointer"
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={post.thumbnail_url || post.media_url}
                  alt={post.caption}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center text-white">
                    <Heart size={20} fill="white" />
                    <span className="text-xs font-bold">
                      {formatNumber(post.like_count)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-white">
                    <MessageCircle size={20} fill="white" />
                    <span className="text-xs font-bold">
                      {formatNumber(post.comments_count)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {post.media_type.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {post.caption || "Sem legenda"}
                </p>
                <div className="mt-4 pt-4 border-t border-dashboard-border flex justify-between items-center">
                  <div className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp size={12} />
                    <span className="text-[10px] font-bold">
                      Melhor Performance
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500">
                    <Share2 size={14} />
                    <Bookmark size={14} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
