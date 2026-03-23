/**
 * Geração de imagem "épica" para posts via Replicate (google/nano-banana-2).
 *
 * Configure VITE_REPLICATE_API_TOKEN_STUDIO ou VITE_REPLICATE_API_TOKEN.
 * Cloudinary: VITE_CLOUDINARY_*_STUDIO ou VITE_CLOUDINARY_*.
 */

import {
  hasCloudinaryConfig,
  uploadImageToCloudinary,
} from "./cloudinary-upload";
import { envStudio, openAiKeyStudio } from "./env-studio";
import { apiFetch } from "@/src/lib/api";

const REPLICATE_API = "https://api.replicate.com/v1";
const MODEL_OWNER = "google";
const MODEL_NAME = "nano-banana-2";

export function hasReplicateToken(): boolean {
  return Boolean(
    envStudio("VITE_REPLICATE_API_TOKEN_STUDIO", "VITE_REPLICATE_API_TOKEN"),
  );
}

function getToken(): string {
  const t = envStudio(
    "VITE_REPLICATE_API_TOKEN_STUDIO",
    "VITE_REPLICATE_API_TOKEN",
  );
  if (!t) {
    throw new Error(
      "Replicate não configurado. Defina VITE_REPLICATE_API_TOKEN_STUDIO (ou VITE_REPLICATE_API_TOKEN) no .env.",
    );
  }
  return t;
}

function replicateErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d[0] && typeof d[0] === "object" && "msg" in d[0]) {
      return String((d[0] as { msg: string }).msg);
    }
  }
  return `Replicate HTTP ${status}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }
  const res = await fetch(url, {
    ...init,
    headers,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta inválida da API Replicate (${res.status}).`);
  }
  if (!res.ok) {
    throw new Error(replicateErrorMessage(data, res.status));
  }
  return data as T;
}

type ReplicateModelResponse = {
  latest_version?: { id: string };
};

type ReplicatePrediction = {
  id: string;
  status: string;
  error?: string | null;
  output?: unknown;
  urls?: { get?: string };
};

async function getLatestVersionId(): Promise<string> {
  const data = await fetchJson<ReplicateModelResponse>(
    `${REPLICATE_API}/models/${MODEL_OWNER}/${MODEL_NAME}`,
  );
  const id = data.latest_version?.id;
  if (!id) {
    throw new Error(
      "Não foi possível obter a versão atual do modelo no Replicate.",
    );
  }
  return id;
}

async function createPrediction(
  version: string,
  input: Record<string, unknown>,
) {
  return fetchJson<ReplicatePrediction>(`${REPLICATE_API}/predictions`, {
    method: "POST",
    body: JSON.stringify({ version, input }),
  });
}

