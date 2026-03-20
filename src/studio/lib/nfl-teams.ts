import type { TeamBrand } from "./teamColors";

/**
 * Lista de todos os times da NFL no formato TeamBrand para uso no select
 * "Time para logo" do PostGenerator (ex.: mostrar logo do Packers quando foi o time que contratou).
 */
export const ALL_NFL_TEAMS: TeamBrand[] = [
  { name: "Arizona Cardinals", initials: "ARI", primary: "#97233F", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png" },
  { name: "Atlanta Falcons", initials: "ATL", primary: "#A71930", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png" },
  { name: "Baltimore Ravens", initials: "BAL", primary: "#241773", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png" },
  { name: "Buffalo Bills", initials: "BUF", primary: "#00338D", secondary: "#C60C30", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png" },
  { name: "Carolina Panthers", initials: "CAR", primary: "#0085CA", secondary: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png" },
  { name: "Chicago Bears", initials: "CHI", primary: "#0B162A", secondary: "#C83803", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png" },
  { name: "Cincinnati Bengals", initials: "CIN", primary: "#FB4F14", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png" },
  { name: "Cleveland Browns", initials: "CLE", primary: "#311D00", secondary: "#FF3C00", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png" },
  { name: "Dallas Cowboys", initials: "DAL", primary: "#003594", secondary: "#869397", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png" },
  { name: "Denver Broncos", initials: "DEN", primary: "#FB4F14", secondary: "#002244", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png" },
  { name: "Detroit Lions", initials: "DET", primary: "#0076B6", secondary: "#B0B7BC", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png" },
  { name: "Green Bay Packers", initials: "GB", primary: "#203731", secondary: "#FFB612", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png" },
  { name: "Houston Texans", initials: "HOU", primary: "#03202F", secondary: "#A71930", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png" },
  { name: "Indianapolis Colts", initials: "IND", primary: "#002C5F", secondary: "#A2AAAD", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png" },
  { name: "Jacksonville Jaguars", initials: "JAX", primary: "#03202F", secondary: "#D7A22A", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png" },
  { name: "Kansas City Chiefs", initials: "KC", primary: "#E31837", secondary: "#FFB81C", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" },
  { name: "Las Vegas Raiders", initials: "LV", primary: "#000000", secondary: "#A5ACAF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png" },
  { name: "Los Angeles Chargers", initials: "LAC", primary: "#0080C6", secondary: "#FFC20E", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png" },
  { name: "Los Angeles Rams", initials: "LAR", primary: "#003594", secondary: "#FFA300", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png" },
  { name: "Miami Dolphins", initials: "MIA", primary: "#008E97", secondary: "#FC4C02", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png" },
  { name: "Minnesota Vikings", initials: "MIN", primary: "#4F2683", secondary: "#FFC62F", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png" },
  { name: "New England Patriots", initials: "NE", primary: "#002244", secondary: "#C60C30", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png" },
  { name: "New Orleans Saints", initials: "NO", primary: "#D3BC8D", secondary: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png" },
  { name: "New York Giants", initials: "NYG", primary: "#0B2265", secondary: "#A71930", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png" },
  { name: "New York Jets", initials: "NYJ", primary: "#125740", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png" },
  { name: "Philadelphia Eagles", initials: "PHI", primary: "#004C54", secondary: "#A5ACAF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png" },
  { name: "Pittsburgh Steelers", initials: "PIT", primary: "#FFB612", secondary: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png" },
  { name: "San Francisco 49ers", initials: "SF", primary: "#AA0000", secondary: "#B3995D", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png" },
  { name: "Seattle Seahawks", initials: "SEA", primary: "#002244", secondary: "#69BE28", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png" },
  { name: "Tampa Bay Buccaneers", initials: "TB", primary: "#D50A0A", secondary: "#FF7900", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png" },
  { name: "Tennessee Titans", initials: "TEN", primary: "#0C2340", secondary: "#4B92DB", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png" },
  { name: "Washington Commanders", initials: "WAS", primary: "#5A1414", secondary: "#FFB612", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png" },
];
