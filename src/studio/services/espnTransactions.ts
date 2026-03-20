/**
 * Serviço para transações da liga (cortes, contratações).
 * sports.core.api.espn.com/.../nfl/transactions
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export interface TransactionItem {
  id: string;
  type?: string;
  description?: string;
  date?: string;
  teamId?: string;
  teamAbbreviation?: string;
  athleteName?: string;
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
 * Busca transações recentes.
 */
export async function fetchTransactions(limit: number = 50): Promise<TransactionItem[]> {
  try {
    const url = `${CORE_BASE}/transactions?limit=${limit}&lang=en&region=us`;
    const data = await fetchJson<{ items?: CoreRef[] }>(url);
    const items = data.items ?? [];
    const result: TransactionItem[] = [];

    for (const item of items.slice(0, limit)) {
      const ref = item.$ref;
      if (!ref) continue;
      try {
        const t = await fetchJson<Record<string, unknown>>(ref);
        const team = (t.team ?? t.teamReference) as Record<string, unknown> | undefined;
        const athlete = (t.athlete ?? t.person) as Record<string, unknown> | undefined;
        result.push({
          id: String(t.id ?? ref),
          type: t.type as string,
          description: (t.description as string) ?? (t.summary as string),
          date: t.date as string,
          teamId: team ? String(team.id ?? "") : undefined,
          teamAbbreviation: team ? String(team.abbreviation ?? "") : undefined,
          athleteName: athlete ? String(athlete.displayName ?? athlete.name ?? "") : undefined,
        });
      } catch {
        // skip
      }
    }

    return result;
  } catch {
    return [];
  }
}
