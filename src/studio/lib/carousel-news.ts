import type { Article } from "../services/newsService";
import type { NewsData } from "../types/carousel";

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp|gif)(\?[^\\s"']*)?$/i;

/**
 * Extrai URLs de imagens de um texto (descrição/conteúdo da notícia).
 * Suporta: HTML <img src="...">, Markdown ![alt](url), e URLs soltas (https://...jpg/png/etc).
 */
export function extractImageUrlsFromText(text: string): string[] {
  if (!text?.trim()) return [];

  const urls: string[] = [];

  // HTML: <img src="url"> ou <img src='url'>
  const imgSrcRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgSrcRegex.exec(text)) !== null) {
    const url = m[1]?.trim();
    if (url && isImageUrl(url)) urls.push(url);
  }

  // Markdown: ![alt](url)
  const mdImgRegex = /!\[[^\]]*\]\s*\(\s*([^)\s]+)\s*\)/g;
  while ((m = mdImgRegex.exec(text)) !== null) {
    const url = m[1]?.trim();
    if (url && isImageUrl(url)) urls.push(url);
  }

  // URLs soltas (http/https terminando em extensão de imagem ou com ? antes)
  const looseUrlRegex = /https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|webp|gif)(\?[^\s<>"']*)?/gi;
  while ((m = looseUrlRegex.exec(text)) !== null) {
    const url = m[0]?.trim();
    if (url) urls.push(url);
  }

  return dedupeUrls(urls);
}

function isImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return IMAGE_EXT_REGEX.test(path) || path.includes("/photo/") || path.includes("/image/");
  } catch {
    return false;
  }
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter((u) => {
    const n = u.replace(/#.*$/, "").replace(/\?.*$/, "").toLowerCase();
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

/**
 * Converte um Article (listagem Supabase) para NewsData (formato do gerador de carrossel).
 * Imagens: primeiro as do artigo (article.images), depois as extraídas da descrição e do conteúdo (se existir).
 */
export function articleToNewsData(article: Article): NewsData {
  const fromArticle = (article.images ?? [])
    .map((img) => img.url)
    .filter((url): url is string => Boolean(url?.trim()));

  const description = article.description ?? "";
  const content = (article as Article & { content?: string }).content ?? "";
  const fromText = extractImageUrlsFromText(description + "\n" + content);

  const images = [...fromArticle];
  for (const url of fromText) {
    if (!images.includes(url)) images.push(url);
  }

  const primaryCategory = article.categories?.[0]?.description ?? undefined;
  const kind =
    article.type ??
    (primaryCategory
      ?.toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "") ?? undefined);

  return {
    headline: article.headline ?? "",
    description,
    content: content || description,
    author: article.byline ?? undefined,
    published: article.published ?? "",
    images:
      images.length > 0
        ? images
        : ["https://picsum.photos/seed/nfl/1080/1080"],
    url: article.sourceUrl ?? undefined,
    teamName: article.team?.name ?? undefined,
    teamAbbreviation: article.team?.abbreviation ?? undefined,
    teamConference: article.team?.conference ?? undefined,
    teamDivision: article.team?.division ?? undefined,
    teamCity: article.team?.city ?? undefined,
    teamPrimaryColor: article.team?.primaryColor ?? undefined,
    teamSecondaryColor: article.team?.secondaryColor ?? undefined,
    category: primaryCategory,
    kind,
  };
}
