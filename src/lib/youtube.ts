/** Extrai o ID do vídeo a partir de um URL YouTube (watch, shorts, youtu.be). */
export function extractYoutubeVideoId(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (!u.hostname.includes("youtube.com")) return null;
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shorts?.[1]) return shorts[1];
    const embed = u.pathname.match(/\/embed\/([\w-]{11})/);
    if (embed?.[1]) return embed[1];
    return null;
  } catch {
    return null;
  }
}

export function isYoutubeShortsUrl(url: string): boolean {
  try {
    return new URL(url.trim()).pathname.includes("/shorts/");
  } catch {
    return false;
  }
}
