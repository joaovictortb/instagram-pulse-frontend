"use client";

import { useQuery } from "@tanstack/react-query";
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
  TrendingUp
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { formatNumber } from "@/src/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";

const mockChartData = [
  { name: 'Mon', reach: 4000, engagement: 2400 },
  { name: 'Tue', reach: 3000, engagement: 1398 },
  { name: 'Wed', reach: 2000, engagement: 9800 },
  { name: 'Thu', reach: 2780, engagement: 3908 },
  { name: 'Fri', reach: 1890, engagement: 4800 },
  { name: 'Sat', reach: 2390, engagement: 3800 },
  { name: 'Sun', reach: 3490, engagement: 4300 },
];

export default function DashboardPage() {
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['instagram-account'],
    queryFn: () => fetch('/api/instagram/account').then(res => res.json()),
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['instagram-insights'],
    queryFn: () => fetch('/api/instagram/insights').then(res => res.json()),
  });

  const { data: media, isLoading: loadingMedia } = useQuery({
    queryKey: ['instagram-media'],
    queryFn: () => fetch('/api/instagram/media').then(res => res.json()),
  });

  const { data: performance, isLoading: loadingPerformance } = useQuery({
    queryKey: ['instagram-performance'],
    queryFn: () => fetch('/api/instagram/performance').then(res => res.json()),
  });

  const { data: aiSummary, isLoading: loadingAI } = useQuery({
    queryKey: ['ai-summary'],
    queryFn: () => fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'summary', data: { account, insights, media } }),
    }).then(res => res.json()),
    enabled: !!account && !!insights && !!media,
  });

  if (loadingAccount || loadingInsights || loadingMedia || loadingPerformance) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-800/50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  // Format chart data from history
  const chartData = insights?.reach_history?.map((item: any) => ({
    name: new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
    reach: item.value
  })) || [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex items-center justify-between p-8 glass-card bg-gradient-to-r from-brand-accent/10 via-transparent to-transparent">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand-accent via-brand-primary to-brand-secondary">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
              <img 
                src={account?.profile_picture_url || "https://picsum.photos/seed/insta/200"} 
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
                <p className="text-lg font-bold">{formatNumber(account?.followers_count || 0)}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatNumber(account?.media_count || 0)}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatNumber(account?.follows_count || 0)}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Seguindo</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden lg:block max-w-md">
          <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
            <div className="flex items-center gap-2 text-brand-primary mb-2">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Insight de IA</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed italic">
              {aiSummary?.result ? (
                aiSummary.result.split('\n')[0].replace(/[*#]/g, '')
              ) : (
                "Analisando seus dados para gerar insights personalizados..."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Alcance Total" 
          value={insights?.reach || 0} 
          trend={insights?.reach_trend} 
          icon={Target} 
          description="Contas únicas alcançadas"
        />
        <MetricCard 
          title="Impressões" 
          value={insights?.impressions || 0} 
          trend={insights?.impressions_trend} 
          icon={Eye} 
          description="Visualizações totais no seu conteúdo"
        />
        <MetricCard 
          title="Visitas ao Perfil" 
          value={insights?.profile_views || 0} 
          trend={insights?.profile_views_trend} 
          icon={Users} 
          description="Visitas ao seu perfil"
        />
        <MetricCard 
          title="Cliques no Site" 
          value={insights?.website_clicks || 0} 
          trend={insights?.website_clicks_trend} 
          icon={MousePointer2} 
          description="Cliques no link da sua bio"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Alcance (Últimos 30 Dias)</h3>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E1306C" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E1306C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="name" stroke="#71717A" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                  itemStyle={{ color: '#E1306C' }}
                />
                <Area type="monotone" dataKey="reach" stroke="#E1306C" fillOpacity={1} fill="url(#colorReach)" strokeWidth={2} />
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
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="type" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#833AB4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Summary Card */}
      <div className="glass-card p-8 border-brand-primary/30 bg-brand-primary/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles size={120} className="text-brand-primary" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-primary rounded-lg text-white">
              <Sparkles size={20} />
            </div>
            <h3 className="text-xl font-bold">Resumo Executivo de IA</h3>
          </div>
          <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed">
            {loadingAI ? (
              <div className="space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-4/6 animate-pulse" />
              </div>
            ) : (
              <ReactMarkdown>{aiSummary?.result || "Nenhum insight disponível no momento."}</ReactMarkdown>
            )}
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Performance de Conteúdo Recente</h3>
          <button className="text-sm text-brand-primary font-medium hover:underline">Ver Todo o Conteúdo</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {media?.slice(0, 5).map((post: any) => (
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
                    <span className="text-xs font-bold">{formatNumber(post.like_count)}</span>
                  </div>
                  <div className="flex flex-col items-center text-white">
                    <MessageCircle size={20} fill="white" />
                    <span className="text-xs font-bold">{formatNumber(post.comments_count)}</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {post.media_type.replace('_', ' ')}
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
                    <span className="text-[10px] font-bold">Melhor Performance</span>
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
