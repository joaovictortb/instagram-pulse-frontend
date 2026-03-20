/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ex.: `http://localhost:3000` ou `https://api.seudominio.com` — sem barra final. Vazio = proxy `/api`. */
  readonly VITE_API_BASE_URL?: string;
  /** Alvo do proxy do Vite em dev (só servidor de build). */
  readonly VITE_API_PROXY_TARGET?: string;

  /** NFL Studio (`src/studio`) — prioridade: `*_STUDIO`, depois variável sem sufixo. */
  readonly VITE_SUPABASE_URL_STUDIO?: string;
  readonly VITE_SUPABASE_ANON_KEY_STUDIO?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME_STUDIO?: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET_STUDIO?: string;
  readonly VITE_REPLICATE_API_TOKEN_STUDIO?: string;
  readonly VITE_OPENAI_API_KEY_STUDIO?: string;
  /** Injetado em build (vite.config): fallback de OPENAI_API_KEY / VITE_OPENAI_* */
  readonly VITE_STUDIO_OPENAI_MERGED?: string;
  readonly VITE_NFL_BLOG_URL_STUDIO?: string;
  /** Fallback InstaPulse / legado (quando `*_STUDIO` vazio) */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
  readonly VITE_REPLICATE_API_TOKEN?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_NFL_BLOG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
