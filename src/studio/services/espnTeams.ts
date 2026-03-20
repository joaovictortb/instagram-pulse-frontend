/**
 * Serviço para dados de times NFL (lista e próximo jogo).
 * Reutiliza scoreboard para "próximo jogo" do time.
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";

export interface EspnTeamInfo {
  id: string;
  displayName: string;
  abbreviation: string;
  shortDisplayName?: string;
  logo?: string;
  color?: string;
  alternateColor?: string;
  location?: string;
}

export interface EspnTeam {
  team: EspnTeamInfo;
  nextEvent?: Array<{ id: string; name: string; date: string }>;
}

function mapTeam(raw: Record<string, unknown>): EspnTeamInfo {
  const t = (raw.team ?? raw) as Record<string, unknown>;
  return {
    id: String(t.id ?? ""),
    displayName: String(t.displayName ?? t.name ?? ""),
    abbreviation: String(t.abbreviation ?? ""),
    shortDisplayName: t.shortDisplayName as string | undefined,
    logo: t.logo as string | undefined,
    color: t.color as string | undefined,
    alternateColor: t.alternateColor as string | undefined,
    location: t.location as string | undefined,
  };
}

/**
 * Busca lista de times da NFL.
 */
export async function fetchNflTeams(): Promise<EspnTeamInfo[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(`ESPN Teams: ${res.status}`);
  const data = (await res.json()) as { sports?: Array<{ leagues?: Array<{ teams?: Array<{ team: Record<string, unknown> }> }> }> };
  const leagues = data.sports?.[0]?.leagues ?? [];
  const teams: EspnTeamInfo[] = [];
  for (const league of leagues) {
    const list = league.teams ?? [];
    for (const item of list) {
      teams.push(mapTeam(item as Record<string, unknown>));
    }
  }
  return teams;
}

/**
 * Busca um time por id (ex.: 17 para Patriots).
 */
export async function fetchTeam(teamId: string): Promise<EspnTeam | null> {
  const url = `${BASE}/${teamId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  const team = data.team as Record<string, unknown> | undefined;
  if (!team) return null;
  const nextEvent = data.nextEvent as Array<{ id: string; name: string; date: string }> | undefined;
  return {
    team: mapTeam(team),
    nextEvent: Array.isArray(nextEvent) ? nextEvent : undefined,
  };
}

/**
 * Resultado de "próximo jogo do time": time + jogo completo (para editor).
 */
export interface NextGameForTeam {
  team: EspnTeamInfo;
  game: import("./espnScoreboard").EspnGame;
}

/**
 * Busca o próximo jogo do time e retorna time + jogo (para template "Próximo jogo do [Time]").
 */
export async function fetchNextGameForTeam(teamId: string): Promise<NextGameForTeam | null> {
  const teamData = await fetchTeam(teamId);
  if (!teamData?.nextEvent?.[0]?.id) return null;
  const eventId = teamData.nextEvent[0].id;
  const { fetchGameByEventId } = await import("./espnScoreboard");
  const game = await fetchGameByEventId(eventId);
  if (!game) return null;
  return { team: teamData.team, game };
}
