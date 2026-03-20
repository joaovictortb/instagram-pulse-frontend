/**
 * Gera URL otimizada para exibição no hero/carrossel.
 * - Supabase Storage: usa Image Transformation (render/image) com width e quality para carregar mais rápido.
 * - Outras URLs: retorna inalterado.
 */
const SUPABASE_OBJECT_PREFIX = "/storage/v1/object/public/";
const SUPABASE_RENDER_PREFIX = "/storage/v1/render/image/public/";

/** Largura adequada para hero ~600px de altura em 2x (retina). */
const HERO_WIDTH = 1280;
const HERO_QUALITY = 82;

export function getOptimizedHeroImageUrl(originalUrl: string): string {
  if (!originalUrl?.trim()) return originalUrl;
  try {
    const url = originalUrl.trim();
    const idx = url.indexOf(SUPABASE_OBJECT_PREFIX);
    if (idx === -1) return url;
    const base = url.slice(0, idx);
    const path = url.slice(idx + SUPABASE_OBJECT_PREFIX.length);
    if (!path) return url;
    const renderPath = `${base}${SUPABASE_RENDER_PREFIX}${path}`;
    const sep = renderPath.includes("?") ? "&" : "?";
    return `${renderPath}${sep}width=${HERO_WIDTH}&quality=${HERO_QUALITY}`;
  } catch {
    return originalUrl;
  }
}
