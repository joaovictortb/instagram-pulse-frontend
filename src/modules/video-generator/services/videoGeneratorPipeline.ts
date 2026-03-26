import { apiFetchJson } from "@/src/lib/api";
import type { Article } from "../hooks/useNewsList";

/** `creatomate` (predefinição) ou `json2video` — ver `VITE_VIDEO_GEN_ENGINE` no frontend e chave na API. */
export type VideoGenEngine = "creatomate" | "json2video";

/** Predefinição a partir de `VITE_VIDEO_GEN_ENGINE` no frontend. */
export const DEFAULT_VIDEO_GEN_ENGINE: VideoGenEngine =
  (import.meta.env.VITE_VIDEO_GEN_ENGINE as VideoGenEngine) === "json2video"
    ? "json2video"
    : "creatomate";

export type CreatomateStartResponse = {
  ok?: boolean;
  render?: { id: string; status?: string; url?: string | null; snapshot_url?: string | null };
  error?: string;
  /** URLs usadas em cada uma das 5 cenas (após overrides e geração). */
  sceneImageUrls?: string[];
  videoEngine?: VideoGenEngine;
};

export type CreatomateStatusResponse = {
  ok?: boolean;
  render?: {
    id: string;
    status?: string;
    url?: string | null;
    snapshot_url?: string | null;
    error?: string | null;
    progress?: number | null;
  };
  error?: string;
};

/** 5 entradas: URL ou vazio — vazio envia `null` na API (gera imagem automática nessa cena). */
export function buildSceneImageUrlsPayload(
  fields: readonly [string, string, string, string, string],
): (string | null)[] | undefined {
  const trimmed = fields.map((s) => s.trim()) as [string, string, string, string, string];
  if (trimmed.every((s) => !s)) return undefined;
  return trimmed.map((s) => (s ? s : null));
}

/** Pedido longo: imagens + TTS + Creatomate no mesmo POST — o browser precisa de `signal` + timeout. */
export async function creatomateStartRenderFromArticle(
  article: Article,
  options?: {
    totalDurationSeconds?: number;
    signal?: AbortSignal;
    sceneImageUrls?: (string | null)[];
  },
): Promise<CreatomateStartResponse> {
  const payload: Record<string, unknown> = {
    headline: article.headline,
    description: article.description ?? "",
    image: article.images?.[0]?.url ?? null,
    sourceId: article.dataSourceIdentifier,
    totalDurationSeconds: options?.totalDurationSeconds ?? 18,
  };
  const urls = options?.sceneImageUrls;
  if (urls && urls.length === 5) {
    payload.sceneImageUrls = urls;
  }
  const path =
    DEFAULT_VIDEO_GEN_ENGINE === "json2video"
      ? "/api/video-generator/json2video/render-from-article"
      : "/api/video-generator/creatomate/render-from-article";
  return apiFetchJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });
}

export async function creatomateGetRenderStatus(
  id: string,
  engine: VideoGenEngine = DEFAULT_VIDEO_GEN_ENGINE,
): Promise<CreatomateStatusResponse> {
  const path =
    engine === "json2video"
      ? `/api/video-generator/json2video/movies/${encodeURIComponent(id)}`
      : `/api/video-generator/creatomate/renders/${encodeURIComponent(id)}`;
  return apiFetchJson(path);
}
