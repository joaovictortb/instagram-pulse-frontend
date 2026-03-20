"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  Download
} from "lucide-react";
import Markdown from "react-markdown";
import { motion } from "motion/react";

export default function OrchestratorPage() {
  const [analysis, setAnalysis] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/orchestrator', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Falha na análise');
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Cpu className="text-brand-primary" size={32} />
            Orquestrador de Crescimento
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Análise profunda baseada em dados reais para maximizar seu alcance e seguidores.
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
            <p className="text-sm text-zinc-500">Descubra exatamente o que atrai novos seguidores para o seu nicho.</p>
          </div>
          <div className="glass-card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Clock size={24} />
            </div>
            <h3 className="font-bold">Horários de Pico</h3>
            <p className="text-sm text-zinc-500">Identifique os momentos em que sua audiência está mais ativa e engajada.</p>
          </div>
          <div className="glass-card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Sparkles size={24} />
            </div>
            <h3 className="font-bold">Sugestões de Conteúdo</h3>
            <p className="text-sm text-zinc-500">Receba ideias de posts baseadas nos seus formatos de maior sucesso.</p>
          </div>
        </div>
      )}

      {mutation.isPending && (
        <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin" />
            <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-primary" size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">O Orquestrador está trabalhando...</h3>
            <p className="text-zinc-500 max-w-md">
              Estamos cruzando seus dados de alcance, engajamento e performance de conteúdo para criar seu plano estratégico.
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

          <div className="relative glass-card p-8 prose prose-invert max-w-none prose-headings:text-brand-primary prose-strong:text-brand-accent prose-p:text-zinc-300">
            <div className="absolute top-6 right-6 flex gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(analysis);
                  alert('Relatório copiado para a área de transferência!');
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                title="Copiar Relatório"
              >
                <Copy size={18} />
              </button>
              <button 
                onClick={() => window.print()}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                title="Imprimir Relatório"
              >
                <Download size={18} />
              </button>
            </div>
            <Markdown>{analysis}</Markdown>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 bg-brand-primary/5 border-brand-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="text-brand-primary" size={24} />
                <h4 className="font-bold">Dica de Ouro</h4>
              </div>
              <p className="text-sm text-zinc-400">
                Os dados mostram que a consistência é o fator #1 para o seu crescimento. 
                Siga o plano de ação acima rigorosamente por 15 dias para ver os primeiros resultados.
              </p>
            </div>
            <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-emerald-500" size={24} />
                <h4 className="font-bold">Próximo Passo</h4>
              </div>
              <p className="text-sm text-zinc-400">
                Agende seus próximos 5 posts seguindo os horários sugeridos. 
                Use a Central de Comentários para responder a todos nas primeiras 2 horas após a postagem.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
