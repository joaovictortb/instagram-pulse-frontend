"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MoreVertical, 
  Reply, 
  ThumbsUp, 
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { formatNumber, cn } from "@/src/lib/utils";
import { motion } from "motion/react";

export default function CommentsPage() {
  const { data: comments, isLoading } = useQuery({
    queryKey: ['instagram-comments'],
    queryFn: () => fetch('/api/instagram/comments').then(res => res.json()),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Central de Comentários</h2>
          <p className="text-zinc-500 text-sm mt-1">Gerencie interações e engaje com sua comunidade usando assistência de IA.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold">
          <Clock size={14} />
          {comments?.length || 0} COMENTÁRIOS RECENTES
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Filtro de Sentimento</h4>
              <div className="space-y-2">
                {['Todos', 'Positivos', 'Perguntas', 'Neutros', 'Negativos', 'Spam'].map((filter) => (
                  <button 
                    key={filter}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 text-sm text-zinc-400 transition-colors"
                  >
                    <span>{filter}</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">--</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-dashboard-border">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Ações Rápidas</h4>
              <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors mb-2">
                Marcar todos como lidos
              </button>
              <button className="w-full py-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-colors">
                Limpar Pasta de Spam
              </button>
            </div>
          </div>
        </div>

        {/* Main Inbox */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar comentários..." 
                className="w-full bg-zinc-900 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary"
              />
            </div>
            <button className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-dashboard-border text-zinc-400">
              <Filter size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-zinc-800/50 animate-pulse rounded-xl" />
              ))
            ) : comments?.length > 0 ? (
              comments.map((comment: any) => (
                <motion.div 
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 flex gap-4 hover:border-brand-primary/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} alt="" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">@{comment.username}</span>
                        <span className="text-[10px] text-zinc-500">• {new Date(comment.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <button className="text-zinc-600 hover:text-zinc-300">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-brand-primary transition-colors">
                        <Reply size={14} />
                        RESPONDER
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-emerald-500 transition-colors">
                        <ThumbsUp size={14} />
                        CURTIR
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-rose-500 transition-colors">
                        <AlertCircle size={14} />
                        DENUNCIAR
                      </button>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-dashboard-border">
                    <img 
                      src={comment.post_thumb} 
                      alt="" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500 glass-card">
                Nenhum comentário encontrado nos posts recentes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
