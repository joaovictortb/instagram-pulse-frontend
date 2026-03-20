"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Filter, 
  Plus, 
  Search,
  Grid,
  List as ListIcon,
  Zap
} from "lucide-react";
import { useState } from "react";
import { formatNumber } from "@/src/lib/utils";
import { motion } from "motion/react";
import { apiFetch, readJsonBody } from "@/src/lib/api";

export default function ContentPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: account } = useQuery({
    queryKey: ['instagram-account'],
    queryFn: async () =>
      readJsonBody(await apiFetch("/api/instagram/account")),
  });

  const { data: media, isLoading } = useQuery({
    queryKey: ['instagram-media'],
    queryFn: async () =>
      readJsonBody(await apiFetch("/api/instagram/media")),
  });

  const calculateER = (likes: number, comments: number) => {
    if (!account?.followers_count) return 0;
    return (((likes + comments) / account.followers_count) * 100).toFixed(2);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Biblioteca de Conteúdo</h2>
          <p className="text-zinc-500 text-sm mt-1">Gerencie e analise seus posts, reels e stories do Instagram.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95">
          <Plus size={18} />
          Novo Post
        </button>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-card">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por legenda ou hashtag..." 
              className="w-full bg-zinc-900 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-sm font-medium transition-colors border border-dashboard-border">
            <Filter size={16} />
            Filtros
          </button>
        </div>
        <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-dashboard-border">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-brand-primary' : 'text-zinc-500'}`}
          >
            <Grid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-brand-primary' : 'text-zinc-500'}`}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-zinc-800/50 animate-pulse rounded-xl" />
          ))
        ) : (
          media?.map((post: any) => (
            <motion.div 
              key={post.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={viewMode === 'grid' ? "glass-card group" : "glass-card flex items-center p-4 gap-6"}
            >
              <div className={viewMode === 'grid' ? "aspect-square relative overflow-hidden" : "w-24 h-24 rounded-lg overflow-hidden flex-shrink-0"}>
                <img 
                  src={post.thumbnail_url || post.media_url} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-bold text-white uppercase">
                  {post.media_type.split('_')[0]}
                </div>
              </div>

              <div className={viewMode === 'grid' ? "p-4 space-y-3" : "flex-1 flex items-center justify-between"}>
                <div className={viewMode === 'grid' ? "" : "flex-1 mr-8"}>
                  <p className="text-xs text-zinc-500 mb-1">{new Date(post.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                    {post.caption || <span className="italic text-zinc-600">Sem legenda</span>}
                  </p>
                </div>

                <div className={viewMode === 'grid' ? "flex items-center justify-between pt-4 border-t border-dashboard-border" : "flex items-center gap-8"}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Heart size={14} />
                      <span className="text-xs font-bold">{formatNumber(post.like_count)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <MessageCircle size={14} />
                      <span className="text-xs font-bold">{formatNumber(post.comments_count)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-brand-primary">
                      <Zap size={14} />
                      <span className="text-xs font-bold">{calculateER(post.like_count, post.comments_count)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                      <Share2 size={16} />
                    </button>
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                      <Bookmark size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