async function getPrediction(id: string): Promise<ReplicatePrediction> {
  return fetchJson<ReplicatePrediction>(`${REPLICATE_API}/predictions/${id}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isReplicateTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const s = msg.toLowerCase();
  return (
    s.includes("e003") ||
    s.includes("high demand") ||
    s.includes("service is currently unavailable") ||
    s.includes("try again later") ||
    s.includes("too many requests") ||
    s.includes("rate limit") ||
    s.includes("429") ||
    s.includes("503") ||
    s.includes("unavailable")
  );
}

async function waitForOutput(
  predictionId: string,
  maxWaitMs = 180000,
): Promise<unknown> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const p = await getPrediction(predictionId);
    if (p.status === "succeeded") return p.output;
    if (p.status === "failed" || p.status === "canceled") {
      throw new Error(p.error || `Predição Replicate: ${p.status}`);
    }
    await sleep(1200);
  }
  throw new Error("Tempo esgotado aguardando a imagem no Replicate.");
}

function normalizeOutputUrl(output: unknown): string {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
  }
  throw new Error("Replicate retornou um formato de saída inesperado.");
}

/** Tenta obter data URL da imagem (CORS permitindo). */
export async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Garante URL HTTPS pública para o Replicate consumir (image_input).
 * Se Cloudinary estiver configurada, faz upload do data URL; senão usa a URL original.
 */
export async function ensurePublicImageUrlForReplicate(
  imageUrl: string,
): Promise<string> {
  const url = imageUrl?.trim();
  if (!url) throw new Error("URL da imagem inválida.");

  // Caso a imagem venha como data URL (ex.: preview em carrossel),
  // enviamos ao Cloudinary para virar URL pública acessível pelo Replicate.
  if (url.startsWith("data:")) {
    if (!hasCloudinaryConfig()) {
      throw new Error(
        "Replicate precisa de uma URL pública. Ao receber data URL, configure Cloudinary (VITE_CLOUDINARY_*_STUDIO ou VITE_CLOUDINARY_*).",
      );
    }
    return uploadImageToCloudinary(url);
  }

  if (!url.startsWith("http")) {
    throw new Error("URL da imagem inválida.");
  }

  if (!hasCloudinaryConfig()) return url;

  // Primeiro tenta converter direto (pode falhar por CORS/hotlink).
  const dataUrl = await fetchUrlAsDataUrl(url);
  if (dataUrl) return uploadImageToCloudinary(dataUrl);

  // Fallback: usa proxy CORS para gerar uma data URL.
  // Isso aumenta a chance do Replicate conseguir buscar a imagem.
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const proxyDataUrl = await fetchUrlAsDataUrl(proxyUrl);
  if (proxyDataUrl) return uploadImageToCloudinary(proxyDataUrl);

  // Se não der pra espelhar, tenta mandar a URL original.
  return url;
}

export type NewsVisualCategory =
  | "trade"
  | "released"
  | "contract"
  | "draft"
  | "injury"
  | "fantasy"
  | "game_recap"
  | "rumors"
  | "general";

export interface EpicPromptResult {
  category: NewsVisualCategory;
  /** Prompt em inglês para o modelo de imagem */
  prompt: string;
}

const PT_KEYWORDS: { keys: string[]; category: NewsVisualCategory }[] = [
  { keys: ["troca", "traded", "trade ", " trocad"], category: "trade" },
  { keys: ["dispens", "released", "waived", "cut "], category: "released" },
  {
    keys: ["contrato", "contract", "extensão", "extension"],
    category: "contract",
  },
  { keys: ["draft", "pick", "rodada"], category: "draft" },
  {
    keys: ["lesão", "injury", "injured", "ir ", " doubtful"],
    category: "injury",
  },
  { keys: ["fantasy", "fantasia", "ppr", "dfs"], category: "fantasy" },
  { keys: ["placar", "final", "highlights", "recap"], category: "game_recap" },
  { keys: ["rumor", "report", "fontes"], category: "rumors" },
];

function heuristicEpicPrompt(
  headline: string,
  contentSnippet: string,
): EpicPromptResult {
  const blob = `${headline}\n${contentSnippet}`.toLowerCase();
  let category: NewsVisualCategory = "general";
  for (const row of PT_KEYWORDS) {
    if (row.keys.some((k) => blob.includes(k))) {
      category = row.category;
      break;
    }
  }

  const styleHints: Record<NewsVisualCategory, string> = {
    trade:
      "NFL blockbuster trade announcement vibe: dynamic split energy, motion blur hints, stadium lights, bold sports graphics style",
    released:
      "somber but respectful NFL editorial: single athlete focus, dramatic shadows, newspaper headline energy",
    contract:
      "celebration of a major NFL contract signing: premium gold and team color accents, confetti hints, victory glow",
    draft:
      "NFL Draft night atmosphere: podium lights, rookie card energy, hopeful cinematic spotlight",
    injury:
      "serious medical report tone: clean broadcast graphic style, subdued palette, clarity and respect",
    fantasy:
      "fantasy football analytics vibe: neon data overlays, charts aesthetic, competitive energy",
    game_recap:
      "post-game epic: stadium floodlights, scoreboard energy, motion and grit",
    rumors:
      "breaking news teaser: high contrast, mystery spotlight, 'insider' broadcast look",
    general:
      "epic NFL news hero image: cinematic stadium lighting, magazine cover quality",
  };

  const prompt = [
    "Using the provided reference photo as the PRIMARY subject, create an epic, high-impact Instagram-ready NFL news image.",
    "CRITICAL: Preserve the real identity of the person(s): same face, body proportions, skin tone, hairstyle, and jersey design from the reference. Do not swap faces or invent a different player.",
    "You may enhance lighting, background, atmosphere, particles, depth of field, and color grading for a premium sports editorial look.",
    styleHints[category],
    `Context (for mood only, do not render this text on the image): ${headline.slice(0, 200)}`,
  ].join(" ");

  return { category, prompt };
}

const OPENAI_EPIC_SYSTEM = `You are an expert at NFL social graphics. The user will give a news headline and content in Portuguese or English.

Respond with ONLY valid JSON (no markdown):
{"category":"trade"|"released"|"contract"|"draft"|"injury"|"fantasy"|"game_recap"|"rumors"|"general","prompt":"..."}

The "prompt" must be in ENGLISH, 3-5 sentences, for an image-to-image model (Nano Banana / Gemini style).
Rules for prompt:
- Reference image is the main subject: MUST keep the same real athlete face, jersey, and body from the photo; no face swap.
- Epic cinematic sports editorial look suitable for Instagram (not cluttered text on image).
- Mention lighting, atmosphere, and composition; team colors may accent the scene if clear from context.
- Do not include URLs or hashtags in the prompt.`;

export async function buildEpicImagePromptWithOpenAI(params: {
  headline: string;
  content: string;
}): Promise<EpicPromptResult> {
  const apiKey = openAiKeyStudio();
  if (!apiKey) {
    return heuristicEpicPrompt(params.headline, params.content);
  }
  const snippet = (params.content || "").trim().slice(0, 4000);
  const user = `Headline: ${params.headline}\n\nContent excerpt:\n${snippet}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: OPENAI_EPIC_SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  const raw = await res.text();
  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return heuristicEpicPrompt(params.headline, params.content);
  }
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const slice =
      jsonStart >= 0 && jsonEnd > jsonStart
        ? text.slice(jsonStart, jsonEnd + 1)
        : text;
    const parsed = JSON.parse(slice) as { category?: string; prompt?: string };
    const cat = parsed.category as NewsVisualCategory;
    const allowed: NewsVisualCategory[] = [
      "trade",
      "released",
      "contract",
      "draft",
      "injury",
      "fantasy",
      "game_recap",
      "rumors",
      "general",
    ];
    if (parsed.prompt && typeof parsed.prompt === "string") {
      return {
        category: allowed.includes(cat) ? cat : "general",
        prompt: parsed.prompt.trim(),
      };
    }
  } catch {
    /* fallthrough */
  }
  return heuristicEpicPrompt(params.headline, params.content);
}

