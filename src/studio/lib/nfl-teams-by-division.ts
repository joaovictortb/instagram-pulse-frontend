/**
 * Times da NFL agrupados por conferência e divisão.
 * Logos: ESPN (https://a.espncdn.com/i/teamlogos/nfl/500/xxx.png).
 * Links "Ver perfil": página do time no ESPN.
 */

export interface TeamForPage {
  name: string;
  abbreviation: string;
  primary: string;
  secondary: string;
  logo: string;
  conference: "AFC" | "NFC";
  division: string;
  /** URL da página do time no ESPN. */
  espnUrl: string;
}

/** Slug para URL ESPN: "Buffalo Bills" -> "buffalo-bills" */
function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300/g, "")
    .replace(/\s+/g, "-");
}

/** Abreviação em minúsculo para path ESPN (ex.: wsh para Commanders). */
const ESPN_ABBREV: Record<string, string> = {
  WAS: "wsh",
};
function espnAbbrev(abbreviation: string): string {
  return ESPN_ABBREV[abbreviation] ?? abbreviation.toLowerCase();
}

const DIVISION_ORDER: { conference: "AFC" | "NFC"; division: string; labelPt: string }[] = [
  { conference: "AFC", division: "East", labelPt: "AFC Leste" },
  { conference: "AFC", division: "North", labelPt: "AFC Norte" },
  { conference: "AFC", division: "South", labelPt: "AFC Sul" },
  { conference: "AFC", division: "West", labelPt: "AFC Oeste" },
  { conference: "NFC", division: "East", labelPt: "NFC Leste" },
  { conference: "NFC", division: "North", labelPt: "NFC Norte" },
  { conference: "NFC", division: "South", labelPt: "NFC Sul" },
  { conference: "NFC", division: "West", labelPt: "NFC Oeste" },
];

/** Mapeamento abreviação -> conference, division (ordem igual ao ESPN). */
const TEAM_META: Record<
  string,
  { conference: "AFC" | "NFC"; division: string }
> = {
  BUF: { conference: "AFC", division: "East" },
  MIA: { conference: "AFC", division: "East" },
  NE: { conference: "AFC", division: "East" },
  NYJ: { conference: "AFC", division: "East" },
  CIN: { conference: "AFC", division: "North" },
  CLE: { conference: "AFC", division: "North" },
  PIT: { conference: "AFC", division: "North" },
  BAL: { conference: "AFC", division: "North" },
  HOU: { conference: "AFC", division: "South" },
  IND: { conference: "AFC", division: "South" },
  JAX: { conference: "AFC", division: "South" },
  TEN: { conference: "AFC", division: "South" },
  DEN: { conference: "AFC", division: "West" },
  KC: { conference: "AFC", division: "West" },
  LV: { conference: "AFC", division: "West" },
  LAC: { conference: "AFC", division: "West" },
  DAL: { conference: "NFC", division: "East" },
  NYG: { conference: "NFC", division: "East" },
  PHI: { conference: "NFC", division: "East" },
  WAS: { conference: "NFC", division: "East" },
  CHI: { conference: "NFC", division: "North" },
  DET: { conference: "NFC", division: "North" },
  GB: { conference: "NFC", division: "North" },
  MIN: { conference: "NFC", division: "North" },
  ATL: { conference: "NFC", division: "South" },
  CAR: { conference: "NFC", division: "South" },
  NO: { conference: "NFC", division: "South" },
  TB: { conference: "NFC", division: "South" },
  ARI: { conference: "NFC", division: "West" },
  LAR: { conference: "NFC", division: "West" },
  SF: { conference: "NFC", division: "West" },
  SEA: { conference: "NFC", division: "West" },
};

