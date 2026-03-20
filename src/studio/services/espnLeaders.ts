/**
 * Serviço para líderes da temporada NFL (passing, rushing, receiving).
 * sports.core.api.espn.com/.../seasons/{YEAR}/types/{SEASONTYPE}/leaders
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface LeaderEntry {
  athleteId: string;
  displayName: string;
  teamAbbreviation?: string;
  teamId?: string;
  value: number;
  displayValue?: string;
  rank?: number;
}

export interface LeaderCategory {
  name: string;
  label?: string;
  entries: LeaderEntry[];
}

export interface SeasonLeaders {
  season: number;
  seasontype: number;
  categories: LeaderCategory[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN: ${res.status}`);
  return res.json() as Promise<T>;
}

interface LeaderCatRaw {
  name?: string;
  displayName?: string;
  leaders?: Array<{
    displayValue?: string;
    value?: number;
    athlete?: { $ref?: string };
    team?: { $ref?: string };
  }>;
}

/**
 * Busca líderes da temporada. A API devolve o objeto com categories já no primeiro GET.
 */
export async function fetchSeasonLeaders(
  season: number,
  seasontype: number = 2
): Promise<SeasonLeaders> {
  try {
    const url = `${CORE_BASE}/seasons/${season}/types/${seasontype}/leaders?lang=en&region=us`;
    const data = await fetchJson<{ categories?: LeaderCatRaw[]; $ref?: string }>(url);
    const rawCats = data.categories ?? [];
    const categories: LeaderCategory[] = [];

    for (const cat of rawCats.slice(0, 12)) {
      const leaders = cat.leaders ?? [];
      const entries: LeaderEntry[] = leaders.slice(0, 10).map((l, i) => {
        const athleteRef = (l.athlete as { $ref?: string })?.$ref ?? "";
        const athleteId = athleteRef.split("/").pop()?.split("?")[0] ?? "";
        const teamRef = (l.team as { $ref?: string })?.$ref ?? "";
        const teamId = teamRef.split("/").pop()?.split("?")[0] ?? "";
        return {
          athleteId,
          displayName: "—",
          teamAbbreviation: undefined,
          teamId: teamId || undefined,
          value: Number(l.value ?? 0),
          displayValue: l.displayValue ?? String(l.value ?? ""),
          rank: i + 1,
        };
      });
      if (entries.length > 0) {
        categories.push({
          name: cat.name ?? "",
          label: cat.displayName ?? cat.name ?? "",
          entries,
        });
      }
    }

    return { season, seasontype, categories };
  } catch {
    return { season, seasontype, categories: [] };
  }
}
