/**
 * Busca fotos de jogadores NFL via APIs públicas da ESPN (elenco / pesquisa).
 * Depois o front envia a imagem para Cloudinary (uploadRemoteImageUrlToCloudinary).
 */

import { normalizeEspnImageUrl } from "../lib/espn-content";
import { fetchNflTeams, type EspnTeamInfo } from "./espnTeams";

export type PlayerImageCandidate = {
  id: string;
  displayName: string;
  headshotUrl: string;
  teamLabel?: string;
};

function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function headshotFromUnknown(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.startsWith("http")) {
    return normalizeEspnImageUrl(raw);
  }
  if (typeof raw === "object" && raw !== null && "href" in raw) {
    const h = (raw as { href?: string }).href;
    if (typeof h === "string" && h.startsWith("http")) {
      return normalizeEspnImageUrl(h);
    }
  }
  return null;
}

/** Percorre JSON do roster e acha objetos com id + displayName + headshot. */
function collectAthletesFromRosterJson(
  data: unknown,
  teamLabel?: string,
): PlayerImageCandidate[] {
  const map = new Map<string, PlayerImageCandidate>();

  function walk(node: unknown) {
    if (node == null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const o = node as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : "";
    const displayName =
      typeof o.displayName === "string"
        ? o.displayName
        : typeof o.fullName === "string"
          ? o.fullName
          : typeof o.name === "string"
            ? o.name
            : "";
    const url =
      headshotFromUnknown(o.headshot) ?? headshotFromUnknown(o.photo);
    if (id && displayName && url) {
      if (!map.has(id)) {
        map.set(id, {
          id,
          displayName,
          headshotUrl: url,
          teamLabel,
        });
      }
    }
    for (const v of Object.values(o)) walk(v);
  }

  walk(data);
  return [...map.values()];
}

/** Tenta extrair candidatos da resposta da busca comum v3 (estrutura variável). */
function collectFromSearchJson(data: unknown): PlayerImageCandidate[] {
  const map = new Map<string, PlayerImageCandidate>();

  function walk(node: unknown) {
    if (node == null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const o = node as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : "";
    const displayName =
      typeof o.displayName === "string"
        ? o.displayName
        : typeof o.name === "string"
          ? o.name
          : "";
    const url =
      headshotFromUnknown(o.headshot) ??
      headshotFromUnknown(o.image) ??
      headshotFromUnknown((o.athlete as Record<string, unknown> | undefined)?.headshot);
    const typeStr = String(o.type ?? "").toLowerCase();
    const looksPlayer =
      typeStr.includes("player") ||
      typeStr.includes("athlete") ||
      (id && displayName && url);
    if (looksPlayer && id && displayName && url) {
      if (!map.has(id)) {
        map.set(id, { id, displayName, headshotUrl: url });
      }
    }
    for (const v of Object.values(o)) walk(v);
  }

  walk(data);
  return [...map.values()];
}

export function resolveTeamId(
  teams: EspnTeamInfo[],
  userInput: string,
): string | null {
  const q = userInput.trim().toLowerCase();
  if (!q) return null;
  const byAbbrev = teams.find((t) => t.abbreviation.toLowerCase() === q);
  if (byAbbrev?.id) return byAbbrev.id;
  const byName = teams.find(
    (t) =>
      t.displayName.toLowerCase().includes(q) ||
      (t.shortDisplayName?.toLowerCase().includes(q) ?? false) ||
      t.location?.toLowerCase().includes(q),
  );
  return byName?.id ?? null;
}

function matchesPlayerQuery(name: string, query: string): boolean {
  const n = normalizeName(name);
  const q = normalizeName(query);
  if (!q) return false;
  if (n.includes(q)) return true;
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every((p) => n.includes(p));
}

/**
 * Busca imagens de jogador: com **time** (sigla ou nome) usa o elenco ESPN (mais confiável).
 * Sem time, usa a busca comum da ESPN (pode trazer outros esportes — filtre pelo nome).
 */
export async function searchNflPlayerImages(
  playerName: string,
  teamHint?: string,
): Promise<PlayerImageCandidate[]> {
  const q = playerName.trim();
  if (q.length < 2) return [];

  const team = teamHint?.trim();

  if (team) {
    const teams = await fetchNflTeams();
    const teamId = resolveTeamId(teams, team);
    if (!teamId) return [];

    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`,
    );
    if (!res.ok) return [];

    const data = (await res.json()) as unknown;
    const teamInfo = teams.find((t) => t.id === teamId);
    const label =
      teamInfo?.abbreviation ?? teamInfo?.shortDisplayName ?? team;
    const all = collectAthletesFromRosterJson(data, label);
    return all.filter((a) => matchesPlayerQuery(a.displayName, q)).slice(0, 12);
  }

  const res = await fetch(
    `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=20`,
  );
  if (!res.ok) return [];

  const data = (await res.json()) as unknown;
  const raw = collectFromSearchJson(data);
  const nflish = raw.filter(
    (a) => matchesPlayerQuery(a.displayName, q) || normalizeName(a.displayName) === normalizeName(q),
  );
  const list = nflish.length > 0 ? nflish : raw;
  return list.slice(0, 12);
}
