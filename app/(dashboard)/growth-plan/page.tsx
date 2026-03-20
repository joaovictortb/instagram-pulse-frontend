"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Sparkles,
  Loader2,
  AlertCircle,
  Info,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useUIStore } from "@/src/store/ui";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { GrowthPlanMarkdown } from "@/components/GrowthPlanMarkdown";

const REPORT_TYPE = "plano_crescimento_7d" as const;

export default function GrowthPlan7Page() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const { dateRange, setDateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);

  const cacheQueryKey = ["ai-report-cached", REPORT_TYPE, fromStr, toStr];

  const { data: cachedReport, isLoading: loadingCache } = useQuery({
    queryKey: cacheQueryKey,
    queryFn: async () => {
      const res = await apiFetch(
        `/api/ai/report/cached?reportType=${REPORT_TYPE}&from=${fromStr}&to=${toStr}`,
      );
      const j = await readJsonBody<{ error?: string }>(res);
      if (!res.ok)
        throw new Error((j as { error?: string })?.error || "Erro ao ler cache");
      return j as {
        ok: boolean;
        cached: boolean;
        reportMarkdown?: string;
        created_at?: string;
      };
    },
    staleTime: 5 * 60_000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: REPORT_TYPE,
          from: fromStr,
          to: toStr,
        }),
      });
      const data = await readJsonBody<{ error?: string }>(res);
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error || "Falha ao gerar plano",
        );
      return data as { reportMarkdown?: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cacheQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["ai-reports-list"] });
    },
  });

  const markdown =
    generateMutation.data?.reportMarkdown ??
    cachedReport?.reportMarkdown ??
    "";
  const loading = loadingCache || generateMutation.isPending;
  const showEmpty = !loading && !markdown;

  const copyPlan = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CalendarRange size={28} />
          </div>
          <div>
            <Link
              to="/growth-ai"
              className="text-xs text-zinc-500 hover:text-brand-primary flex items-center gap-1 mb-2"
            >
              <ArrowLeft size={14} />
              Voltar para Crescimento IA
            </Link>
            <h2 className="text-3xl font-bold">Plano de crescimento — 7 dias</h2>
            <p className="text-zinc-500 mt-1 max-w-xl">
              A IA usa os <strong>mesmos dados</strong> do Orquestrador (KPIs, posts,
              engajamento por dia e formato) para montar um plano{" "}
              <strong>acionável</strong>: calendário sugerido, ideias de posts,
              ajustes no perfil e o que medir no fim da semana.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 glass-card">
        <div className="flex flex-wrap items-end gap-4 flex-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Dados de (análise)
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
        <button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white text-sm font-bold transition-colors shrink-0"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Gerando plano…
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Gerar plano com IA
            </>
          )}
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-900/60 border border-dashboard-border text-sm text-zinc-400">
        <Info className="shrink-0 text-brand-primary mt-0.5" size={18} />
        <p>
          O período acima define <strong>quais números históricos</strong> entram no
          prompt (não é a duração do plano). Rode{" "}
          <Link to="/settings" className="text-brand-primary hover:underline">
            Sincronizar
          </Link>{" "}
          em Configurações se os gráficos estiverem vazios. Cada geração chama a
          OpenAI (custo) e salva em{" "}
          <Link to="/reports" className="text-brand-primary hover:underline">
            Relatórios
          </Link>
          .
        </p>
      </div>

      {cachedReport?.cached && cachedReport?.created_at && !generateMutation.data && (
        <p className="text-xs text-zinc-500">
          Último plano salvo para este período:{" "}
          {new Date(cachedReport.created_at).toLocaleString("pt-BR")}
        </p>
      )}

      {generateMutation.isError && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={18} />
          {generateMutation.error instanceof Error
            ? generateMutation.error.message
            : "Erro ao gerar"}
        </div>
      )}

      {!loading && !showEmpty && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            Dica: siga as seções em ordem — do resumo numérico ao calendário e à checklist.
          </p>
          <button
            type="button"
            onClick={() => void copyPlan()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-emerald-500/40 hover:bg-zinc-800 transition-colors"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-400" />
                Copiado
              </>
            ) : (
              <>
                <Copy size={16} />
                Copiar plano (Markdown)
              </>
            )}
          </button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950/95 to-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_24px_48px_-12px_rgba(0,0,0,0.45)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent"
          aria-hidden
        />
        <div className="p-6 sm:p-10 lg:p-12">
          {loading ? (
            <div className="space-y-4 max-w-2xl">
              <div className="h-5 bg-zinc-800/80 rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-zinc-800/60 rounded-lg w-full animate-pulse" />
              <div className="h-4 bg-zinc-800/60 rounded-lg w-11/12 animate-pulse" />
              <div className="h-4 bg-zinc-800/60 rounded-lg w-9/12 animate-pulse" />
              <div className="h-32 bg-zinc-800/40 rounded-xl w-full mt-8 animate-pulse" />
            </div>
          ) : showEmpty ? (
            <p className="text-zinc-500 text-center sm:text-left max-w-md">
              Nenhum plano em cache para{" "}
              <strong className="text-zinc-300">
                {fromStr} — {toStr}
              </strong>
              . Clique em <strong className="text-emerald-400">Gerar plano com IA</strong>.
            </p>
          ) : (
            <GrowthPlanMarkdown markdown={markdown} />
          )}
        </div>
      </div>
    </div>
  );
}
