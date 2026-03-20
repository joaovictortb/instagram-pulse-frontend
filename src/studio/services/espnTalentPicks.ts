/**
 * Serviço para picks dos analistas (talent picks) por semana.
 * .../seasons/{YEAR}/types/{SEASONTYPE}/weeks/{WEEK}/talentpicks
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface TalentPick {
  id: string;
  talentName?: string;
  eventId?: string;
  pick?: string;
  teamAbbreviation?: string;
  teamId?: string;
  correct?: boolean;
}

export interface EspnTalentPicks {
  season: number;
  seasontype: number;
  week: number;
  picks: TalentPick[];
}

interface CoreRef {
  $ref?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN: ${res.status}`);
  return res.json() as Promise<T>;
}

interface TalentPickItemRaw {
  pick?: {
    person?: { id?: string; displayName?: string };
    competitor?: { $ref?: string };
    correct?: boolean;
  };
}

/**
 * Busca talent picks da semana. A API devolve items com pick inline (person, competitor ref, correct).
 */
export async function fetchTalentPicks(
  season: number,
  seasontype: number,
  week: number
): Promise<EspnTalentPicks> {
  try {
    const url = `${CORE_BASE}/seasons/${season}/types/${seasontype}/weeks/${week}/talentpicks?limit=100&lang=en&region=us`;
    const data = await fetchJson<{ items?: TalentPickItemRaw[] }>(url);
    const items = data.items ?? [];
    const picks: TalentPick[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const p = item.pick;
      if (!p) continue;
      const person = p.person;
      const competitorRef = p.competitor?.$ref ?? "";
      const teamId = competitorRef.split("/").pop()?.split("?")[0] ?? "";
      picks.push({
        id: String(person?.id ?? idx),
        talentName: person?.displayName,
        eventId: undefined,
        pick: undefined,
        teamAbbreviation: undefined,
        teamId: teamId || undefined,
        correct: p.correct,
      });
    }

    return { season, seasontype, week, picks };
  } catch {
    return { season, seasontype, week, picks: [] };
  }
}
