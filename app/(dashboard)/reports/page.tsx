"use client";

import { 
  FileText, 
  Download, 
  Calendar, 
  Plus, 
  History, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Cpu
} from "lucide-react";
import { motion } from "motion/react";

export default function ReportsPage() {
  const reports = [
    { id: '1', name: 'Resumo Executivo Mensal - Fev 2026', type: 'Executivo', date: '2026-03-01', status: 'Concluído' },
    { id: '2', name: 'Análise de Desempenho Semanal', type: 'Operacional', date: '2026-03-15', status: 'Concluído' },
    { id: '3', name: 'Relatório de Estratégia de Crescimento', type: 'Estratégia de IA', date: '2026-03-18', status: 'Concluído' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Central de Relatórios</h2>
          <p className="text-zinc-500 text-sm mt-1">Gere e gerencie relatórios PDF profissionais para o seu negócio.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95">
          <Plus size={18} />
          Criar Novo Relatório
        </button>
      </div>

      {/* AI Strategic Report Section */}
      <div className="glass-card p-8 bg-gradient-to-br from-brand-primary/10 to-transparent border-brand-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-xl shadow-brand-primary/20">
            <Cpu size={40} />
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h3 className="text-xl font-bold">Relatório Estratégico IA (Orquestrador)</h3>
            <p className="text-zinc-400 max-w-2xl">
              Nossa ferramenta mais avançada. O Orquestrador analisa todo o seu histórico, 
              engajamento e comportamento da audiência para criar um plano de 30 dias personalizado.
            </p>
          </div>
          <a 
            href="/orchestrator"
            className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap"
          >
            Gerar com IA
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report Generator Config */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <Calendar size={18} className="text-brand-primary" />
              Geração Rápida
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Tipo de Relatório</label>
                <select className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary">
                  <option>Resumo Executivo</option>
                  <option>Análise Profunda de Conteúdo</option>
                  <option>Análise de Audiência</option>
                  <option>Relatório Mensal Completo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Intervalo de Datas</label>
                <select className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary">
                  <option>Últimos 7 Dias</option>
                  <option>Últimos 30 Dias</option>
                  <option>Mês Passado</option>
                  <option>Intervalo Personalizado</option>
                </select>
              </div>
              <div className="flex items-center gap-2 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                <input type="checkbox" id="ai-insights" className="rounded border-zinc-700 bg-zinc-900 text-brand-primary" defaultChecked />
                <label htmlFor="ai-insights" className="text-xs font-medium text-zinc-300">Incluir Narrativa Estratégica de IA</label>
              </div>
              <button className="w-full py-3 bg-brand-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-primary/20 transition-all hover:bg-brand-primary/90">
                Gerar Prévia
              </button>
            </div>
          </div>
        </div>

        {/* History & Recent Reports */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <div className="p-6 border-b border-dashboard-border flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <History size={18} className="text-zinc-400" />
                Relatórios Recentes
              </h3>
            </div>
            <div className="divide-y divide-dashboard-border">
              {reports.map((report) => (
                <div key={report.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{report.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{report.type}</span>
                        <span className="text-[10px] text-zinc-600">• {new Date(report.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold">
                      <CheckCircle2 size={12} />
                      {report.status.toUpperCase()}
                    </div>
                    <button className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-zinc-900/50 text-center">
              <button className="text-xs font-bold text-zinc-500 hover:text-brand-primary transition-colors">
                VER TODO O HISTÓRICO
              </button>
            </div>
          </div>

          {/* Report Preview Placeholder */}
          <div className="glass-card p-12 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600">
              <FileText size={32} />
            </div>
            <div>
              <h4 className="font-bold text-zinc-400">Nenhum relatório selecionado</h4>
              <p className="text-xs text-zinc-600 mt-1">Selecione um relatório do histórico ou gere um novo para ver a prévia aqui.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
