/**
 * Serviço para apostas de futuro (Super Bowl, conferência).
 * sports.core.api.espn.com/.../seasons/{YEAR}/futures
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface FuturesItem {
  id: string;
  name: string;
  type?: string;
  teamId?: string;
  teamAbbreviation?: string;
  odds?: string;
  value?: number;
}

export interface EspnFutures {
  season: number;
  items: FuturesItem[];
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
 * Busca futures da temporada (Super Bowl, etc.).
 */
export async function fetchFutures(season: number): Promise<EspnFutures> {
  try {
    const url = `${CORE_BASE}/seasons/${season}/futures?limit=100&lang=en&region=us`;
    const data = await fetchJson<{ items?: CoreRef[] }>(url);
    const items = data.items ?? [];
    const result: FuturesItem[] = [];

    for (const item of items) {
      const ref = item.$ref;
      if (!ref) continue;
      try {
        const f = await fetchJson<Record<string, unknown>>(ref);
        const team = (f.team ?? f.teamReference) as Record<string, unknown> | undefined;
        result.push({
          id: String(f.id ?? ref),
          name: String(f.name ?? f.displayName ?? ""),
          type: f.type as string,
          teamId: team ? String(team.id ?? "") : undefined,
          teamAbbreviation: team ? String(team.abbreviation ?? "") : undefined,
          odds: f.odds as string,
          value: f.value as number,
        });
      } catch {
        // skip
      }
    }

    return { season, items: result };
  } catch {
    return { season, items: [] };
  }
}
