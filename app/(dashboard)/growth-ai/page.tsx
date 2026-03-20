"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, BrainCircuit, Target, Zap, ArrowRight, Lightbulb, History, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/src/lib/utils";
import { db, handleFirestoreError, OperationType } from "@/src/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "@/src/components/FirebaseProvider";
import { useEffect, useState } from "react";

interface AIInsightDoc {
  id: string;
  content: string;
  type: string;
  createdAt: Timestamp;
}

export default function GrowthAIPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<AIInsightDoc[]>([]);

  const { data: account } = useQuery({
    queryKey: ['instagram-account'],
    queryFn: () => fetch('/api/instagram/account').then(res => res.json()),
  });

  const { data: media } = useQuery({
    queryKey: ['instagram-media'],
    queryFn: () => fetch('/api/instagram/media').then(res => res.json()),
  });

  const { data: insights } = useQuery({
    queryKey: ['instagram-insights'],
    queryFn: () => fetch('/api/instagram/insights').then(res => res.json()),
  });

  // Listen to history from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'insights'),
      where('userId', '==', user.uid),
      where('type', '==', 'growth'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AIInsightDoc[];
      setHistory(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'insights');
    });

    return () => unsubscribe();
  }, [user]);

  const saveInsightMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) return;
      const path = 'insights';
      try {
        await addDoc(collection(db, path), {
          userId: user.uid,
          type: 'growth',
          content,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  });

  const deleteInsightMutation = useMutation({
    mutationFn: async (id: string) => {
      const path = `insights/${id}`;
      try {
        await deleteDoc(doc(db, 'insights', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  });

  const { data: aiInsights, isLoading, isFetching } = useQuery({
    queryKey: ['ai-growth-insights'],
    queryFn: async () => {
      const res = await fetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ 
          type: 'summary', 
          data: { 
            context: 'growth_strategy',
            account, 
            media, 
            insights 
          } 
        }),
      });
      const data = await res.json();
      
      // Save to history if we got a result
      if (data.result) {
        saveInsightMutation.mutate(data.result);
      }
      
      return data;
    },
    enabled: !!account && !!media && !!insights,
    staleTime: Infinity, // Don't refetch automatically
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-primary rounded-2xl text-white shadow-lg shadow-brand-primary/20">
          <BrainCircuit size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Inteligência de Crescimento IA</h2>
          <p className="text-zinc-500">Insights preditivos e recomendações estratégicas alimentadas pelo Gemini.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Strategy Panel */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 to-transparent">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-brand-primary">
                <Sparkles size={20} />
                <h3 className="text-xl font-bold uppercase tracking-widest">Diagnóstico Estratégico</h3>
              </div>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['ai-growth-insights'] })}
                disabled={isFetching}
                className="text-xs font-bold text-brand-primary hover:underline disabled:opacity-50"
              >
                {isFetching ? "GERANDO..." : "GERAR NOVA ANÁLISE"}
              </button>
            </div>
            <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-lg">
              {isLoading || isFetching ? (
                <div className="space-y-4">
                  <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-4/6 animate-pulse" />
                </div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>
                    {aiInsights?.result || history[0]?.content || "Analisando sua conta para gerar estratégias personalizadas..."}
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
                        {item.createdAt?.toDate().toLocaleString('pt-BR')}
                      </p>
                      <div className="text-sm text-zinc-400 line-clamp-2 prose prose-invert prose-sm">
                        <ReactMarkdown>{item.content}</ReactMarkdown>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteInsightMutation.mutate(item.id)}
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
