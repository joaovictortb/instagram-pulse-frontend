/**
 * Garante que a cor em hex tenha o prefixo # (Supabase pode retornar "0b1c3a").
 */
export function ensureHexColor(hex: string | null | undefined, fallback = '#D50A0A'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const trimmed = hex.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export interface TeamBrand {
  primary: string;
  secondary: string;
  logo: string | null;
  name: string;
  /** Iniciais para fallback quando não há logo (ex: "CHI", "KC"). */
  initials: string;
}

const NFL_FALLBACK = { primary: '#D50A0A', secondary: '#FFFFFF', name: 'NFL', initials: 'NFL' };

/**
 * Extrai dados de marca/time do artigo para usar nos templates (logo, cores, nome).
 */
export function getTeamBrand(article: { team?: { primaryColor?: string | null; secondaryColor?: string | null; logo?: string | null; name?: string | null; abbreviation?: string | null } | null; categories?: { description: string }[] }): TeamBrand {
  const team = article.team;
  const primary = ensureHexColor(team?.primaryColor ?? null, NFL_FALLBACK.primary);
  const secondary = ensureHexColor(team?.secondaryColor ?? null, NFL_FALLBACK.secondary);
  const logo = team?.logo ?? null;
  const name = team?.name ?? article.categories?.[0]?.description ?? NFL_FALLBACK.name;
  const initials = team?.abbreviation ?? (name ? name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : NFL_FALLBACK.initials);
  return { primary, secondary, logo, name, initials };
}
