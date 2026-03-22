/**
 * URL base da API HTTP.
 * - Dev (recomendado): deixe `VITE_API_BASE_URL` vazio → usa caminhos `/api/*`
 *   e o Vite faz proxy para o backend (veja `vite.config.ts`).
 * - Produção / mobile / outro host: `VITE_API_BASE_URL=https://api.seudominio.com`
 */
const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

let getAccessToken: (() => string | null) | null = null;

/** Chamado pelo AuthProvider com o access_token da sessão Supabase. */
export function setApiAuthTokenGetter(fn: () => string | null) {
  getAccessToken = fn;
}

/** Mensagem quando o servidor devolve index.html ou 404 HTML em vez de JSON. */
export const API_HTML_RESPONSE_HINT =
  "Resposta HTML em vez de JSON: em dev precisas da API a correr e do Vite com proxy. Na raiz do repo: `yarn api` (terminal 1) e `yarn dev` (terminal 2). Em `frontend/.env` deixa `VITE_API_BASE_URL` vazio e `VITE_API_PROXY_TARGET` igual à porta da API (ex. http://localhost:3000). Ver docs/DEV-SETUP.md.";

/** Dica extra quando o build de produção ainda chama `/api` no domínio do frontend (Vercel). */
function productionApiHint(): string {
  if (import.meta.env.DEV) return "";
  if (raw) return "";
  return " Em produção (ex.: Vercel) define `VITE_API_BASE_URL` com a URL HTTPS da tua API (Railway, Render, Fly, etc.) — o site estático não tem `/api`.";
}

export function getApiBaseUrl(): string {
  return raw;
}

/** Monta URL absoluta para um path que começa com `/` (ex: `/api/...`). */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!raw) return p;
  return `${raw}${p}`;
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith("http") ? input : apiUrl(input);
  const headers = new Headers(init?.headers);
  const token = getAccessToken?.() ?? null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Conta Instagram ativa (multi-ligação) — evita import circular com o store
  try {
    const raw = localStorage.getItem("instapulse-ig-connection");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: { activeConnectionId?: string | null };
      };
      const cid = parsed?.state?.activeConnectionId;
      if (cid) headers.set("X-Instagram-Connection-Id", cid);
    }
  } catch {
    /* ignore */
  }
  return fetch(url, { ...init, headers });
}

/**
 * Lê o corpo como JSON; se vier HTML (SPA/404), lança mensagem clara em vez de
 * "Unexpected token '<'".
 */
export async function readJsonBody<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    (trimmed.startsWith("<") && !trimmed.startsWith("{") && !trimmed.startsWith("["))
  ) {
    throw new Error(API_HTML_RESPONSE_HINT + productionApiHint());
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Resposta não é JSON válido (HTTP ${res.status}): ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`,
    );
  }
}

/**
 * `fetch` + JSON; se `!res.ok`, lança com `error` do corpo quando existir.
 */
export async function apiFetchJson<T = any>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiFetch(input, init);
  const data = await readJsonBody<T>(res);
  if (!res.ok) {
    const msg = (data as { error?: string })?.error;
    throw new Error(msg || `Erro HTTP ${res.status}`);
  }
  return data;
}
