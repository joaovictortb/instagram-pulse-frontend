/**
 * Serviço para previsão do jogo (margem, win%).
 * sports.core.api.espn.com/.../events/{EVENT_ID}/competitions/{EVENT_ID}/predictor
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface GamePredictor {
  eventId: string;
  homeTeamId?: string;
  awayTeamId?: string;
  spread?: number;
  homeWinPercentage?: number;
  awayWinPercentage?: number;
  overUnder?: number;
}

interface CoreRef {
  $ref?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN: ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Busca predictor do jogo (spread, win%, over/under).
 */
export async function fetchGamePredictor(eventId: string): Promise<GamePredictor | null> {
  try {
    const url = `${CORE_BASE}/events/${eventId}/competitions/${eventId}/predictor?lang=en&region=us`;
    const data = await fetchJson<Record<string, unknown>>(url);
    const homeTeamOdds = data.homeTeamOdds as Record<string, unknown> | undefined;
    const awayTeamOdds = data.awayTeamOdds as Record<string, unknown> | undefined;
    const spread = (data.spread as number) ?? (homeTeamOdds?.spread as number);
    const overUnder = data.overUnder as number | undefined;
    const homeWinPct = (data.homeWinPercentage as number) ?? (homeTeamOdds?.winPercentage as number);
    const awayWinPct = (data.awayWinPercentage as number) ?? (awayTeamOdds?.winPercentage as number);

    return {
      eventId,
      homeTeamId: data.homeTeamId as string | undefined,
      awayTeamId: data.awayTeamId as string | undefined,
      spread,
      homeWinPercentage: homeWinPct,
      awayWinPercentage: awayWinPct,
      overUnder,
    };
  } catch {
    return null;
  }
}
