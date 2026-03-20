/**
 * Serviço para recap narrativo do jogo.
 * CDN pode devolver página inteira; tentamos extrair texto ou usar site API se existir.
 */

const CDN_RECAP = "https://cdn.espn.com/core/nfl/recap";
const SITE_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

export interface GameRecap {
  gameId: string;
  headline?: string;
  summary?: string;
  body?: string;
}

/**
 * Busca recap do jogo. O summary da site.api às vezes inclui headline/description do evento.
 * CDN recap pode ser HTML; fallback para summary.
 */
export async function fetchGameRecap(gameId: string): Promise<GameRecap | null> {
  try {
    const summaryUrl = `${SITE_SUMMARY}?event=${gameId}`;
    const res = await fetch(summaryUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const header = data.header as Record<string, unknown> | undefined;
    const competitions = (data.competitions as Array<Record<string, unknown>>)?.[0];
    const name = (header?.name as string) ?? (competitions?.name as string) ?? "";
    const comps = (data.competitions as Array<Record<string, unknown>>) ?? [];
    const firstComp = comps[0] as Record<string, unknown> | undefined;
    const competitors = (firstComp?.competitors as Array<Record<string, unknown>>) ?? [];
    const away = competitors.find((c) => (c.homeAway as string) === "away") as Record<string, unknown> | undefined;
    const home = competitors.find((c) => (c.homeAway as string) === "home") as Record<string, unknown> | undefined;
    const awayTeam = (away?.team ?? away) as Record<string, unknown>;
    const homeTeam = (home?.team ?? home) as Record<string, unknown>;
    const awayAbbr = String(awayTeam?.abbreviation ?? "");
    const homeAbbr = String(homeTeam?.abbreviation ?? "");
    const awayScore = away ? String(away.score ?? "") : "";
    const homeScore = home ? String(home.score ?? "") : "";
    const headline = name || `${awayAbbr} @ ${homeAbbr}`;
    const summary =
      (header?.description as string) ??
      (data.headline as string) ??
      (awayScore && homeScore ? `Final: ${awayAbbr} ${awayScore}, ${homeAbbr} ${homeScore}` : "");

    return {
      gameId,
      headline,
      summary: summary || undefined,
      body: (data.recap as string) ?? (data.body as string) ?? undefined,
    };
  } catch {
    return null;
  }
}
