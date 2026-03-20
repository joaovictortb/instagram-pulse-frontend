/**
 * Busca o conteúdo completo de uma notícia ESPN direto da API (sem depender do blog).
 * Use a URL da matéria ESPN (ex.: .../story/_/id/46649175/...) ou apenas o ID.
 */

function htmlToMarkdownSimple(html: string): string {
  if (!html) return "";
  let out = html
    .replace(/\r?\n/g, " ")
    .replace(/<\/?(em|i)>/gi, "*")
    .replace(/<\/?(strong|b)>/gi, "**")
    .replace(/<\/?h[1-6][^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/?ul[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/**
 * Remove sufixo de tamanho da ESPN (ex: _608x342_16-9) das URLs de foto para carregar a imagem original.
 * De: https://a.espncdn.com/photo/2026/0304/r1623167_608x342_16-9.jpg
 * Para: https://a.espncdn.com/photo/2026/0304/r1623167.jpg
 */
export function normalizeEspnImageUrl(url: string): string {
  if (!url?.trim()) return url;
  return url.replace(/_\d+x\d+_\d+-\d+(\.[a-zA-Z0-9]+)$/i, "$1");
}

export function extractEspnIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const byIdPath = url.match(/\/id\/(\d{6,})/);
  if (byIdPath?.[1]) return byIdPath[1];
  const byPageDash = url.match(/\/page\/[^/]+-(\d{6,})/);
  if (byPageDash?.[1]) return byPageDash[1];
  const byStoryId = url.match(/storyId[=](\d{6,})/);
  if (byStoryId?.[1]) return byStoryId[1];
  const allDigits = url.match(/(\d{7,})/g);
  if (allDigits?.length) return allDigits.sort((a, b) => b.length - a.length)[0];
  return null;
}

export interface FetchedEspnContent {
  headline: string;
  description: string;
  contentMarkdown: string;
  /** URLs de imagens da notícia (campo images da API + opcionalmente do HTML do story). Útil para carrossel no Instagram. */
  imageUrls: string[];
}

/**
 * Busca título, descrição e corpo da notícia na API da ESPN (sem usar o blog).
 * @param espnUrlOrId - URL da matéria ESPN ou só o ID (ex.: 46649175)
 */
export async function fetchEspnArticleContent(
  espnUrlOrId: string
): Promise<FetchedEspnContent> {
  const trimmed = espnUrlOrId.trim();
  const contentId = /^\d{6,}$/.test(trimmed) ? trimmed : extractEspnIdFromUrl(trimmed);
  if (!contentId) {
    throw new Error("URL inválida. Use um link ESPN (ex.: .../id/12345678/...) ou o ID da matéria.");
  }

  const url = `https://content.core.api.espn.com/v1/sports/news/${contentId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ao buscar conteúdo ESPN (${res.status}). Verifique a URL ou se a matéria existe.`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const articleData = (data?.headlines as unknown[])?.[0] ?? data;
  const record = articleData as Record<string, unknown>;

  const headline = record?.headline as string | undefined;
  const description = record?.description as string | undefined;
  const storyHtml = record?.story as string | undefined;

  const contentMarkdown = htmlToMarkdownSimple(storyHtml ?? "");

  // Imagens: primeiro do array "images" da API (header, galeria, etc.)
  const apiImages = record?.images as Array<{ url?: string }> | undefined;
  const imageUrls: string[] = Array.isArray(apiImages)
    ? apiImages
        .map((img) => img?.url)
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map(normalizeEspnImageUrl)
    : [];

  // Opcional: extrair URLs do HTML do story (img src) para notícias com várias fotos
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const seen = new Set<string>(imageUrls);
  if (storyHtml && imageUrls.length < 10) {
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(storyHtml)) !== null) {
      const u = normalizeEspnImageUrl(m[1]);
      if (!seen.has(u) && (m[1].startsWith("http://") || m[1].startsWith("https://"))) {
        seen.add(u);
        imageUrls.push(u);
      }
      if (imageUrls.length >= 10) break;
    }
  }
  const imageUrlsFinal = imageUrls.slice(0, 10);

  return {
    headline: headline ?? "",
    description: description ?? "",
    contentMarkdown: contentMarkdown || (description ?? ""),
    imageUrls: imageUrlsFinal,
  };
}
