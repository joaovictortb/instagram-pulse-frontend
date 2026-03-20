"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Play,
  CheckCircle2,
  Target,
  Clock,
  TrendingUp,
  Lightbulb,
  Loader2,
  Sparkles,
  Copy,
  Download,
} from "lucide-react";
import Markdown, { type Components } from "react-markdown";
import { motion } from "motion/react";
import { useUIStore } from "@/src/store/ui";
import { apiFetch, readJsonBody } from "@/src/lib/api";

export default function OrchestratorPage() {
  const queryClient = useQueryClient();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const { dateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);
  const orchCacheKey = ["ai-report-cached", "orquestrador", fromStr, toStr];

  /** Tipografia clara: hierarquia visual + listas legíveis (Markdown do Orquestrador). */
  const reportMdComponents: Components = {
    h1: ({ children, ...props }) => (
      <h1
        className="text-2xl sm:text-3xl font-bold text-white tracking-tight border-b border-zinc-700/80 pb-4 mb-8 pr-20"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-xl font-bold text-brand-primary mt-12 mb-4 scroll-mt-24 pt-2 border-t border-zinc-800/90"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-semibold text-brand-accent mt-8 mb-3" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-base font-semibold text-zinc-200 mt-6 mb-2" {...props}>
        {children}
      </h4>
    ),
    p: ({ children, ...props }) => (
      <p className="text-zinc-300 leading-relaxed my-4 text-[15px]" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc pl-6 my-4 space-y-2 text-zinc-300 text-[15px]" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal pl-6 my-4 space-y-2 text-zinc-300 text-[15px]" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed pl-1 marker:text-brand-primary/80" {...props}>
        {children}
      </li>
    ),
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-zinc-100" {...props}>
        {children}
      </strong>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-brand-primary/70 bg-brand-primary/5 pl-4 py-3 my-6 rounded-r-lg text-zinc-400 text-sm italic"
        {...props}
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-10 border-zinc-700/60" />,
    pre: ({ children, ...props }) => (
      <pre
        className="my-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto text-sm text-zinc-300"
        {...props}
      >
        {children}
      </pre>
    ),
    code: ({ children, className, ...props }) => {
      const isBlock = typeof className === "string" && className.includes("language-");
      if (isBlock) {
        return (
          <code className={`font-mono text-sm block ${className || ""}`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="text-brand-accent/95 bg-zinc-800/90 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-brand-primary underline-offset-2 hover:underline font-medium"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    table: ({ children, ...props }) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-zinc-700/80">
        <table className="w-full text-sm text-left text-zinc-300" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-zinc-900/80 text-zinc-200 text-xs uppercase tracking-wide" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th className="px-4 py-3 font-semibold border-b border-zinc-700" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-2.5 border-b border-zinc-800/80" {...props}>
        {children}
      </td>
    ),
  };

  const { data: cachedOrch } = useQuery({
    queryKey: orchCacheKey,
    queryFn: async () => {
      const res = await apiFetch(
        `/api/ai/report/cached?reportType=orquestrador&from=${fromStr}&to=${toStr}`,
      );
      const j = await readJsonBody<{ error?: string }>(res);
      if (!res.ok)
        throw new Error(
          (j as { error?: string })?.error || "Erro ao ler cache",
        );
      return j as { ok?: boolean; cached?: boolean; reportMarkdown?: string };
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (cachedOrch === undefined) return;
    if (cachedOrch.reportMarkdown) setAnalysis(cachedOrch.reportMarkdown);
    else if (cachedOrch.cached === false) setAnalysis(null);
  }, [cachedOrch]);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "orquestrador",
          from: fromStr,
          to: toStr,
        }),
      });
      const data = await readJsonBody<{
        reportMarkdown?: string;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error || "Falha na análise");
      return data;
    },
    onSuccess: (data) => {
      setAnalysis(data.reportMarkdown);
      void queryClient.invalidateQueries({ queryKey: orchCacheKey });
    },
  });

  return (
    <div className="space-y-8 mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Cpu className="text-brand-primary" size={32} />
            Orquestrador de Crescimento
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Análise profunda baseada em dados reais para maximizar seu alcance e
            seguidores.
          </p>
        </div>
        {!analysis && (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                ANALISANDO...
              </>
            ) : (
              <>
                <Play size={20} />
                INICIAR ANÁLISE PROFUNDA
              </>
            )}
          </button>
        )}
      </div>

      {!analysis && !mutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Target size={24} />
            </div>
            <h3 className="font-bold">Estratégia de Seguidores</h3>
            <p className="text-sm text-zinc-500">
              Descubra exatamente o que atrai novos seguidores para o seu nicho.
            </p>
          </div>
          <div className="glass-card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Clock size={24} />
            </div>
            <h3 className="font-bold">Horários de Pico</h3>
            <p className="text-sm text-zinc-500">
              Identifique os momentos em que sua audiência está mais ativa e
              engajada.
            </p>
          </div>
          <div className="glass-card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Sparkles size={24} />
            </div>
            <h3 className="font-bold">Sugestões de Conteúdo</h3>
            <p className="text-sm text-zinc-500">
              Receba ideias de posts baseadas nos seus formatos de maior
              sucesso.
            </p>
          </div>
        </div>
      )}

      {mutation.isPending && (
        <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin" />
            <Cpu
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-primary"
              size={32}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">
              O Orquestrador está trabalhando...
            </h3>
            <p className="text-zinc-500 max-w-md">
              Estamos cruzando seus dados de alcance, engajamento e performance
              de conteúdo para criar seu plano estratégico.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
          </div>
        </div>
      )}

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CheckCircle2 size={18} />
              ANÁLISE CONCLUÍDA COM SUCESSO
            </div>
            <button
              onClick={() => mutation.mutate()}
              className="text-xs font-bold text-zinc-500 hover:text-brand-primary transition-colors"
            >
              REFAZER ANÁLISE
            </button>
          </div>

          <div className="relative glass-card p-6 sm:p-10 max-w-4xl mx-auto">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-1 z-10">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(analysis);
                  alert("Relatório copiado para a área de transferência!");
                }}
                className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 border border-zinc-700/80"
                title="Copiar relatório (Markdown)"
              >
                <Copy size={18} />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 border border-zinc-700/80"
                title="Imprimir / PDF"
              >
                <Download size={18} />
              </button>
            </div>
            <article className="orchestrator-report max-w-none pr-2 sm:pr-4">
              <Markdown components={reportMdComponents}>{analysis}</Markdown>
            </article>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 bg-brand-primary/5 border-brand-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="text-brand-primary" size={24} />
                <h4 className="font-bold">Dica de Ouro</h4>
              </div>
              <p className="text-sm text-zinc-400">
                Os dados mostram que a consistência é o fator #1 para o seu
                crescimento. Siga o plano de ação acima rigorosamente por 15
                dias para ver os primeiros resultados.
              </p>
            </div>
            <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-emerald-500" size={24} />
                <h4 className="font-bold">Próximo Passo</h4>
              </div>
              <p className="text-sm text-zinc-400">
                Agende seus próximos 5 posts seguindo os horários sugeridos. Use
                a Central de Comentários para responder a todos nas primeiras 2
                horas após a postagem.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