export type ReplicateAspectRatio =
  | "match_input_image"
  | "1:1"
  | "4:5"
  | "9:16"
  | "16:9"
  | "3:4"
  | "4:3";

export interface GenerateEpicNewsImageOptions {
  sourceImageUrl: string;
  headline: string;
  content: string;
  aspectRatio?: ReplicateAspectRatio;
  resolution?: "512px" | "1K" | "2K";
}

/**
 * Espelha a imagem se necessário, monta prompt (OpenAI ou heurística), roda nano-banana-2 e devolve URL da imagem gerada.
 */
export async function generateEpicNewsImageWithReplicate(
  opts: GenerateEpicNewsImageOptions,
): Promise<{
  outputUrl: string;
  category: NewsVisualCategory;
  prompt: string;
}> {
  const { sourceImageUrl, headline, content } = opts;
  const publicUrl = await ensurePublicImageUrlForReplicate(sourceImageUrl);

  const { category, prompt } = await buildEpicImagePromptWithOpenAI({
    headline,
    content,
  });

  const aspect_ratio = opts.aspectRatio ?? "match_input_image";
  const resolution = opts.resolution ?? "1K";

  // Primeiro: tenta proxy (funciona em dev com Vite).
  // Segundo: fallback direto (necessário em produção quando a rota /api não existe).
  // Em caso de pico/rejeição do Replicate (ex.: E003), fazemos retry com backoff.
  const tryProxy = async (): Promise<string | null> => {
    const response = await apiFetch("/api/replicate/nano-banana-2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_input: [publicUrl],
        aspect_ratio,
        resolution,
        output_format: "jpg",
      }),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      const maybeText = await response.text().catch(() => "");
      throw new Error(
        `Falha no proxy /api/replicate/nano-banana-2 (HTTP ${response.status}). ${maybeText}`.trim(),
      );
    }

    const data: { outputUrl?: string; error?: string } = await response
      .json()
      .catch(() => ({}));
    return data.outputUrl ?? null;
  };

  const maxAttempts = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const proxyOutputUrl = await tryProxy();
      if (proxyOutputUrl) {
        return { outputUrl: proxyOutputUrl, category, prompt };
      }

      // Fallback: chama Replicate direto via HTTP.
      // Observação: pode falhar em navegadores por CORS; caso falhe, a rota server-side /api/replicate/nano-banana-2 precisa existir.
      const version = await getLatestVersionId();
      const prediction = await createPrediction(version, {
        prompt,
        image_input: [publicUrl],
        aspect_ratio,
        resolution,
        output_format: "jpg",
      });

      const output = await waitForOutput(prediction.id);
      const outputUrl = normalizeOutputUrl(output);
      return { outputUrl, category, prompt };
    } catch (e) {
      lastErr = e;
      if (attempt >= maxAttempts || !isReplicateTransientError(e)) {
        throw e;
      }

      const backoffMs = 1500 + (attempt - 1) * 1500;
      await sleep(backoffMs);
    }
  }

  // Por garantia (o loop acima sempre retorna ou lança).
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Falha ao gerar imagem no Replicate (erro desconhecido).");
}
