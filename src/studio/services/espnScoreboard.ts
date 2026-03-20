/**
 * Serviço para dados de jogos NFL via ESPN Scoreboard API.
 * Usado na página "Criar post" para listar jogos e abrir o editor com dados reais.
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

export interface EspnTeamInfo {
  id: string;
  displayName: string;
  abbreviation: string;
  logo: string;
  color?: string;
  alternateColor?: string;
}

export interface EspnCompetitor {
  homeAway: "home" | "away";
  team: EspnTeamInfo;
  score: string;
  linescores?: Array<{ displayValue: string; period: number }>;
  records?: Array<{ summary: string; type: string }>;
}

export interface EspnGameLeader {
  displayName: string;
  leaders: Array<{
    displayValue: string;
    athlete: {
      displayName: string;
      headshot?: string;
      position?: { abbreviation: string };
    };
  }>;
}

export interface EspnGame {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: string;
  displayClock?: string;
  venue?: string;
  broadcast?: string;
  away: EspnCompetitor;
  home: EspnCompetitor;
  leaders?: EspnGameLeader[];
}

export interface EspnScoreboardResponse {
  season: { year: number };
  week: { number: number };
  events: Array<{
    id: string;
    name: string;
    shortName: string;
    date: string;
    status?: { type?: { description: string }; displayClock?: string };
    competitions?: Array<{
      competitors?: Array<{
        homeAway: string;
        team: { id: string; displayName: string; abbreviation: string; logo: string; color?: string; alternateColor?: string };
        score: string;
        linescores?: Array<{ displayValue: string; period: number }>;
        records?: Array<{ summary: string; type: string }>;
      }>;
      venue?: { fullName: string };
      broadcast?: string;
      leaders?: EspnGameLeader[];
    }>;
  }>;
}

function parseEvent(ev: EspnScoreboardResponse["events"][0]): EspnGame | null {
  const comp = ev.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const away = competitors.find((c) => c.homeAway === "away");
  const home = competitors.find((c) => c.homeAway === "home");
  if (!away || !home) return null;

  const status = ev.status?.type?.description ?? ev.status?.displayClock ?? "";

  return {
    id: ev.id,
    name: ev.name,
    shortName: ev.shortName ?? `${away.team.abbreviation} @ ${home.team.abbreviation}`,
    date: ev.date,
    status,
    displayClock: ev.status?.displayClock,
    venue: comp?.venue?.fullName,
    broadcast: comp?.broadcast,
    away: {
      homeAway: "away",
      team: {
        id: away.team.id,
        displayName: away.team.displayName,
        abbreviation: away.team.abbreviation,
        logo: away.team.logo,
        color: away.team.color,
        alternateColor: away.team.alternateColor,
      },
      score: away.score,
      linescores: away.linescores,
      records: away.records,
    },
    home: {
      homeAway: "home",
      team: {
        id: home.team.id,
        displayName: home.team.displayName,
        abbreviation: home.team.abbreviation,
        logo: home.team.logo,
        color: home.team.color,
        alternateColor: home.team.alternateColor,
      },
      score: home.score,
      linescores: home.linescores,
      records: home.records,
    },
    leaders: comp?.leaders,
  };
}

/**
 * Retorna o placar do 1º tempo (Q1 + Q2) para um competitor.
 */
export function getFirstHalfScore(comp: EspnCompetitor): string {
  const lines = comp.linescores ?? [];
  const q1 = lines.find((s) => s.period === 1)?.displayValue ?? "0";
  const q2 = lines.find((s) => s.period === 2)?.displayValue ?? "0";
  const n1 = parseInt(q1, 10) || 0;
  const n2 = parseInt(q2, 10) || 0;
  return String(n1 + n2);
}

/**
 * Busca scoreboard (jogos do dia/semana atual).
 */
export async function fetchScoreboard(): Promise<{ season: number; week: number; games: EspnGame[] }> {
  const res = await fetch(`${BASE}/scoreboard`);
  if (!res.ok) throw new Error(`ESPN Scoreboard: ${res.status}`);
  const data = (await res.json()) as EspnScoreboardResponse;
  const games = (data.events ?? []).map(parseEvent).filter((g): g is EspnGame => g != null);
  return {
    season: data.season?.year ?? new Date().getFullYear(),
    week: data.week?.number ?? 0,
    games,
  };
}

/**
 * Busca scoreboard de uma semana específica.
 */
export async function fetchScoreboardByWeek(
  season: number,
  week: number
): Promise<{ season: number; week: number; games: EspnGame[] }> {
  const res = await fetch(`${BASE}/scoreboard?seasons=${season}&week=${week}`);
  if (!res.ok) throw new Error(`ESPN Scoreboard: ${res.status}`);
  const data = (await res.json()) as EspnScoreboardResponse;
  const games = (data.events ?? []).map(parseEvent).filter((g): g is EspnGame => g != null);
  return {
    season: data.season?.year ?? season,
    week: data.week?.number ?? week,
    games,
  };
}

/**
 * Busca um jogo por event id (via summary API). Usado para "Próximo jogo do time".
 */
export async function fetchGameByEventId(eventId: string): Promise<EspnGame | null> {
  try {
    const res = await fetch(`${BASE}/summary?event=${eventId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const header = data.header as Record<string, unknown> | undefined;
    const comps = (data.competitions as Array<Record<string, unknown>>) ?? [];
    const comp = comps[0];
    const competitors = (comp?.competitors as Array<Record<string, unknown>>) ?? [];
    const awayRaw = competitors.find((c) => (c.homeAway as string) === "away");
    const homeRaw = competitors.find((c) => (c.homeAway as string) === "home");
    if (!awayRaw || !homeRaw) return null;

    const mapTeam = (t: Record<string, unknown>) => ({
      id: String(t.id ?? ""),
      displayName: String(t.displayName ?? t.name ?? ""),
      abbreviation: String(t.abbreviation ?? ""),
      logo: String(t.logo ?? "https://a.espncdn.com/i/teamlogos/nfl/500/default.png"),
      color: t.color as string | undefined,
      alternateColor: t.alternateColor as string | undefined,
    });
    const awayTeam = (awayRaw.team ?? awayRaw) as Record<string, unknown>;
    const homeTeam = (homeRaw.team ?? homeRaw) as Record<string, unknown>;
    const hdrStatus = header?.status as
      | { type?: { description?: string }; displayClock?: string }
      | undefined;
    const venue = comp?.venue as { fullName?: string } | undefined;

    return {
      id: (header?.id ?? data.id ?? eventId) as string,
      name: (header?.name ?? data.name ?? "") as string,
      shortName: (header?.shortName ?? "") as string,
      date: (header?.date ?? comp?.date ?? data.date ?? "") as string,
      status: String(hdrStatus?.type?.description ?? comp?.status ?? ""),
      displayClock: hdrStatus?.displayClock,
      venue: venue?.fullName,
      broadcast: comp?.broadcast as string | undefined,
      away: {
        homeAway: "away",
        team: mapTeam(awayTeam),
        score: String(awayRaw.score ?? "0"),
        linescores: awayRaw.linescores as EspnCompetitor["linescores"],
        records: awayRaw.records as EspnCompetitor["records"],
      },
      home: {
        homeAway: "home",
        team: mapTeam(homeTeam),
        score: String(homeRaw.score ?? "0"),
        linescores: homeRaw.linescores as EspnCompetitor["linescores"],
        records: homeRaw.records as EspnCompetitor["records"],
      },
      leaders: comp?.leaders as EspnGame["leaders"],
    };
  } catch {
    return null;
  }
}
