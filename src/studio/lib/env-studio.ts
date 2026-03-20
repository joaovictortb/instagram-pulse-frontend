/**
 * Variáveis do Studio: sufixo `_STUDIO` = credenciais/projeto separados do InstaPulse.
 * Ordem: `VITE_*_STUDIO` → `VITE_*`.
 *
 * Chaves usadas no Studio:
 * - VITE_SUPABASE_URL_STUDIO / VITE_SUPABASE_ANON_KEY_STUDIO
 * - VITE_CLOUDINARY_CLOUD_NAME_STUDIO / VITE_CLOUDINARY_UPLOAD_PRESET_STUDIO
 * - VITE_REPLICATE_API_TOKEN_STUDIO
 * - VITE_OPENAI_API_KEY_STUDIO
 * - VITE_NFL_BLOG_URL_STUDIO
 *
 * OpenAI: `vite.config` injeta `VITE_STUDIO_OPENAI_MERGED` a partir de
 * VITE_OPENAI_API_KEY_STUDIO | VITE_OPENAI_API_KEY | OPENAI_API_KEY (raiz).
 */
export function envStudio(primary: string, fallback: string): string {
  const e = import.meta.env as Record<string, string | undefined>;
  const a = String(e[primary] ?? "").trim();
  if (a) return a;
  return String(e[fallback] ?? "").trim();
}

/** Chave OpenAI no browser: VITE_* explícitos, depois merge com OPENAI_API_KEY da raiz. */
export function openAiKeyStudio(): string {
  const e = import.meta.env as Record<string, string | undefined>;
  return (
    String(e.VITE_OPENAI_API_KEY_STUDIO ?? "").trim() ||
    String(e.VITE_OPENAI_API_KEY ?? "").trim() ||
    String(e.VITE_STUDIO_OPENAI_MERGED ?? "").trim()
  );
}