/** Lista plana de times com nome completo, cores e logo ESPN (mesma ordem que ALL_NFL_TEAMS). */
const TEAMS_FLAT: Omit<TeamForPage, "conference" | "division" | "espnUrl">[] = [
  { name: "Arizona Cardinals", abbreviation: "ARI", primary: "#97233F", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png" },
  { name: "Atlanta Falcons", abbreviation: "ATL", primary: "#A71930", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png" },
  { name: "Baltimore Ravens", abbreviation: "BAL", primary: "#241773", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png" },
  { name: "Buffalo Bills", abbreviation: "BUF", primary: "#00338D", secondary: "#C60C30", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png" },
  { name: "Carolina Panthers", abbreviation: "CAR", primary: "#0085CA", secondary: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png" },
  { name: "Chicago Bears", abbreviation: "CHI", primary: "#0B162A", secondary: "#C83803", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png" },
  { name: "Cincinnati Bengals", abbreviation: "CIN", primary: "#FB4F14", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png" },
  { name: "Cleveland Browns", abbreviation: "CLE", primary: "#311D00", secondary: "#FF3C00", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png" },
  { name: "Dallas Cowboys", abbreviation: "DAL", primary: "#003594", secondary: "#869397", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png" },
  { name: "Denver Broncos", abbreviation: "DEN", primary: "#FB4F14", secondary: "#002244", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png" },
  { name: "Detroit Lions", abbreviation: "DET", primary: "#0076B6", secondary: "#B0B7BC", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png" },
  { name: "Green Bay Packers", abbreviation: "GB", primary: "#203731", secondary: "#FFB612", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png" },
  { name: "Houston Texans", abbreviation: "HOU", primary: "#03202F", secondary: "#A71930", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png" },
  { name: "Indianapolis Colts", abbreviation: "IND", primary: "#002C5F", secondary: "#A2AAAD", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png" },
  { name: "Jacksonville Jaguars", abbreviation: "JAX", primary: "#03202F", secondary: "#D7A22A", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png" },
  { name: "Kansas City Chiefs", abbreviation: "KC", primary: "#E31837", secondary: "#FFB81C", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" },
  { name: "Las Vegas Raiders", abbreviation: "LV", primary: "#000000", secondary: "#A5ACAF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png" },
  { name: "Los Angeles Chargers", abbreviation: "LAC", primary: "#0080C6", secondary: "#FFC20E", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png" },
  { name: "Los Angeles Rams", abbreviation: "LAR", primary: "#003594", secondary: "#FFA300", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png" },
  { name: "Miami Dolphins", abbreviation: "MIA", primary: "#008E97", secondary: "#FC4C02", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png" },
  { name: "Minnesota Vikings", abbreviation: "MIN", primary: "#4F2683", secondary: "#FFC62F", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png" },
  { name: "New England Patriots", abbreviation: "NE", primary: "#002244", secondary: "#C60C30", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png" },
  { name: "New Orleans Saints", abbreviation: "NO", primary: "#D3BC8D", secondary: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png" },
  { name: "New York Giants", abbreviation: "NYG", primary: "#0B2265", secondary: "#A71930", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png" },
  { name: "New York Jets", abbreviation: "NYJ", primary: "#125740", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png" },
  { name: "Philadelphia Eagles", abbreviation: "PHI", primary: "#004C54", secondary: "#A5ACAF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png" },
  { name: "Pittsburgh Steelers", abbreviation: "PIT", primary: "#FFB612", secondary: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png" },
  { name: "San Francisco 49ers", abbreviation: "SF", primary: "#AA0000", secondary: "#B3995D", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png" },
  { name: "Seattle Seahawks", abbreviation: "SEA", primary: "#002244", secondary: "#69BE28", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png" },
  { name: "Tampa Bay Buccaneers", abbreviation: "TB", primary: "#D50A0A", secondary: "#FF7900", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png" },
  { name: "Tennessee Titans", abbreviation: "TEN", primary: "#0C2340", secondary: "#4B92DB", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png" },
  { name: "Washington Commanders", abbreviation: "WAS", primary: "#5A1414", secondary: "#FFB612", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png" },
];

function buildTeam(t: (typeof TEAMS_FLAT)[0]): TeamForPage {
  const meta = TEAM_META[t.abbreviation];
  if (!meta) {
    return {
      ...t,
      conference: "AFC",
      division: "East",
      espnUrl: `https://www.espn.com/nfl/team/_/name/${espnAbbrev(t.abbreviation)}/${slug(t.name)}`,
    };
  }
  return {
    ...t,
    conference: meta.conference,
    division: meta.division,
    espnUrl: `https://www.espn.com/nfl/team/_/name/${espnAbbrev(t.abbreviation)}/${slug(t.name)}`,
  };
}

const ALL_TEAMS: TeamForPage[] = TEAMS_FLAT.map(buildTeam);

export interface DivisionGroup {
  conference: "AFC" | "NFC";
  division: string;
  labelEn: string;
  labelPt: string;
  teams: TeamForPage[];
}

/** Times agrupados por divisão (AFC East, AFC North, ...). */
export function getNflTeamsByDivision(): DivisionGroup[] {
  return DIVISION_ORDER.map(({ conference, division, labelPt }) => {
    const teams = ALL_TEAMS.filter(
      (t) => t.conference === conference && t.division === division
    );
    const labelEn = `${conference} ${division}`;
    return {
      conference,
      division,
      labelEn,
      labelPt,
      teams,
    };
  }).filter((g) => g.teams.length > 0);
}
