/**
 * Serviço para dados detalhados de um jogo NFL (Game Summary API).
 * Box score, estatísticas por jogador, roster, drives, win probability, linha.
 */

const SUMMARY_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

export interface SummaryBoxScoreTeam {
  team: { id: string; displayName: string; abbreviation: string; logo?: string };
  statistics?: Array<{ name: string; stats?: string[] }>;
}

export interface SummaryBoxScore {
  teams?: SummaryBoxScoreTeam[];
}

export interface SummaryStatAthlete {
  athlete: { id: string; displayName: string; headshot?: string; position?: { abbreviation: string } };
  stats: string[];
}

export interface SummaryStatSplit {
  stat?: string;
  team?: { displayName: string };
  athletes?: SummaryStatAthlete[];
}

export interface SummaryStatCategory {
  name: string;
  label?: string;
  labels?: string[];
  splits?: SummaryStatSplit[];
}

export interface SummaryRosterTeam {
  team?: { id: string; displayName: string; abbreviation: string };
  athletes?: Array<{ id: string; displayName: string; position: string; jersey: string }>;
}

export interface SummaryDrive {
  id: string;
  team?: { displayName: string; abbreviation: string };
  description?: string;
  end?: { type?: { text?: string }; yardLine?: number };
  time?: string;
  result?: string;
  shortDisplayResult?: string;
  plays?: number;
  yards?: number;
}

export interface SummaryWinProbabilityPlay {
  homeWinPercentage?: number;
  awayWinPercentage?: number;
  sequenceNumber?: number;
}

export interface SummaryPickCenterItem {
  spread?: string;
  overUnder?: string;
  homeTeamOdds?: { favorite?: boolean; spread?: string };
  awayTeamOdds?: { favorite?: boolean; spread?: string };
}

export interface EspnGameSummary {
  eventId: string;
  boxscore?: SummaryBoxScore;
  statistics?: SummaryStatCategory[];
  roster?: SummaryRosterTeam[];
  drives?: { previous?: SummaryDrive[] };
  winprobability?: { playByPlay?: SummaryWinProbabilityPlay[] };
  pickcenter?: Array<{ provider?: { name?: string }; odds?: SummaryPickCenterItem[] }>;
}

function parseBoxScore(raw: unknown): SummaryBoxScore | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const box = raw as { teams?: unknown[] };
  if (!Array.isArray(box.teams)) return undefined;
  const teams: SummaryBoxScoreTeam[] = box.teams.map((t: unknown) => {
    const x = t as Record<string, unknown>;
    return {
      team: (x.team as SummaryBoxScoreTeam["team"]) ?? { id: "", displayName: "", abbreviation: "" },
      statistics: Array.isArray(x.statistics)
        ? (x.statistics as SummaryBoxScoreTeam["statistics"])
        : undefined,
    };
  });
  return { teams };
}

function parseStatistics(raw: unknown): SummaryStatCategory[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw as SummaryStatCategory[];
}

function parseRoster(raw: unknown): SummaryRosterTeam[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw as SummaryRosterTeam[];
}

function parseDrives(raw: unknown): SummaryDrive[] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as { previous?: unknown[] };
  return Array.isArray(d.previous) ? (d.previous as SummaryDrive[]) : undefined;
}

function parseWinProbability(raw: unknown): SummaryWinProbabilityPlay[] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const w = raw as { playByPlay?: unknown[] };
  return Array.isArray(w.playByPlay) ? (w.playByPlay as SummaryWinProbabilityPlay[]) : undefined;
}

/**
 * Busca o Game Summary de um jogo (box score, stats, roster, drives, win probability, linha).
 */
export async function fetchGameSummary(eventId: string): Promise<EspnGameSummary> {
  const url = `${SUMMARY_BASE}?event=${encodeURIComponent(eventId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN Game Summary: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;

  return {
    eventId,
    boxscore: parseBoxScore(data.boxscore),
    statistics: parseStatistics(data.statistics),
    roster: parseRoster(data.roster),
    drives: data.drives ? { previous: parseDrives(data.drives) ?? [] } : undefined,
    winprobability: data.winprobability ? { playByPlay: parseWinProbability(data.winprobability) ?? [] } : undefined,
    pickcenter: Array.isArray(data.pickcenter) ? (data.pickcenter as EspnGameSummary["pickcenter"]) : undefined,
  };
}
