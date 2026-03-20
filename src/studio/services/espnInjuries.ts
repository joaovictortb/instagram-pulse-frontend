/**
 * Serviço para report de lesões por time.
 * sports.core.api.espn.com/.../teams/{TEAM_ID}/injuries
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface InjuryEntry {
  athleteId: string;
  displayName: string;
  position?: string;
  status?: string;
  type?: string;
  date?: string;
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
 * Busca lesões de um time. Retorna array vazio se API falhar ou não houver dados.
 */
export async function fetchTeamInjuries(teamId: string): Promise<InjuryEntry[]> {
  try {
    const url = `${CORE_BASE}/teams/${teamId}/injuries?limit=100&lang=en&region=us`;
    const data = await fetchJson<{ items?: CoreRef[] }>(url);
    const items = data.items ?? [];
    const entries: InjuryEntry[] = [];

    for (const item of items) {
      const ref = item.$ref;
      if (!ref) continue;
      try {
        const inj = await fetchJson<Record<string, unknown>>(ref);
        const athlete = (inj.athlete ?? inj) as Record<string, unknown>;
        const status = (inj.status ?? inj.injuryStatus) as Record<string, unknown> | undefined;
        entries.push({
          athleteId: String(athlete.id ?? inj.id ?? ""),
          displayName: String(athlete.displayName ?? athlete.name ?? "—"),
          position: (athlete.position as string) ?? (inj.position as string),
          status: status ? String(status.name ?? status.type ?? status.abbreviation ?? "") : (inj.status as string),
          type: inj.type as string,
          date: inj.date as string,
        });
      } catch {
        // skip entry
      }
    }

    return entries;
  } catch {
    return [];
  }
}
