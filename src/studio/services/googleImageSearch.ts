/**
 * Busca imagens (resultados tipo Google Imagens) via SerpAPI no servidor.
 * Chave: `SERPAPI_API_KEY` em `api/.env` — este módulo só chama `/api/google-image-search`.
 */

import { apiFetch, readJsonBody } from "@/src/lib/api";

export type GoogleImageHit = {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  displayLink?: string;
};

export async function searchGoogleImages(
  query: string,
  num: number = 10,
): Promise<GoogleImageHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q });
  params.set("num", String(Math.min(10, Math.max(1, num))));

  const res = await apiFetch(`/api/google-image-search?${params.toString()}`);
  const data = await readJsonBody<{
    ok?: boolean;
    items?: GoogleImageHit[];
    error?: string;
  }>(res);

  if (!res.ok) {
    throw new Error(
      data.error ||
        `Erro ao buscar imagens (${res.status}). Configura SERPAPI_API_KEY na API (SerpAPI).`,
    );
  }

  return Array.isArray(data.items) ? data.items : [];
}
