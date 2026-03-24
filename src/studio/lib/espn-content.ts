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
  /** URLs de vídeo (MP4/WebM/MOV) detectadas na API e no HTML do story — para carrossel misto no Instagram. */
  videoUrls: string[];
}

/** URLs diretas de arquivo de vídeo aceitáveis para upload / Instagram. */
const VIDEO_FILE_RE =
  /\.(mp4|webm|mov)(\?|$)/i;

function looksLikeDirectVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u.startsWith("http")) return false;
  if (/\.m3u8(\?|$)/i.test(u)) return false;
  // Inclui paths tipo Cloudinary: .../video/upload/.../arquivo.mp4
  return (
    VIDEO_FILE_RE.test(u) ||
    /\/video\//i.test(u) ||
    /\/video\/upload\//i.test(u)
  );
}

/**
 * Encontra URLs de ficheiro de vídeo em qualquer posição do texto (href, JSON, markdown residual, etc.).
 * Necessário porque o HTML da API nem sempre replica o <video> do blog/Supabase.
 */
function extractDirectVideoUrlsFromRawText(text: string | undefined): string[] {
  if (!text?.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const urlRe =
    /https?:\/\/[^\s"'<>`\]]+?\.(mp4|webm|mov)(?:\?[^\s"'<>`\]]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    let u = m[0].replace(/[),.;]+$/u, "").trim();
    if (!u || seen.has(u)) continue;
    if (!looksLikeDirectVideoUrl(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 10) break;
  }
  return out;
}

function normalizeVideoUrl(url: string): string {
  return url.trim();
}

/** Aceita só ficheiro de vídeo direto (evita páginas tipo /video/clip). */
function isDirectVideoFileUrl(url: string): boolean {
  const u = url.trim();
  if (!u.startsWith("http")) return false;
  if (/\.m3u8(\?|$)/i.test(u)) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || /\/video\/upload\//i.test(u);
}

/**
 * Percorre objetos/array da API ESPN (ex.: headline.video[]) e recolhe hrefs .mp4/.webm/.mov.
 */
function collectDirectVideoUrlsFromJsonTree(
  value: unknown,
  out: string[],
  seen: Set<string>,
  max = 10,
): void {
  if (out.length >= max) return;
  if (value == null) return;
  if (typeof value === "string") {
    const u = value.trim();
    if (!u || seen.has(u)) return;
    if (!isDirectVideoFileUrl(u)) return;
    seen.add(u);
    out.push(u);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectDirectVideoUrlsFromJsonTree(item, out, seen, max);
      if (out.length >= max) return;
    }
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectDirectVideoUrlsFromJsonTree(v, out, seen, max);
      if (out.length >= max) return;
    }
  }
}

function firstDirectVideoUrlInTree(value: unknown): string | null {
  const acc: string[] = [];
  const s = new Set<string>();
  collectDirectVideoUrlsFromJsonTree(value, acc, s, 1);
  return acc[0] ?? null;
}

/**
 * Um clip na API ESPN tem vários .mp4 (360p, 720p, mezzanine…). Escolhe uma URL estável.
 */
function preferredMp4FromEspnVideoBlock(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const links = o.links as Record<string, unknown> | undefined;
  if (!links) return null;
  const source = links.source as Record<string, unknown> | undefined;
  const mezz = source?.mezzanine as { href?: string } | undefined;
  if (typeof mezz?.href === "string" && isDirectVideoFileUrl(mezz.href)) {
    return mezz.href.trim();
  }
  const hd = links.HD as { href?: string } | undefined;
  if (typeof hd?.href === "string" && isDirectVideoFileUrl(hd.href)) {
    return hd.href.trim();
  }
  if (typeof source?.href === "string" && isDirectVideoFileUrl(source.href)) {
    return source.href.trim();
  }
  const mobile = links.mobile as Record<string, unknown> | undefined;
  const mobSrc = mobile?.source as { href?: string } | undefined;
  if (typeof mobSrc?.href === "string" && isDirectVideoFileUrl(mobSrc.href)) {
    return mobSrc.href.trim();
  }
  return null;
}

function pushOneVideoFromEspnBlock(
  v: unknown,
  out: string[],
  seen: Set<string>,
): void {
  const pref =
    preferredMp4FromEspnVideoBlock(v) ?? firstDirectVideoUrlInTree(v);
  if (pref && !seen.has(pref)) {
    seen.add(pref);
    out.push(pref);
  }
}

