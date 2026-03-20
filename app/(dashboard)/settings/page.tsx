"use client";

import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon, Shield, Database, Bell, Palette, Globe, RefreshCcw, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: account } = useQuery({
    queryKey: ['instagram-account'],
    queryFn: () => fetch('/api/instagram/account').then(res => res.json()),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-zinc-500 text-sm mt-1">Gerencie as integrações da sua conta e as preferências do painel.</p>
      </div>

      <div className="space-y-6">
        {/* Integration Status */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold">Integração com a API Meta Graph</h3>
                <p className="text-xs text-zinc-500">Conectado à Conta Comercial do Instagram</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold">
              <CheckCircle2 size={14} />
              ATIVO
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">ID da Conta</p>
                <p className="text-sm font-mono">{account?.id || "---"}</p>
              </div>
              <div className="p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome de Usuário</p>
                <p className="text-sm font-mono">@{account?.username || "---"}</p>
              </div>
            </div>
            <div className="p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Token de Acesso</p>
              <p className="text-sm font-mono">••••••••••••••••••••••••••••••••••••••••</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-dashboard-border flex justify-between items-center">
            <p className="text-xs text-zinc-500">Última sincronização: 5 minutos atrás</p>
            <button 
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
              Forçar Sincronização
            </button>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold">IA e Privacidade</h3>
              <p className="text-xs text-zinc-500">Configure como o Gemini processa seus dados</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
              <div>
                <p className="text-sm font-medium">Insights Automáticos</p>
                <p className="text-xs text-zinc-500">Gerar resumos automaticamente ao carregar a página</p>
              </div>
              <div className="w-10 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
              <div>
                <p className="text-sm font-medium">Classificação de Comentários</p>
                <p className="text-xs text-zinc-500">Usar IA para categorizar os comentários recebidos</p>
              </div>
              <div className="w-10 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Cache Management */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold">Cache e Desempenho</h3>
              <p className="text-xs text-zinc-500">Gerencie o armazenamento local e do servidor</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-dashboard-border">
            <div>
              <p className="text-sm font-medium">Tamanho do Cache Local</p>
              <p className="text-xs text-zinc-500">Armazenamento atual usado para dados analíticos: 12,4 MB</p>
            </div>
            <button className="px-4 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg text-sm font-medium transition-colors">
              Limpar Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
