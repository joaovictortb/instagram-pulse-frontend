import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Instagram, Calendar, Table2, Grid3X3 } from "lucide-react";
import {
  fetchScoreboard,
  fetchScoreboardByWeek,
  getFirstHalfScore,
  type EspnGame,
} from "../services/espnScoreboard";
import { fetchStandings, type EspnStandings } from "../services/espnStandings";
import { type ScheduleWeek } from "../services/espnSchedule";
import { cn } from "../lib/utils";

interface GamesPageProps {
  onCreatePost: (game: EspnGame) => void;
  onCreatePostWithStandings?: (standings: EspnStandings) => void;
  onCreatePostWithSchedule?: (schedule: ScheduleWeek) => void;
}

type Tab = "scoreboard" | "by-week" | "standings";

const CURRENT_YEAR = new Date().getFullYear();
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

export function GamesPage({
  onCreatePost,
  onCreatePostWithStandings,
  onCreatePostWithSchedule,
}: GamesPageProps) {
  const [tab, setTab] = useState<Tab>("scoreboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreboardGames, setScoreboardGames] = useState<EspnGame[]>([]);
  const [season, setSeason] = useState(CURRENT_YEAR);
  const [week, setWeek] = useState(1);
  const [weekGames, setWeekGames] = useState<EspnGame[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [standingsData, setStandingsData] = useState<EspnStandings | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsSeason, setStandingsSeason] = useState(CURRENT_YEAR);

  const loadScoreboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { games } = await fetchScoreboard();
      setScoreboardGames(games);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar jogos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    setWeekLoading(true);
    setError(null);
    try {
      const { games } = await fetchScoreboardByWeek(season, week);
      setWeekGames(games);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar semana.");
    } finally {
      setWeekLoading(false);
    }
  }, [season, week]);

  const loadStandings = useCallback(async () => {
    setStandingsLoading(true);
    setError(null);
    try {
      const st = await fetchStandings(standingsSeason, 2);
      setStandingsData(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar tabela.");
    } finally {
      setStandingsLoading(false);
    }
  }, [standingsSeason]);

  useEffect(() => {
    if (tab === "scoreboard") loadScoreboard();
  }, [tab, loadScoreboard]);

  useEffect(() => {
    if (tab === "by-week") loadWeek();
  }, [tab, season, week, loadWeek]);

  useEffect(() => {
    if (tab === "standings") loadStandings();
  }, [tab, loadStandings]);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mb-2">
          Criar post com dados do jogo
        </h1>
        <p className="text-white/60 text-sm max-w-2xl">
          Escolha um jogo abaixo e abra o editor para criar artes de placar, 1º tempo ou líderes (dados ESPN).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setTab("scoreboard")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold uppercase transition-all",
            tab === "scoreboard"
              ? "bg-white text-black"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          Jogos da semana (Scoreboard)
        </button>
        <button
          type="button"
          onClick={() => setTab("by-week")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold uppercase transition-all",
            tab === "by-week"
              ? "bg-white text-black"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          Por semana
        </button>
        <button
          type="button"
          onClick={() => setTab("standings")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold uppercase transition-all",
            tab === "standings"
              ? "bg-white text-black"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          Tabela
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {tab === "scoreboard" && (
        <section>
          <h2 className="text-lg font-bold uppercase tracking-widest text-white/50 mb-4">
            Scoreboard (jogos em destaque / semana atual)
          </h2>
          {loading ? (
            <div className="flex items-center gap-3 text-white/60 py-12">
              <Loader2 size={24} className="animate-spin" />
              Carregando jogos…
            </div>
          ) : scoreboardGames.length === 0 ? (
            <p className="text-white/50 py-8">Nenhum jogo encontrado. Fora da temporada ou sem jogos nesta data.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scoreboardGames.map((game) => (
                <GameCard key={game.id} game={game} onCreatePost={onCreatePost} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "by-week" && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
              Temporada
              <select
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value, 10))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium focus:border-white/50 outline-none"
              >
                {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
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
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium focus:border-white/50 outline-none"
              >
                {WEEKS.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={loadWeek}
              disabled={weekLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold disabled:opacity-50"
            >
              {weekLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Atualizar
            </button>
            {onCreatePostWithSchedule && (
              <button
                type="button"
                onClick={() => {
                  if (weekGames.length === 0) return;
                  onCreatePostWithSchedule({
                    season,
                    week,
                    label: `Week ${week}`,
                    games: weekGames,
                  });
                }}
                disabled={weekGames.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nfl-red hover:bg-nfl-red/90 text-white text-sm font-bold disabled:opacity-50"
              >
                <Grid3X3 size={16} />
                Criar post com grid
              </button>
            )}
          </div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-white/50">
            Jogos – {season} Week {week}
          </h2>
          {weekLoading ? (
            <div className="flex items-center gap-3 text-white/60 py-12">
              <Loader2 size={24} className="animate-spin" />
              Carregando…
            </div>
          ) : weekGames.length === 0 ? (
            <p className="text-white/50 py-8">Nenhum jogo nesta semana.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weekGames.map((game) => (
                <GameCard key={game.id} game={game} onCreatePost={onCreatePost} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "standings" && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase">
              Temporada
              <select
                value={standingsSeason}
                onChange={(e) => setStandingsSeason(parseInt(e.target.value, 10))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-medium focus:border-white/50 outline-none"
              >
                {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={loadStandings}
              disabled={standingsLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold disabled:opacity-50"
            >
              {standingsLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Atualizar
            </button>
            {onCreatePostWithStandings && standingsData && (
              <button
                type="button"
                onClick={() => onCreatePostWithStandings(standingsData)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nfl-red hover:bg-nfl-red/90 text-white text-sm font-bold"
              >
                <Table2 size={16} />
                Criar post com tabela
              </button>
            )}
          </div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-white/50">
            Tabela NFL {standingsSeason}
          </h2>
          {standingsLoading ? (
            <div className="flex items-center gap-3 text-white/60 py-12">
              <Loader2 size={24} className="animate-spin" />
              Carregando tabela…
            </div>
          ) : !standingsData ? (
            <p className="text-white/50 py-8">Selecione a temporada e clique em Atualizar.</p>
          ) : standingsData.conferences.every((c) => c.divisions.length === 0) ? (
            <p className="text-white/50 py-8">A API da ESPN não retornou dados da tabela para esta temporada. Tente outra temporada.</p>
          ) : (
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden p-4 space-y-4">
              {standingsData.conferences.map((conf, i) => (
                <div key={i}>
                  <div className="text-nfl-red font-bold text-sm uppercase mb-2">{conf.name}</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {conf.divisions.map((div, j) => (
                      <div key={j} className="rounded-lg bg-black/30 border border-white/10 p-2">
                        <div className="text-white/70 text-xs font-bold uppercase mb-1.5">{div.name}</div>
                        {div.entries.slice(0, 4).map((e, k) => (
                          <div key={k} className="flex justify-between text-xs text-white/90 py-0.5">
                            <span className="truncate">{e.teamAbbreviation}</span>
                            <span className="tabular-nums">{e.wins}-{e.losses}{e.ties ? `-${e.ties}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-white/60 text-sm">
        <p className="font-bold uppercase tracking-widest text-white/40 mb-2">Dados</p>
        <p>
          Scoreboard e por semana vêm da API pública da ESPN. No editor você pode usar templates como Matchup (jogo A x B),
          Placar do 1º tempo e Líderes do jogo (passing, rushing, receiving).
        </p>
      </div>
    </div>
  );
}

function GameCard({
  game,
  onCreatePost,
}: {
  key?: React.Key;
  game: EspnGame;
  onCreatePost: (game: EspnGame) => void;
}) {
  const firstHalfAway = getFirstHalfScore(game.away);
  const firstHalfHome = getFirstHalfScore(game.home);
  const dateStr = game.date ? new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <article className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 transition-colors">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase">
          <Calendar size={12} />
          {dateStr}
          {game.status && <span className="ml-auto">{game.status}</span>}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={game.away.team.logo}
              alt=""
              className="w-10 h-10 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-white truncate">{game.away.team.abbreviation}</span>
          </div>
          <div className="text-2xl font-black text-white shrink-0 tabular-nums">
            {game.away.score} – {game.home.score}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={game.home.team.logo}
              alt=""
              className="w-10 h-10 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-white truncate">{game.home.team.abbreviation}</span>
          </div>
        </div>
        <div className="text-white/50 text-xs">
          1º tempo: {firstHalfAway} – {firstHalfHome}
          {game.away.records?.[0] && (
            <span className="block mt-1">
              Records: {game.away.team.abbreviation} {game.away.records[0].summary} | {game.home.team.abbreviation} {game.home.records?.[0]?.summary ?? "–"}
            </span>
          )}
        </div>
        {game.leaders?.length ? (
          <div className="text-white/40 text-[10px] uppercase tracking-wide line-clamp-2">
            {game.leaders.slice(0, 3).map((l) => l.leaders?.[0]?.athlete.displayName).filter(Boolean).join(" · ")}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onCreatePost(game)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-nfl-red hover:bg-nfl-red/90 text-white font-bold uppercase text-sm transition-colors"
        >
          <Instagram size={18} />
          Criar post
        </button>
      </div>
    </article>
  );
}
