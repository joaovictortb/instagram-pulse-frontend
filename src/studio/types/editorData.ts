/**
 * Union de payloads para abrir o PostGenerator a partir da DataPage ou TeamsPage.
 * Usado em App (estado editorData) e passado ao PostGenerator.
 */

import type { Article } from "../services/newsService";
import type { EspnNewsItem } from "../services/espnNews";
import type { SeasonLeaders } from "../services/espnLeaders";
import type { EspnTeamInfo } from "../services/espnTeams";
import type { InjuryEntry } from "../services/espnInjuries";
import type { EspnDraft } from "../services/espnDraft";
import type { QbrWeek } from "../services/espnQbr";
import type { TransactionItem } from "../services/espnTransactions";
import type { EspnFutures } from "../services/espnFutures";
import type { EspnTalentPicks } from "../services/espnTalentPicks";
import type { EspnGame } from "../services/espnScoreboard";
import { ALL_NFL_TEAMS } from "../lib/nfl-teams";

export type EditorData =
  | { type: "espn_news"; items: EspnNewsItem[] }
  | { type: "season_leaders"; season: number; leaders: SeasonLeaders }
  | { type: "injuries"; team: EspnTeamInfo; injuries: InjuryEntry[] }
  | { type: "draft"; season: number; draft: EspnDraft }
  | { type: "qbr_week"; season: number; week: number; qbr: QbrWeek }
  | { type: "transactions"; items: TransactionItem[] }
  | { type: "futures"; season: number; futures: EspnFutures }
  | {
      type: "talent_picks";
      season: number;
      week: number;
      picks: EspnTalentPicks;
    }
  | { type: "next_game"; team: EspnTeamInfo; game: EspnGame };

const emptyArticle: Article = {
  dataSourceIdentifier: "editor-data",
  headline: "",
  description: "",
  published: "",
  categories: [],
  images: [],
};

function teamToArticleTeam(team: EspnTeamInfo): Article["team"] {
  const t = ALL_NFL_TEAMS.find((x) => x.initials === team.abbreviation);
  if (!t) return undefined;
  return {
    name: t.name,
    abbreviation: t.initials,
    logo: t.logo,
    primaryColor: t.primary,
    secondaryColor: t.secondary,
    conference: null,
    division: null,
    city: null,
  };
}

/**
 * Gera artigo sintético para o PostGenerator a partir de editorData.
 */
export function articleFromEditorData(data: EditorData): Article {
  switch (data.type) {
    case "espn_news":
      return {
        ...emptyArticle,
        dataSourceIdentifier: "espn-news",
        headline: "Últimas da NFL",
        description: "Carrossel de notícias ESPN",
        images: data.items[0]?.images?.[0]?.url
          ? [{ url: data.items[0].images[0].url }]
          : [],
      };
    case "season_leaders":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `leaders-${data.season}`,
        headline: `Líderes da temporada ${data.season}`,
        description: "Passing, Rushing, Receiving",
      };
    case "injuries":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `injuries-${data.team.id}`,
        headline: `Report de lesões – ${data.team.displayName}`,
        description: `${data.injuries.length} jogadores`,
        images: data.team.logo ? [{ url: data.team.logo }] : [],
        team: teamToArticleTeam(data.team),
      };
    case "draft":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `draft-${data.season}`,
        headline: `Draft NFL ${data.season}`,
        description: data.draft.rounds.length
          ? `Rodadas: ${data.draft.rounds.length}`
          : "Draft",
      };
    case "qbr_week":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `qbr-${data.season}-${data.week}`,
        headline: `QBR – Semana ${data.week} (${data.season})`,
        description: `${data.qbr.entries.length} quarterbacks`,
      };
    case "transactions":
      return {
        ...emptyArticle,
        dataSourceIdentifier: "transactions",
        headline: "Movimentação da liga",
        description: `${data.items.length} transações`,
      };
    case "futures":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `futures-${data.season}`,
        headline: `Favoritos ao Super Bowl ${data.season}`,
        description: "Odds de apostas",
      };
    case "talent_picks":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `talent-picks-${data.season}-${data.week}`,
        headline: `Picks dos analistas – Semana ${data.week}`,
        description: `${data.picks.picks.length} picks`,
      };
    case "next_game":
      return {
        ...emptyArticle,
        dataSourceIdentifier: `next-game-${data.team.id}-${data.game.id}`,
        headline: `Próximo jogo: ${data.team.displayName}`,
        description: `${data.game.away.team.abbreviation} @ ${data.game.home.team.abbreviation}`,
        published: data.game.date,
        images: data.team.logo ? [{ url: data.team.logo }] : [],
        team: teamToArticleTeam(data.team),
      };
    default:
      return emptyArticle;
  }
}