/**
 * Extrai URLs de vídeo do HTML da matéria (video/source/embed) e de objetos JSON genéricos.
 */
export function extractVideoUrlsFromEspnStory(
  storyHtml: string | undefined,
  record: Record<string, unknown>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined) => {
    const u = normalizeVideoUrl(raw ?? "");
    if (!u || seen.has(u)) return;
    if (!looksLikeDirectVideoUrl(u)) return;
    seen.add(u);
    out.push(u);
  };

  // API ESPN: campo "video" (array) — não "videos". Story usa placeholders <video1>, não <video src>.
  const videoArray = record?.video;
  if (Array.isArray(videoArray)) {
    for (const v of videoArray) {
      if (typeof v === "string") {
        push(v);
      } else {
        pushOneVideoFromEspnBlock(v, out, seen);
      }
      if (out.length >= 10) return out.slice(0, 10);
    }
  } else if (videoArray && typeof videoArray === "object") {
    pushOneVideoFromEspnBlock(videoArray, out, seen);
    if (out.length >= 10) return out.slice(0, 10);
  }

  // API: array "videos" (plural) em alguns endpoints
  const videosField = record?.videos;
  if (Array.isArray(videosField)) {
    for (const v of videosField) {
      if (typeof v === "string") {
        push(v);
        continue;
      }
      if (v && typeof v === "object") {
        pushOneVideoFromEspnBlock(v, out, seen);
        if (out.length >= 10) return out.slice(0, 10);
      }
    }
  }

  const linksField = record?.links;
  if (Array.isArray(linksField)) {
    for (const l of linksField) {
      if (l && typeof l === "object") {
        const o = l as Record<string, unknown>;
        const href = typeof o.href === "string" ? o.href : "";
        if (href && looksLikeDirectVideoUrl(href)) push(href);
      }
    }
  }

  if (storyHtml) {
    const patterns: RegExp[] = [
      /<video[^>]*?\ssrc=["']([^"']+)["']/gi,
      /<source[^>]*?\ssrc=["']([^"']+)["']/gi,
      /<iframe[^>]*?\ssrc=["']([^"']+)["']/gi,
      // href em <a> para .mp4 (fallback de players / “Assistir em nova aba”)
      /<a[^>]*?\shref=["']([^"']+\.(?:mp4|webm|mov)(?:\?[^"']*)?)["']/gi,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(storyHtml)) !== null) {
        push(m[1]);
        if (out.length >= 10) return out.slice(0, 10);
      }
    }

    for (const u of extractDirectVideoUrlsFromRawText(storyHtml)) {
      push(u);
      if (out.length >= 10) return out.slice(0, 10);
    }
  }

  return out.slice(0, 10);
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

  let videoUrls = extractVideoUrlsFromEspnStory(storyHtml, record).filter(
    (u) => !seen.has(u),
  );

  // Fallback: descrição / headline às vezes trazem link mp4 que não está em `story`
  const extraFromMeta = extractDirectVideoUrlsFromRawText(
    `${description ?? ""}\n${headline ?? ""}`,
  );
  const seenVideo = new Set(videoUrls);
  for (const u of extraFromMeta) {
    if (seenVideo.has(u) || seen.has(u)) continue;
    if (videoUrls.length >= 10) break;
    seenVideo.add(u);
    videoUrls.push(u);
  }

  if (import.meta.env.DEV) {
    const videoField = record?.video;
    console.log("[espn-content] fetchEspnArticleContent debug", {
      contentId,
      apiUrl: url,
      storyHtmlLength: storyHtml?.length ?? 0,
      storyHtmlPreview: storyHtml?.slice(0, 400) ?? "(vazio)",
      storyHasVideoPlaceholder: /<video\d+>/i.test(storyHtml ?? ""),
      recordTopKeys: Object.keys(record ?? {}).slice(0, 40),
      hasVideoArray: Array.isArray(videoField),
      videoArrayLength: Array.isArray(videoField) ? videoField.length : 0,
      hasVideosPlural: Array.isArray(record?.videos),
      imagesFromApi: apiImages?.length ?? 0,
      imageUrlsFinalCount: imageUrlsFinal.length,
      videoUrlsCount: videoUrls.length,
      videoUrlsPreview: videoUrls.map((u) => u.slice(0, 120)),
    });
  }

  return {
    headline: headline ?? "",
    description: description ?? "",
    contentMarkdown: contentMarkdown || (description ?? ""),
    imageUrls: imageUrlsFinal,
    videoUrls,
  };
}
