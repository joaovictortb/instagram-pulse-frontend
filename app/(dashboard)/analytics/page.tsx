"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatNumber, getEngagementRate } from "@/src/lib/utils";
import { Eye, PlayCircle, Loader2 } from "lucide-react";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { useUIStore } from "@/src/store/ui";
import { useMemo, useState } from "react";

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

function postDayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const { dateRange, setDateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);
  const [postSearch, setPostSearch] = useState("");

  const { data: account } = useQuery({
    queryKey: ["instagram-account"],
    queryFn: async () =>
      readJsonBody(await apiFetch("/api/instagram/account")),
  });

  const { data: media, isLoading } = useQuery({
    queryKey: ["instagram-media"],
    queryFn: async () =>
      readJsonBody(await apiFetch("/api/instagram/media")),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/sync/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromStr, to: toStr }),
      });
      const j = await readJsonBody<{ error?: string; ok?: boolean }>(r);
      if (!r.ok) throw new Error(j?.error || r.statusText);
      return j;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-media"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-account"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      queryClient.invalidateQueries({ queryKey: ["api-health"] });
    },
  });

  const filtered = useMemo(() => {
    const list = (media || []) as any[];
    const q = postSearch.trim().toLowerCase();
    return list.filter((post) => {
      const day = postDayKey(post.timestamp);
      if (day < fromStr || day > toStr) return false;
      if (!q) return true;
      const cap = (post.caption || "").toLowerCase();
      const id = String(post.id || "");
      const type = String(post.media_type || "").toLowerCase();
      return cap.includes(q) || id.includes(q) || type.includes(q);
    });
  }, [media, postSearch, fromStr, toStr]);

  const exportCsv = () => {
    const rows = filtered.map((post: any) => ({
      id: post.id,
      timestamp: post.timestamp,
      media_type: post.media_type,
      like_count: post.like_count ?? 0,
      comments_count: post.comments_count ?? 0,
      reach: post.insights?.reach ?? "",
      permalink: post.permalink || "",
    }));
    const csv = toCsv(rows);
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `instagram-media_${fromStr}_${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Análise avançada</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Mesmo intervalo de datas do painel (store global). Filtra publicações por dia,
            exporta CSV e sincroniza esse período para o Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filtered?.length}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {syncMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            Atualizar dados
          </button>
        </div>
      </div>

      {syncMutation.isError && (
        <p className="text-sm text-rose-400">
          {(syncMutation.error as Error).message}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 glass-card">
        <div className="flex items-end gap-4 flex-wrap">
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
        <p className="text-xs text-zinc-500 sm:ml-auto sm:text-right max-w-md pb-1">
          Alterar aqui atualiza também Painel, Growth IA e Orquestrador.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-dashboard-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/50">
          <h3 className="font-bold">Matriz de performance de conteúdo</h3>
          <input
            type="text"
            value={postSearch}
            onChange={(e) => setPostSearch(e.target.value)}
            placeholder="Buscar por legenda, tipo ou ID…"
            className="bg-zinc-800 border-none rounded-lg px-4 py-2 text-sm outline-none w-full sm:w-72 focus:ring-1 ring-brand-primary"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/30 border-b border-dashboard-border">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Mídia
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Data
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Tipo
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                  Curtidas
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                  Comentários
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                  Alcance
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                  Engajamento
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashboard-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="w-24 h-4 bg-zinc-800 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="w-16 h-4 bg-zinc-800 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="w-12 h-4 bg-zinc-800 rounded mx-auto" />
                    </td>
                    <td className="p-4">
                      <div className="w-12 h-4 bg-zinc-800 rounded mx-auto" />
                    </td>
                    <td className="p-4">
                      <div className="w-12 h-4 bg-zinc-800 rounded mx-auto" />
                    </td>
                    <td className="p-4">
                      <div className="w-12 h-4 bg-zinc-800 rounded mx-auto" />
                    </td>
                    <td className="p-4">
                      <div className="w-8 h-8 bg-zinc-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : (
                filtered?.map((post: any) => (
                  <tr
                    key={post.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="w-12 h-12 rounded overflow-hidden relative">
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {post.media_type === "VIDEO" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <PlayCircle size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-1 bg-zinc-800 rounded-full text-zinc-500 uppercase">
                        {post.media_type.split("_")[0]}
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium">
                      {formatNumber(post.like_count)}
                    </td>
                    <td className="p-4 text-center font-medium">
                      {formatNumber(post.comments_count)}
                    </td>
                    <td className="p-4 text-center font-medium text-brand-primary">
                      {typeof post.insights?.reach === "number"
                        ? formatNumber(post.insights.reach)
                        : "---"}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-emerald-500">
                          {getEngagementRate(
                            post.like_count,
                            post.comments_count,
                            account?.followers_count || 0
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {post.permalink ? (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 hover:text-white"
                          title="Abrir no Instagram"
                        >
                          <Eye size={18} />
                        </a>
                      ) : (
                        <span className="inline-flex p-2 text-zinc-700">
                          <Eye size={18} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered?.length === 0 && (
          <p className="p-6 text-center text-zinc-500 text-sm">
            Nenhum post no intervalo ou na busca — ajuste as datas ou o filtro de texto.
          </p>
        )}
      </div>
    </div>
  );
}
