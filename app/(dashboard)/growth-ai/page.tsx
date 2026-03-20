"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Sparkles, BrainCircuit, Target, Zap, ArrowRight, Lightbulb, History, Trash2, CalendarRange } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { cn } from "@/src/lib/utils";
import { useState, useCallback } from "react";
import { useUIStore } from "@/src/store/ui";
import { apiFetch, readJsonBody } from "@/src/lib/api";

interface AIInsightDoc {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
}

export default function GrowthAIPage() {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<AIInsightDoc[]>([]);

  const { dateRange } = useUIStore();
  const fromStr = dateRange.from.toISOString().slice(0, 10);
  const toStr = dateRange.to.toISOString().slice(0, 10);
  const cacheQueryKey = ["ai-report-cached", "growth", fromStr, toStr];

  const addToHistory = useCallback((content: string) => {
    setHistory(prev => [{
      id: crypto.randomUUID(),
      content,
      type: 'growth',
      createdAt: new Date(),
    }, ...prev]);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const { data: cachedReport, isLoading: loadingCache } = useQuery({
    queryKey: cacheQueryKey,
    queryFn: async () => {
      const res = await apiFetch(
        `/api/ai/report/cached?reportType=growth&from=${fromStr}&to=${toStr}`,
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

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "growth",
          from: fromStr,
          to: toStr,
        }),
      });
      const data = await readJsonBody<{ error?: string }>(res);
      if (!res.ok)
        throw new Error((data as { error?: string })?.error || "Falha ao gerar relatório");
      return data as { reportMarkdown?: string };
    },
    onSuccess: (data) => {
      if (data.reportMarkdown) addToHistory(data.reportMarkdown);
      void queryClient.invalidateQueries({ queryKey: cacheQueryKey });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-primary rounded-2xl text-white shadow-lg shadow-brand-primary/20">
          <BrainCircuit size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Inteligência de Crescimento IA</h2>
          <p className="text-zinc-500">Insights preditivos e recomendações estratégicas alimentadas por OpenAI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Strategy Panel */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 to-transparent">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-brand-primary">
                <Sparkles size={20} />
                <h3 className="text-xl font-bold uppercase tracking-widest">Diagnóstico Estratégico</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/growth-plan"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-colors"
                >
                  <CalendarRange size={16} />
                  Plano 7 dias
                </Link>
                <button
                  type="button"
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isPending}
                  className="text-xs font-bold text-brand-primary hover:underline disabled:opacity-50"
                >
                  {generateReportMutation.isPending ? "GERANDO…" : "GERAR NOVA ANÁLISE"}
                </button>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-lg">
              {loadingCache || generateReportMutation.isPending ? (
                <div className="space-y-4">
                  <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-4/6 animate-pulse" />
                </div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>
                    {cachedReport?.reportMarkdown ||
                      history[0]?.content ||
                      "Clique em GERAR NOVA ANÁLISE para usar a OpenAI (cada clique gera custo). Relatórios ficam salvos no Supabase para este período."}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 hover:border-brand-primary/40 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Target size={20} />
                </div>
                <h4 className="font-bold">Oportunidades de Conteúdo</h4>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Identificamos uma lacuna em conteúdos de "Bastidores". Posts desse tipo tendem a gerar 3x mais salvamentos na sua conta.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-primary">
                VER RECOMENDAÇÕES <ArrowRight size={14} />
              </div>
            </div>

            <div className="glass-card p-6 hover:border-brand-primary/40 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <Zap size={20} />
                </div>
                <h4 className="font-bold">Alertas de Otimização</h4>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Sua taxa de resposta aos comentários caiu 15%. Isso está afetando a entrega orgânica dos seus novos posts.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-primary">
                CORRIGIR AGORA <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* History Section */}
          {history.length > 1 && (
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-zinc-400">
                <History size={18} />
                Histórico de Análises
              </h3>
              <div className="space-y-4">
                {history.slice(1, 5).map((item) => (
                  <div key={item.id} className="glass-card p-4 flex justify-between items-start gap-4">
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-zinc-500 mb-2">
                        {item.createdAt?.toLocaleString('pt-BR')}
                      </p>
                      <div className="text-sm text-zinc-400 line-clamp-2 prose prose-invert prose-sm">
                        <ReactMarkdown>{item.content}</ReactMarkdown>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromHistory(item.id)}
                      className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              Melhores Horários para Postar
            </h4>
            <div className="space-y-3">
              {[
                { day: 'Quarta-feira', time: '18:00', confidence: 'Alta' },
                { day: 'Sexta-feira', time: '12:30', confidence: 'Média' },
                { day: 'Segunda-feira', time: '09:00', confidence: 'Alta' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-dashboard-border">
                  <div>
                    <p className="text-sm font-bold">{item.day}</p>
                    <p className="text-xs text-zinc-500">{item.time}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full",
                    item.confidence === 'Alta' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {item.confidence}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="font-bold mb-4">Plano de Conteúdo Semanal</h4>
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-brand-primary/30 space-y-4">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-brand-primary border-4 border-dashboard-bg" />
                  <p className="text-xs font-bold text-brand-primary uppercase">Segunda-feira</p>
                  <p className="text-sm font-medium">Carrossel Educativo</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-zinc-700 border-4 border-dashboard-bg" />
                  <p className="text-xs font-bold text-zinc-500 uppercase">Terça-feira</p>
                  <p className="text-sm font-medium">Enquete de Engajamento nos Stories</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-brand-primary border-4 border-dashboard-bg" />
                  <p className="text-xs font-bold text-brand-primary uppercase">Quarta-feira</p>
                  <p className="text-sm font-medium">Reel Viral (Bastidores)</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors">
              Estratégia Semanal Completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
