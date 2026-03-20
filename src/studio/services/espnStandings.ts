/**
 * Serviço para tabela de classificação NFL (Standings).
 * Usa sports.core.api.espn.com (conferências, divisões, records por time).
 * Fallback: site.api.espn.com (hoje só devolve fullViewLink, sem dados).
 */

const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";
const SITE_STANDINGS_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings";
const SITE_TEAMS_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";

export interface StandingsEntry {
  teamId: string;
  teamAbbreviation: string;
  teamDisplayName: string;
  logo?: string;
  wins: number;
  losses: number;
  ties: number;
  winPct?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  streak?: string;
  divisionRank?: number;
  conferenceRank?: number;
}

export interface StandingsDivision {
  name: string;
  abbreviation?: string;
  entries: StandingsEntry[];
}

export interface StandingsConference {
  name: string;
  divisions: StandingsDivision[];
}

export interface EspnStandings {
  season: number;
  seasontype: number;
  conferences: StandingsConference[];
}

interface CoreGroupRef {
  $ref?: string;
  id?: string;
  name?: string;
  abbreviation?: string;
}

interface CoreGroup {
  id: string;
  name: string;
  abbreviation?: string;
  children?: { $ref: string };
  teams?: { $ref: string };
}

interface CoreTeamsResponse {
  items?: Array<{ $ref: string }>;
}

interface CoreRecordResponse {
  items?: Array<{
    id: string;
    name: string;
    summary?: string;
    displayValue?: string;
    stats?: Array<{ name: string; value?: number; displayValue?: string }>;
  }>;
}

