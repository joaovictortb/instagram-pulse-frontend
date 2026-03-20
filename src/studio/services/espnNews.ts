/**
 * Serviço para lista de notícias NFL da ESPN.
 * site.api.espn.com/apis/site/v2/sports/football/nfl/news
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news";

export interface EspnNewsItem {
  id: string;
  headline: string;
  description?: string;
  link: string;
  images?: Array<{ url: string; width?: number; height?: number }>;
  published?: string;
}

interface RawNewsArticle {
  dataSourceIdentifier?: string;
  headline?: string;
  description?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string; width?: number; height?: number }>;
  published?: string;
}

/**
 * Busca notícias NFL da ESPN (manchetes, link, imagem).
 */
export async function fetchEspnNflNews(
  limit: number = 20,
): Promise<EspnNewsItem[]> {
  try {
    const url = `${BASE}?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { articles?: RawNewsArticle[] };
    const articles = data.articles ?? [];
    return articles.map((a, i) => ({
      id: a.dataSourceIdentifier ?? String(i),
      headline: a.headline ?? "",
      description: a.description,
      link: a.links?.web?.href ?? "",
      images: Array.isArray(a.images)
        ? a.images.map((img) => ({
            url: img.url ?? "",
            width: img.width,
            height: img.height,
          }))
        : undefined,
      published: a.published,
    }));
  } catch {
    return [];
  }
}
