/**
 * Dados da notícia no formato esperado pelo gerador de carrossel (OpenAI).
 */
export interface NewsData {
  headline: string;
  description: string;
  content?: string;
  author?: string;
  published: string;
  images: string[];
  url?: string;
  /** Dados opcionais do time, usados para personalizar textos dos slides. */
  teamName?: string;
  teamAbbreviation?: string;
  teamConference?: string;
  teamDivision?: string;
  teamCity?: string;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  /** Categoria/tipo principal da notícia (ex.: trade, injury, recap). */
  category?: string;
  kind?: string;
}

/**
 * Estatística para slide do tipo "stats".
 */
export interface CarouselStat {
  label: string;
  value: string;
}

/**
 * Um slide do carrossel (cover, context, detail, stats, analysis, cta, quote, headline, key_points, comparison).
 */
export interface CarouselSlide {
  id: number;
  type:
    | "cover"
    | "context"
    | "detail"
    | "stats"
    | "analysis"
    | "cta"
    | "quote"
    | "headline"
    | "key_points"
    | "comparison";
  title: string;
  subtitle?: string;
  content?: string;
  stats?: CarouselStat[];
  highlight?: string;
  /** Lista de tópicos para slide tipo "key_points". */
  points?: string[];
  /** URL da imagem de fundo do slide (ou data URL). */
  image?: string;
}

/**
 * Carrossel completo: slides + legenda + hashtags.
 */
export interface CarouselData {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
}

/** Tipo de slide (nome do tipo). */
export type CarouselSlideType = CarouselSlide["type"];

/**
 * Template de carrossel: sequência de tipos de slide que o usuário escolhe antes de gerar.
 */
export interface CarouselTemplate {
  id: string;
  name: string;
  description: string;
  slideTypes: CarouselSlideType[];
}

// ——— Modelo do Guia: narrativa fixa (title → content → image… → cta) + templates visuais ———

/** Tipos de slide da narrativa fixa (gerada a partir do artigo, sem IA). */
export type CarouselSlideKind = "title" | "content" | "image" | "cta";

/** Um slide no formato do guia: capa, fato, visuais ou CTA. */
export interface CarouselSlideItem {
  id: number;
  type: CarouselSlideKind;
  title?: string;
  subtitle?: string;
  content?: string;
  /** URL da imagem (slide type "image"). */
  image?: string;
}

/** Id do template visual (estilo de renderização). */
export type CarouselVisualTemplateId =
  | "editorial"
  | "brutalist"
  | "breaking"
  | "magazine"
  | "social"
  | "stats"
  | "retro"
  | "cyber"
  | "bento"
  | "team_hero"
  | "team_headline"
  | "players_list";

/** Cores dinâmicas aplicadas no container do slide (primaryColor, textColor, secondaryColor). */
export interface CarouselSlideConfig {
  primaryColor: string;
  textColor: string;
  secondaryColor?: string;
  /** Opacidade do overlay escuro sobre a imagem de fundo (0 = sem overlay, 1 = preto total). Valor típico 0.3–0.6. */
  imageOverlayOpacity?: number;
}

/** Tamanho do texto: pequeno, médio ou grande. */
export type CarouselTextSize = "small" | "medium" | "large";

/** Opções de texto do carrossel (título, descrição, limite de linhas). */
export interface CarouselTextOptions {
  /** Tamanho do título nos slides. */
  titleSize?: CarouselTextSize;
  /** Tamanho do texto de descrição/conteúdo. */
  contentSize?: CarouselTextSize;
  /** Número máximo de linhas da descrição (3–15) ou "unlimited" para sem limite. */
  descriptionMaxLines?: number | "unlimited";
}

/** Carrossel no formato do guia: slides gerados do artigo + template visual. */
export interface CarouselDataGuia {
  slides: CarouselSlideItem[];
  caption: string;
  hashtags: string[];
  templateId: CarouselVisualTemplateId;
}