function extractIdFromRef(ref: string): string {
  const match = ref.match(/\/(\d+)(?:\?|$)/);
  return match ? match[1] : "";
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

/**
 * Busca lista de times (site.api) para id -> abbreviation, displayName, logo.
 */
async function fetchTeamsMap(
  _season: number
): Promise<Map<string, { abbreviation: string; displayName: string; logo?: string }>> {
  const data = (await fetchJson(SITE_TEAMS_BASE)) as {
    sports?: Array<{ leagues?: Array<{ teams?: Array<{ team: Record<string, unknown> }> }> }>;
  };
  const map = new Map<string, { abbreviation: string; displayName: string; logo?: string }>();
  const leagues = data.sports?.[0]?.leagues ?? [];
  for (const league of leagues) {
    for (const item of league.teams ?? []) {
      const t = (item.team ?? item) as Record<string, unknown>;
      const id = String(t.id ?? "");
      map.set(id, {
        abbreviation: String(t.abbreviation ?? ""),
        displayName: String(t.displayName ?? t.name ?? t.shortDisplayName ?? ""),
        logo: t.logo as string | undefined,
      });
    }
  }
  return map;
}

/**
 * Busca record (overall) de um time na temporada.
 */
async function fetchTeamRecord(
  season: number,
  seasontype: number,
  teamId: string
): Promise<{ wins: number; losses: number; ties: number; winPct?: number; streak?: string }> {
  const url = `${CORE_BASE}/seasons/${season}/types/${seasontype}/teams/${teamId}/record?lang=en&region=us`;
  const data = await fetchJson<CoreRecordResponse>(url);
  const overall = data.items?.find((i) => i.name === "overall" || i.id === "0");
  if (!overall) {
    return { wins: 0, losses: 0, ties: 0 };
  }
  const stats = (overall as { stats?: Array<{ name: string; value?: number; displayValue?: string }> })
    .stats ?? [];
  const getStat = (name: string) => stats.find((s) => s.name === name);
  const wins = getStat("wins")?.value ?? 0;
  const losses = getStat("losses")?.value ?? 0;
  const ties = getStat("ties")?.value ?? 0;
  const winPct = getStat("winPercent")?.value;
  const streak = getStat("streak")?.displayValue ?? getStat("streak")?.value?.toString();
  return { wins, losses, ties, winPct, streak };
}

/**
 * Busca tabela via sports.core.api.espn.com:
 * - Grupos (AFC=8, NFC=7) → children (divisões) → teams por divisão → record por time.
 */
async function fetchStandingsFromCore(
  season: number,
  seasontype: number
): Promise<EspnStandings> {
  const teamsMap = await fetchTeamsMap(season);

  const groupsRes = await fetchJson<{ items?: CoreGroupRef[] }>(
    `${CORE_BASE}/seasons/${season}/types/${seasontype}/groups?lang=en&region=us`
  );
  const groupRefs = groupsRes.items ?? [];
  if (groupRefs.length < 2) {
    return { season, seasontype, conferences: [] };
  }

  const conferences: StandingsConference[] = [];

  for (const gRef of groupRefs) {
    const ref = gRef.$ref ?? "";
    const groupId = extractIdFromRef(ref);
    if (!groupId) continue;

    const group = await fetchJson<CoreGroup>(ref);
    const confName = group.name ?? gRef.name ?? "Conference";
    const childrenRef = group.children?.$ref;
    if (!childrenRef) {
      conferences.push({ name: confName, divisions: [] });
      continue;
    }

    const childrenRes = await fetchJson<{ items?: CoreGroupRef[] }>(childrenRef);
    const divisionRefs = childrenRes.items ?? [];
    const divisions: StandingsDivision[] = [];

    for (const dRef of divisionRefs) {
      const dUrl = dRef.$ref ?? "";
      const divId = extractIdFromRef(dUrl);
      if (!dUrl) continue;

      const divGroup = await fetchJson<CoreGroup>(dUrl);
      const divName = divGroup.name ?? dRef.name ?? "Division";
      const teamsRef = divGroup.teams?.$ref;
      if (!teamsRef) {
        divisions.push({ name: divName, entries: [] });
        continue;
      }

      const teamsRes = await fetchJson<CoreTeamsResponse>(teamsRef);
      const teamRefs = teamsRes.items ?? [];
      const teamIds = teamRefs.map((t) => extractIdFromRef(t.$ref)).filter(Boolean);

      const entries: StandingsEntry[] = await Promise.all(
        teamIds.map(async (teamId, index) => {
          const info = teamsMap.get(teamId) ?? {
            abbreviation: teamId,
            displayName: `Team ${teamId}`,
          };
          const record = await fetchTeamRecord(season, seasontype, teamId);
          return {
            teamId,
            teamAbbreviation: info.abbreviation,
            teamDisplayName: info.displayName,
            logo: info.logo,
            wins: record.wins,
            losses: record.losses,
            ties: record.ties,
            winPct: record.winPct,
            streak: record.streak,
            divisionRank: index + 1,
          };
        })
      );

      divisions.push({ name: divName, abbreviation: divGroup.abbreviation, entries });
    }

    conferences.push({ name: confName, divisions });
  }

  return { season, seasontype, conferences };
}

function parseStandingsFromSiteApi(data: Record<string, unknown>): EspnStandings | null {
  const children = data.children as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(children)) return null;
  const season = (data.season as number) ?? new Date().getFullYear();
  const seasontype = (data.seasontype as number) ?? 2;
  const conferences: StandingsConference[] = [];

  for (const conf of children) {
    const name = (conf.name as string) ?? "";
    const confChildren = conf.children as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(confChildren)) continue;
    const divisions: StandingsDivision[] = [];
    for (const div of confChildren) {
      const divName = (div.name as string) ?? "";
      const entriesRaw = div.entries ?? div.standings ?? (div as { teams?: unknown[] }).teams;
      const entriesList = Array.isArray(entriesRaw) ? entriesRaw : [];
      const entries: StandingsEntry[] = entriesList.map((e: Record<string, unknown>) => {
        const team = (e.team ?? e) as Record<string, unknown>;
        const stats = (e.stats ?? e) as Record<string, unknown>;
        return {
          teamId: String(team.id ?? e.id ?? ""),
          teamAbbreviation: String(team.abbreviation ?? ""),
          teamDisplayName: String(team.displayName ?? team.name ?? ""),
          logo: team.logo as string | undefined,
          wins: Number(stats.wins ?? e.wins ?? 0),
          losses: Number(stats.losses ?? e.losses ?? 0),
          ties: Number(stats.ties ?? e.ties ?? 0),
          winPct: stats.winPercent != null ? Number(stats.winPercent) : undefined,
          pointsFor: stats.pointsFor != null ? Number(stats.pointsFor) : undefined,
          pointsAgainst: stats.pointsAgainst != null ? Number(stats.pointsAgainst) : undefined,
          streak: (stats.streak ?? e.streak) as string | undefined,
          divisionRank: (e.divisionRank ?? e.rank) != null ? Number(e.divisionRank ?? e.rank) : undefined,
          conferenceRank: (e.conferenceRank ?? e.rank) != null ? Number(e.conferenceRank ?? e.rank) : undefined,
        };
      });
      divisions.push({ name: divName, abbreviation: div.abbreviation as string | undefined, entries });
    }
    conferences.push({ name, divisions });
  }
  return { season, seasontype, conferences };
}

/**
 * Busca a tabela de classificação NFL.
 * Usa sports.core.api.espn.com (sempre que possível).
 * seasontype: 1=preseason, 2=regular, 3=postseason
 */
export async function fetchStandings(
  season: number = new Date().getFullYear(),
  seasontype: number = 2
): Promise<EspnStandings> {
  try {
    return await fetchStandingsFromCore(season, seasontype);
  } catch {
    // Fallback: site.api (muitas vezes só devolve fullViewLink)
    const url = `${SITE_STANDINGS_BASE}?season=${season}&seasontype=${seasontype}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ESPN Standings: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    const parsed = parseStandingsFromSiteApi(data);
    if (parsed) return parsed;
    return {
      season,
      seasontype,
      conferences: [
        { name: "AFC", divisions: [] },
        { name: "NFC", divisions: [] },
      ],
    };
  }
}
