"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  TrendingUp, 
  MapPin, 
  Clock, 
  PieChart as PieChartIcon,
  Activity
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { formatNumber } from "@/src/lib/utils";

const COLORS = ['#E1306C', '#833AB4', '#F77737', '#FFDC80', '#405DE6'];

export default function AudiencePage() {
  const { data: account } = useQuery({
    queryKey: ['instagram-account'],
    queryFn: () => fetch('/api/instagram/account').then(res => res.json()),
  });

  const { data: audience, isLoading } = useQuery({
    queryKey: ['instagram-audience'],
    queryFn: () => fetch('/api/instagram/audience').then(res => res.json()),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Carregando insights de audiência...</div>;
  }

  // Process Gender/Age data
  const genderAgeData = audience?.audience_gender_age ? Object.entries(audience.audience_gender_age).map(([key, value]) => {
    const [gender, age] = key.split('.');
    return { gender, age, value: value as number };
  }) : [];

  const ageGroups = genderAgeData.reduce((acc: any, curr: any) => {
    if (!acc[curr.age]) acc[curr.age] = 0;
    acc[curr.age] += curr.value;
    return acc;
  }, {});

  const pieData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

  const genderTotals = genderAgeData.reduce((acc: any, curr: any) => {
    if (!acc[curr.gender]) acc[curr.gender] = 0;
    acc[curr.gender] += curr.value;
    return acc;
  }, {});

  const totalAudience = Object.values(genderTotals).reduce((a: any, b: any) => a + b, 0) as number;
  const femalePercent = totalAudience > 0 ? Math.round((genderTotals['F'] || 0) / totalAudience * 100) : 0;
  const malePercent = totalAudience > 0 ? Math.round((genderTotals['M'] || 0) / totalAudience * 100) : 0;

  // Process Locations
  const topCities = audience?.audience_city ? Object.entries(audience.audience_city)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5)
    .map(([city, value]) => ({
      city,
      percentage: Math.round((value as number) / totalAudience * 100)
    })) : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Insights de Audiência</h2>
        <p className="text-zinc-500 text-sm mt-1">Entenda quem são seus seguidores e como eles interagem com seu perfil.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Seguidores Totais</p>
            <h3 className="text-2xl font-bold">{formatNumber(account?.followers_count || 0)}</h3>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">Base de seguidores real</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <UserMinus size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Seguindo</p>
            <h3 className="text-2xl font-bold">{formatNumber(account?.follows_count || 0)}</h3>
            <p className="text-[10px] text-zinc-500 font-bold mt-1">Contas que você segue</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Média de Posts</p>
            <h3 className="text-2xl font-bold">{formatNumber(account?.media_count || 0)}</h3>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">Volume de conteúdo</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Age & Gender */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-brand-primary" />
            Demografia por Idade
          </h3>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-zinc-900 rounded-xl border border-dashboard-border text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase">Mulheres</p>
              <p className="text-xl font-bold">{femalePercent}%</p>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-dashboard-border text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase">Homens</p>
              <p className="text-xl font-bold">{malePercent}%</p>
            </div>
          </div>
        </div>

        {/* Top Locations */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-brand-primary" />
            Principais Localizações (Cidades)
          </h3>
          <div className="space-y-4">
            {topCities.length > 0 ? topCities.map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.city}</span>
                  <span className="text-zinc-500">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary rounded-full" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-center text-zinc-500 py-12">Dados de localização insuficientes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
