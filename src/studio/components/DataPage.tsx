import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Instagram,
  Newspaper,
  Trophy,
  FileText,
  RefreshCw,
  TrendingUp,
  Calendar,
  Users,
  Target,
} from "lucide-react";
import { fetchEspnNflNews, type EspnNewsItem } from "../services/espnNews";
import {
  fetchSeasonLeaders,
  type SeasonLeaders,
} from "../services/espnLeaders";
import { fetchDraft, type EspnDraft } from "../services/espnDraft";
import {
  fetchTransactions,
  type TransactionItem,
} from "../services/espnTransactions";
import { fetchFutures, type EspnFutures } from "../services/espnFutures";
import { fetchQbrWeek, type QbrWeek } from "../services/espnQbr";
import {
  fetchTalentPicks,
  type EspnTalentPicks,
} from "../services/espnTalentPicks";
import type { EditorData } from "../types/editorData";
import { cn } from "../lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

type DataTab =
  | "news"
  | "leaders"
  | "draft"
  | "transactions"
  | "futures"
  | "qbr"
  | "talent_picks";

interface DataPageProps {
  onCreatePostWithData: (data: EditorData) => void;
}

export function DataPage({ onCreatePostWithData }: DataPageProps) {
  const [tab, setTab] = useState<DataTab>("news");
  const [season, setSeason] = useState(CURRENT_YEAR);
  const [week, setWeek] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [newsItems, setNewsItems] = useState<EspnNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [leadersData, setLeadersData] = useState<SeasonLeaders | null>(null);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [draftData, setDraftData] = useState<EspnDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [transactionsItems, setTransactionsItems] = useState<TransactionItem[]>(
    [],
  );
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [futuresData, setFuturesData] = useState<EspnFutures | null>(null);
  const [futuresLoading, setFuturesLoading] = useState(false);
  const [qbrData, setQbrData] = useState<QbrWeek | null>(null);
  const [qbrLoading, setQbrLoading] = useState(false);
  const [talentPicksData, setTalentPicksData] =
    useState<EspnTalentPicks | null>(null);
  const [talentPicksLoading, setTalentPicksLoading] = useState(false);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setError(null);
    try {
      const items = await fetchEspnNflNews(30);
      setNewsItems(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar notícias.");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const loadLeaders = useCallback(async () => {
    setLeadersLoading(true);
    setError(null);
    try {
      const data = await fetchSeasonLeaders(season, 2);
      setLeadersData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar líderes.");
    } finally {
      setLeadersLoading(false);
    }
  }, [season]);

  const loadDraft = useCallback(async () => {
    setDraftLoading(true);
    setError(null);
    try {
      const data = await fetchDraft(season);
      setDraftData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar draft.");
    } finally {
      setDraftLoading(false);
    }
  }, [season]);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setError(null);
    try {
      const items = await fetchTransactions(50);
      setTransactionsItems(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar transações.");
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const loadFutures = useCallback(async () => {
    setFuturesLoading(true);
    setError(null);
    try {
      const data = await fetchFutures(season);
      setFuturesData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar futures.");
    } finally {
      setFuturesLoading(false);
    }
  }, [season]);

  const loadQbr = useCallback(async () => {
    setQbrLoading(true);
    setError(null);
    try {
      const data = await fetchQbrWeek(season, 2, week);
      setQbrData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar QBR.");
    } finally {
      setQbrLoading(false);
    }
  }, [season, week]);

  const loadTalentPicks = useCallback(async () => {
    setTalentPicksLoading(true);
    setError(null);
    try {
      const data = await fetchTalentPicks(season, 2, week);
      setTalentPicksData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar picks.");
    } finally {
      setTalentPicksLoading(false);
    }
  }, [season, week]);

  useEffect(() => {
    if (tab === "news") loadNews();
  }, [tab, loadNews]);
  useEffect(() => {
    if (tab === "leaders") loadLeaders();
  }, [tab, loadLeaders]);
  useEffect(() => {
    if (tab === "draft") loadDraft();
  }, [tab, loadDraft]);
  useEffect(() => {
    if (tab === "transactions") loadTransactions();
  }, [tab, loadTransactions]);
  useEffect(() => {
    if (tab === "futures") loadFutures();
  }, [tab, loadFutures]);
  useEffect(() => {
    if (tab === "qbr") loadQbr();
  }, [tab, loadQbr]);
  useEffect(() => {
    if (tab === "talent_picks") loadTalentPicks();
  }, [tab, loadTalentPicks]);

  const tabs: { id: DataTab; label: string; icon: React.ReactNode }[] = [
    { id: "news", label: "Notícias ESPN", icon: <Newspaper size={16} /> },
    { id: "leaders", label: "Líderes", icon: <Trophy size={16} /> },
    { id: "draft", label: "Draft", icon: <FileText size={16} /> },
    { id: "transactions", label: "Transações", icon: <RefreshCw size={16} /> },
    { id: "futures", label: "Futures", icon: <Target size={16} /> },
    { id: "qbr", label: "QBR", icon: <TrendingUp size={16} /> },
    { id: "talent_picks", label: "Talent Picks", icon: <Users size={16} /> },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mb-2">
          Dados ESPN
        </h1>
        <p className="text-white/60 text-sm max-w-2xl">
          Notícias, líderes, draft, transações, futures, QBR e picks dos
          analistas. Escolha uma aba, carregue os dados e crie o post.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold uppercase transition-all flex items-center gap-2",
              tab === t.id
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {tab === "news" && (
        <Section
          title="Notícias ESPN"
          loading={newsLoading}
          onRefresh={loadNews}
          onCreatePost={() =>
            onCreatePostWithData({ type: "espn_news", items: newsItems })
          }
          createLabel="Criar post com notícias"
          disabled={!newsItems.length}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {newsItems.slice(0, 9).map((n) => (
              <div
                key={n.id}
                className="rounded-xl bg-white/5 border border-white/10 p-3 flex gap-3"
              >
                {n.images?.[0]?.url && (
                  <img
                    src={n.images[0].url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm line-clamp-2">
                    {n.headline}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "leaders" && (
        <Section
          title={`Líderes ${season}`}
          loading={leadersLoading}
          onRefresh={loadLeaders}
          onCreatePost={() =>
            leadersData &&
            onCreatePostWithData({
              type: "season_leaders",
              season,
              leaders: leadersData,
            })
          }
          createLabel="Criar post com líderes"
          disabled={!leadersData?.categories?.length}
          extra={
            <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
              Temporada
              <select
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value, 10))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
              >
                {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          {leadersData?.categories?.slice(0, 3).map((c, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 border border-white/10 p-3 mb-3"
            >
              <p className="text-nfl-red font-bold text-xs uppercase mb-2">
                {c.label ?? c.name}
              </p>
              {c.entries?.slice(0, 5).map((e, j) => (
                <p key={j} className="text-white/90 text-sm">
                  {e.rank}. {e.displayName} – {e.displayValue ?? e.value}
                </p>
              ))}
            </div>
          ))}
        </Section>
      )}

      {tab === "draft" && (
        <Section
          title={`Draft ${season}`}
          loading={draftLoading}
          onRefresh={loadDraft}
          onCreatePost={() =>
            draftData &&
            onCreatePostWithData({ type: "draft", season, draft: draftData })
          }
          createLabel="Criar post com draft"
          disabled={!draftData?.rounds?.length}
          extra={
            <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
              Temporada
              <select
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value, 10))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
              >
                {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          {draftData?.rounds?.[0]?.picks?.slice(0, 10).map((p, i) => (
            <p key={i} className="text-white/90 text-sm">
              {p.pick}. {p.teamAbbreviation} – {p.athleteDisplayName ?? "—"}
            </p>
          ))}
        </Section>
      )}

      {tab === "transactions" && (
        <Section
          title="Transações"
          loading={transactionsLoading}
          onRefresh={loadTransactions}
          onCreatePost={() =>
            onCreatePostWithData({
              type: "transactions",
              items: transactionsItems,
            })
          }
          createLabel="Criar post com transações"
          disabled={!transactionsItems.length}
        >
          <div className="space-y-1 max-h-96 overflow-auto">
            {transactionsItems.slice(0, 20).map((t, i) => (
              <p key={t.id || i} className="text-white/90 text-sm">
                {t.athleteName ?? t.description}{" "}
                {t.teamAbbreviation ? `(${t.teamAbbreviation})` : ""}
              </p>
            ))}
          </div>
        </Section>
      )}

      {tab === "futures" && (
        <Section
          title={`Futures ${season}`}
          loading={futuresLoading}
          onRefresh={loadFutures}
          onCreatePost={() =>
            futuresData &&
            onCreatePostWithData({
              type: "futures",
              season,
              futures: futuresData,
            })
          }
          createLabel="Criar post com futures"
          disabled={!futuresData?.items?.length}
          extra={
            <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
              Temporada
              <select
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value, 10))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
              >
                {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          {futuresData?.items?.slice(0, 10).map((f, i) => (
            <p key={f.id || i} className="text-white/90 text-sm">
              {f.name || f.teamAbbreviation} – {f.odds ?? f.value ?? "—"}
            </p>
          ))}
        </Section>
      )}

      {tab === "qbr" && (
        <Section
          title={`QBR Semana ${week}`}
          loading={qbrLoading}
          onRefresh={loadQbr}
          onCreatePost={() =>
            qbrData &&
            onCreatePostWithData({
              type: "qbr_week",
              season,
              week,
              qbr: qbrData,
            })
          }
          createLabel="Criar post com QBR"
          disabled={!qbrData?.entries?.length}
          extra={
            <>
              <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
                Temporada
                <select
                  value={season}
                  onChange={(e) => setSeason(parseInt(e.target.value, 10))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
                Semana
                <select
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value, 10))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {WEEKS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
        >
          {qbrData?.entries?.slice(0, 10).map((e, i) => (
            <p key={e.athleteId || i} className="text-white/90 text-sm">
              {e.rank}. {e.displayName} ({e.teamAbbreviation}) –{" "}
              {e.qbr.toFixed(1)}
            </p>
          ))}
        </Section>
      )}

      {tab === "talent_picks" && (
        <Section
          title={`Talent Picks Semana ${week}`}
          loading={talentPicksLoading}
          onRefresh={loadTalentPicks}
          onCreatePost={() =>
            talentPicksData &&
            onCreatePostWithData({
              type: "talent_picks",
              season,
              week,
              picks: talentPicksData,
            })
          }
          createLabel="Criar post com picks"
          disabled={!talentPicksData?.picks?.length}
          extra={
            <>
              <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
                Temporada
                <select
                  value={season}
                  onChange={(e) => setSeason(parseInt(e.target.value, 10))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {[CURRENT_YEAR, CURRENT_YEAR - 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
                Semana
                <select
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value, 10))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium"
                >
                  {WEEKS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
        >
          {talentPicksData?.picks?.slice(0, 10).map((p, i) => (
            <p key={p.id || i} className="text-white/90 text-sm">
              {p.talentName}: {p.pick ?? p.teamAbbreviation ?? "—"}
            </p>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  loading,
  onRefresh,
  onCreatePost,
  createLabel,
  disabled,
  extra,
  children,
}: {
  title: string;
  loading: boolean;
  onRefresh: () => void;
  onCreatePost: () => void;
  createLabel: string;
  disabled: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white/50">
          {title}
        </h2>
        {extra}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Atualizar
        </button>
        <button
          type="button"
          onClick={onCreatePost}
          disabled={disabled || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nfl-red hover:bg-nfl-red/90 text-white text-sm font-bold disabled:opacity-50"
        >
          <Instagram size={16} />
          {createLabel}
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-3 text-white/60 py-12">
          <Loader2 size={24} className="animate-spin" />
          Carregando…
        </div>
      ) : (
        children
      )}
    </section>
  );
}
