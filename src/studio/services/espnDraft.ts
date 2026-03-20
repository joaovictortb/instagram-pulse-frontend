/**
 * Serviço para draft NFL.
 * sports.core.api.espn.com/.../seasons/{YEAR}/draft
 */

const CORE_BASE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

/** Mapa teamId -> abbreviation para enriquecer picks sem fetch por pick. */
let teamIdToAbbrev: Record<string, string> | null = null;
async function getTeamIdToAbbrev(): Promise<Record<string, string>> {
  if (teamIdToAbbrev) return teamIdToAbbrev;
  try {
    const { fetchNflTeams } = await import("./espnTeams");
    const teams = await fetchNflTeams();
    const map: Record<string, string> = {};
    teams.forEach((t) => {
      map[t.id] = t.abbreviation;
    });
    teamIdToAbbrev = map;
    return map;
  } catch {
    return {};
  }
}

export interface DraftPick {
  round: number;
  pick: number;
  teamId?: string;
  teamAbbreviation?: string;
  teamDisplayName?: string;
  athleteId?: string;
  athleteDisplayName?: string;
  position?: string;
}

export interface DraftRound {
  round: number;
  picks: DraftPick[];
}

export interface EspnDraft {
  season: number;
  rounds: DraftRound[];
}

interface CoreRef {
  $ref?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN: ${res.status}`);
  return res.json() as Promise<T>;
}

interface DraftRoundRaw {
  number?: number;
  displayName?: string;
  picks?: Array<{
    pick?: number;
    overall?: number;
    round?: number;
    athlete?: { $ref?: string };
    team?: { $ref?: string };
  }>;
}

/**
 * Busca draft da temporada. O endpoint /draft devolve rounds.$ref; ao seguir
 * esse ref obtemos items (rodadas) com picks inline (cada pick tem team.$ref, athlete.$ref).
 */
export async function fetchDraft(season: number): Promise<EspnDraft> {
  try {
    const url = `${CORE_BASE}/seasons/${season}/draft?lang=en&region=us`;
    const draftData = await fetchJson<{ rounds?: { $ref?: string } }>(url);
    const roundsRef = draftData.rounds?.$ref;
    if (!roundsRef) return { season, rounds: [] };

    const roundsData = await fetchJson<{ items?: DraftRoundRaw[] }>(roundsRef);
    const roundItems = roundsData.items ?? [];
    const teamMap = await getTeamIdToAbbrev();
    const rounds: DraftRound[] = [];

    for (const roundItem of roundItems.slice(0, 7)) {
      const rawPicks = roundItem.picks ?? [];
      const picks: DraftPick[] = rawPicks.slice(0, 32).map((p) => {
        const teamRef = (p.team as { $ref?: string })?.$ref ?? "";
        const athleteRef = (p.athlete as { $ref?: string })?.$ref ?? "";
        const teamId = teamRef.split("/teams/")[1]?.split("?")[0] ?? "";
        const athleteId =
          athleteRef.split("/athletes/")[1]?.split("?")[0] ?? "";
        return {
          round: roundItem.number ?? 0,
          pick: p.pick ?? p.overall ?? 0,
          teamId: teamId || undefined,
          teamAbbreviation: teamId ? teamMap[teamId] : undefined,
          teamDisplayName: undefined,
          athleteId: athleteId || undefined,
          athleteDisplayName: undefined,
          position: undefined,
        };
      });
      rounds.push({ round: roundItem.number ?? 0, picks });
    }

    return { season, rounds };
  } catch {
    return { season, rounds: [] };
  }
}
