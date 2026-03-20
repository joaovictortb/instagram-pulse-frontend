/**
 * Serviço para QBR da semana (Total QBR).
 * .../seasons/{YEAR}/types/{SEASONTYPE}/weeks/{WEEK}/qbr/10000
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface QbrEntry {
  athleteId: string;
  displayName: string;
  teamId?: string;
  teamAbbreviation?: string;
  qbr: number;
  rank?: number;
}

export interface QbrWeek {
  season: number;
  seasontype: number;
  week: number;
  entries: QbrEntry[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN: ${res.status}`);
  return res.json() as Promise<T>;
}

interface QbrItemRaw {
  athlete?: { $ref?: string };
  team?: { $ref?: string };
  splits?: {
    categories?: Array<{
      stats?: Array<{ name?: string; value?: number; displayValue?: string }>;
    }>;
  };
}

/** Extrai valor QBR do item (splits.categories[].stats onde name inclui qbr). */
function getQbrFromItem(item: QbrItemRaw): number {
  const cats = item.splits?.categories ?? [];
  for (const cat of cats) {
    for (const stat of cat.stats ?? []) {
      const n = (stat.name ?? "").toLowerCase();
      if (n === "qbr" || n === "totalqbr" || n.includes("qbr")) {
        return Number(stat.value ?? stat.displayValue ?? 0);
      }
    }
  }
  return 0;
}

/**
 * Busca QBR da semana (10000 = Total QBR). A API devolve items com athlete/team refs e splits inline.
 */
export async function fetchQbrWeek(
  season: number,
  seasontype: number,
  week: number
): Promise<QbrWeek> {
  try {
    const url = `${CORE_BASE}/seasons/${season}/types/${seasontype}/weeks/${week}/qbr/10000?limit=50&lang=en&region=us`;
    const data = await fetchJson<{ items?: QbrItemRaw[] }>(url);
    const items = data.items ?? [];
    const entries: QbrEntry[] = items.map((it, i) => {
      const athleteRef = it.athlete?.$ref ?? "";
      const teamRef = it.team?.$ref ?? "";
      const athleteId = athleteRef.split("/").pop()?.split("?")[0] ?? "";
      const teamId = teamRef.split("/").pop()?.split("?")[0] ?? "";
      const qbr = getQbrFromItem(it);
      return {
        athleteId,
        displayName: "—",
        teamId: teamId || undefined,
        teamAbbreviation: undefined,
        qbr,
        rank: i + 1,
      };
    });

    return { season, seasontype, week, entries };
  } catch {
    return { season, seasontype, week, entries: [] };
  }
}
