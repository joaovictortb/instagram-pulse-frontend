"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Calendar,
  Plus,
  History,
  CheckCircle2,
  Cpu,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useMemo, useState } from "react";
import { apiFetch, readJsonBody } from "@/src/lib/api";

type ReportRow = {
  id: string;
  report_type: string;
  from_date: string;
  to_date: string;
  created_at: string;
};

function reportTypeLabel(t: string): string {
  const map: Record<string, string> = {
    executivo: "Resumo executivo",
    growth: "Crescimento (IA)",
    orquestrador: "Orquestrador",
    mensal: "Mensal",
    operacional: "Operacional",
    plano_crescimento_7d: "Plano 7 dias (IA)",
  };
  return map[t] || t;
}

function formatPeriod(from: string, to: string) {
  const f = new Date(from).toLocaleDateString("pt-BR");
  const t = new Date(to).toLocaleDateString("pt-BR");
  return f === t ? f : `${f} — ${t}`;
}

export default function ReportsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: listRes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ai-reports-list"],
    queryFn: async () => {
      const r = await apiFetch("/api/ai/reports?limit=80");
      const j = await readJsonBody<{ ok?: boolean; error?: string; reports?: ReportRow[] }>(r);
      if (!r.ok) throw new Error(j?.error || r.statusText);
      return j as { ok: boolean; reports: ReportRow[] };
    },
  });

  const reports = listRes?.reports ?? [];

  const { data: detailRes, isFetching: detailLoading } = useQuery({
    queryKey: ["ai-report", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const r = await apiFetch(`/api/ai/reports/${selectedId}`);
      const j = await readJsonBody<{
        ok?: boolean;
        error?: string;
        report?: ReportRow & { content_markdown: string };
      }>(r);
      if (!r.ok) throw new Error(j?.error || r.statusText);
      return j as {
        ok: boolean;
        report: ReportRow & { content_markdown: string };
      };
    },
    enabled: !!selectedId,
  });

  const selectedMeta = useMemo(
    () => reports.find((r) => r.id === selectedId),
    [reports, selectedId]
  );

  const downloadMd = () => {
    const md = detailRes?.report?.content_markdown;
    if (!md || !selectedMeta) return;
    const name = `relatorio-${selectedMeta.report_type}-${selectedMeta.from_date}.md`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Central de Relatórios</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Relatórios gerados pela IA e salvos no histórico da sua conta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus size={18} />
            Resumo no painel
          </Link>
          <Link
            to="/growth-ai"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition-colors"
          >
            Growth IA
          </Link>
          <Link
            to="/orchestrator"
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Cpu size={18} />
            Orquestrador
          </Link>
        </div>
      </div>

      <div className="glass-card p-8 bg-gradient-to-br from-brand-primary/10 to-transparent border-brand-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-xl shadow-brand-primary/20">
            <Cpu size={40} />
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h3 className="text-xl font-bold">Relatório estratégico (Orquestrador)</h3>
            <p className="text-zinc-400 max-w-2xl">
              Plano de crescimento em Markdown, salvo automaticamente após gerar. Use o
              histórico ao lado para reabrir versões anteriores.
            </p>
          </div>
          <Link
            to="/orchestrator"
            className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap"
          >
            Gerar com IA
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <Calendar size={18} className="text-brand-primary" />
              Onde gerar
            </h3>
            <p className="text-xs text-zinc-500">
              Cada ferramenta usa o intervalo de datas do painel (quando aplicável) e grava
              aqui após a geração.
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/dashboard" className="text-brand-primary font-medium hover:underline">
                  Painel
                </Link>
                <span className="text-zinc-500"> — resumo executivo</span>
              </li>
              <li>
                <Link to="/growth-ai" className="text-brand-primary font-medium hover:underline">
                  Growth IA
                </Link>
                <span className="text-zinc-500"> — relatório de crescimento</span>
              </li>
              <li>
                <Link
                  to="/orchestrator"
                  className="text-brand-primary font-medium hover:underline"
                >
                  Orquestrador
                </Link>
                <span className="text-zinc-500"> — plano estratégico 30 dias</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <div className="p-6 border-b border-dashboard-border flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold flex items-center gap-2">
                <History size={18} className="text-zinc-400" />
                Histórico (Supabase)
              </h3>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs font-bold text-zinc-500 hover:text-brand-primary"
              >
                Atualizar lista
              </button>
            </div>
            <div className="divide-y divide-dashboard-border min-h-[120px]">
              {isLoading ? (
                <div className="p-8 flex justify-center text-zinc-500">
                  <Loader2 className="animate-spin" size={28} />
                </div>
              ) : isError ? (
                <div className="p-6 flex items-center gap-2 text-rose-400 text-sm">
                  <AlertCircle size={18} />
                  {(error as Error)?.message || "Erro ao carregar relatórios"}
                </div>
              ) : reports.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  Nenhum relatório salvo ainda. Gere um no Painel, Growth IA ou Orquestrador.
                </div>
              ) : (
                reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    className={`w-full text-left p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors ${
                      selectedId === report.id ? "bg-brand-primary/5 border-l-2 border-brand-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {reportTypeLabel(report.report_type)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            {formatPeriod(report.from_date, report.to_date)}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            • {new Date(report.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold">
                        <CheckCircle2 size={12} />
                        SALVO
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-6 min-h-[280px] border border-dashboard-border">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-4 text-zinc-500">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                  <FileText size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-400">Selecione um relatório</h4>
                  <p className="text-xs text-zinc-600 mt-1 max-w-md">
                    Clique em um item do histórico para ver o Markdown e baixar o arquivo.
                  </p>
                </div>
              </div>
            ) : detailLoading ? (
              <div className="flex justify-center py-16 text-zinc-500">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : detailRes?.report ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashboard-border pb-4">
                  <div>
                    <p className="text-sm font-bold">
                      {reportTypeLabel(detailRes.report.report_type)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatPeriod(detailRes.report.from_date, detailRes.report.to_date)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadMd}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold"
                  >
                    <Download size={18} />
                    Baixar .md
                  </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none max-h-[480px] overflow-y-auto pr-2">
                  <ReactMarkdown>{detailRes.report.content_markdown}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-12">Não foi possível carregar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
