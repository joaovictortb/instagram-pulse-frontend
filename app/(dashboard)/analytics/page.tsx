"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatNumber, getEngagementRate } from "@/src/lib/utils";
import { Heart, MessageCircle, Eye, Target, Bookmark, PlayCircle } from "lucide-react";

export default function AnalyticsPage() {
  const { data: account } = useQuery({
    queryKey: ['instagram-account'],
    queryFn: () => fetch('/api/instagram/account').then(res => res.json()),
  });

  const { data: media, isLoading } = useQuery({
    queryKey: ['instagram-media'],
    queryFn: () => fetch('/api/instagram/media').then(res => res.json()),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise Avançada</h2>
          <p className="text-zinc-500 text-sm mt-1">Mergulho profundo na performance do seu conteúdo e comportamento do público.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            Exportar CSV
          </button>
          <button className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium transition-colors">
            Atualizar Dados
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-dashboard-border flex items-center justify-between bg-zinc-900/50">
          <h3 className="font-bold">Matriz de Performance de Conteúdo</h3>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Buscar posts..." 
              className="bg-zinc-800 border-none rounded-lg px-4 py-1.5 text-sm outline-none w-64 focus:ring-1 ring-brand-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/30 border-b border-dashboard-border">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Mídia</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Data</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Tipo</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Curtidas</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Comentários</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Alcance</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Engajamento</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashboard-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="w-12 h-12 bg-zinc-800 rounded" /></td>
                    <td className="p-4"><div className="w-24 h-4 bg-zinc-800 rounded" /></td>
                    <td className="p-4"><div className="w-16 h-4 bg-zinc-800 rounded" /></td>
                    <td className="p-4"><div className="w-12 h-4 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="p-4"><div className="w-12 h-4 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="p-4"><div className="w-12 h-4 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="p-4"><div className="w-12 h-4 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="p-4"><div className="w-8 h-8 bg-zinc-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : (
                media?.map((post: any) => (
                  <tr key={post.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="w-12 h-12 rounded overflow-hidden relative">
                        <img 
                          src={post.thumbnail_url || post.media_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {post.media_type === 'VIDEO' && (
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
                        {post.media_type.split('_')[0]}
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium">{formatNumber(post.like_count)}</td>
                    <td className="p-4 text-center font-medium">{formatNumber(post.comments_count)}</td>
                    <td className="p-4 text-center font-medium text-brand-primary">
                      {post.insights?.reach ? formatNumber(post.insights.reach) : '---'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-emerald-500">
                          {getEngagementRate(post.like_count, post.comments_count, account?.followers_count || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 hover:text-white">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
