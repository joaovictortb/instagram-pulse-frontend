/**
 * Geração de arte para Instagram via OpenAI gpt-image-1 + Canvas 2D.
 *
 * Fluxo:
 *  1. gpt-image-1 gera APENAS o background cinematográfico (sem texto).
 *  2. Canvas 2D do browser compõe: gradient + logo + título + descrição.
 *     Quebra de linhas com measureText(); fallback com gradiente maior,
 *     fontes menores e reticências para evitar corte pelo canvas.
 *
 * Chave: VITE_OPENAI_API_KEY_STUDIO, VITE_OPENAI_API_KEY, ou OPENAI_API_KEY (via Vite).
 */

import { openAiKeyStudio } from "./env-studio";
import type { NewsVisualCategory } from "./replicate-epic-image";

const GPT_IMAGE_MODEL = "gpt-image-1";

export function hasGptImageKey(): boolean {
  return Boolean(openAiKeyStudio());
}

export type GptImageAspect = "square" | "portrait" | "landscape";

/** Estilo visual do fundo (prompt em inglês); texto continua sendo só no Canvas. */
export type GptArtVisualStyle =
  | NewsVisualCategory
  | "team_news"
  | "player_spotlight"
  | "league_news";

export interface GenerateGptInstagramPostOptions {
  headline: string;
  /** Passe string vazia para omitir descrição da imagem. */
  description: string;
  sourceImageUrl?: string;
  teamLogoUrl?: string | null;
  teamName?: string | null;
  aspect?: GptImageAspect;
  /** Mood do background gerado pelo modelo (default: general). */
  visualStyle?: GptArtVisualStyle;
}

// ─── dimensões ────────────────────────────────────────────────────────────────

function aspectToSize(aspect: GptImageAspect): string {
  if (aspect === "portrait") return "1024x1536";
  if (aspect === "landscape") return "1536x1024";
  return "1024x1024";
}

function aspectToDimensions(aspect: GptImageAspect): { width: number; height: number } {
  if (aspect === "portrait") return { width: 1024, height: 1536 };
  if (aspect === "landscape") return { width: 1536, height: 1024 };
  return { width: 1024, height: 1024 };
}

// ─── prompt de background (sem texto) ─────────────────────────────────────────

function styleSentenceForBackground(style: GptArtVisualStyle): string {
  const map: Record<GptArtVisualStyle, string> = {
    trade:
      "Mood: NFL blockbuster trade energy — motion blur hints, stadium lights, bold saturated color accents.",
    released:
      "Mood: somber respectful NFL editorial — dramatic shadows, quiet intensity, restrained palette.",
    contract:
      "Mood: major signing celebration — premium gold and team-color accent lighting, subtle confetti glow.",
    draft:
      "Mood: NFL Draft night — podium spotlight beams, hopeful cinematic haze, draft-stage atmosphere.",
    injury:
      "Mood: serious injury update — clean broadcast lighting, subdued respectful tones, clarity.",
    fantasy:
      "Mood: fantasy football energy — neon rim accents, competitive arena glow (no charts or readable graphics).",
    game_recap:
      "Mood: post-game epic — stadium floodlights, grit and motion, victory/defeat tension in lighting only.",
    rumors:
      "Mood: breaking rumor tension — high contrast, mystery spotlight, insider broadcast silhouette.",
    general:
      "Mood: flagship NFL news hero — cinematic stadium lighting, premium ESPN-style editorial depth.",
    team_news:
      "Mood: franchise-focused editorial — locker-room sideline depth, institutional gravitas, team identity in lighting.",
    player_spotlight:
      "Mood: athlete spotlight — heroic rim light and jersey texture emphasis; anonymous silhouette energy (no identifiable faces required).",
    league_news:
      "Mood: league-wide NFL primetime — commanding neutral stadium panorama, polished shield-era broadcast polish.",
  };
  return map[style];
}

function buildBackgroundPrompt(
  teamName: string | null | undefined,
  style: GptArtVisualStyle,
): string {
  return [
    `Create a dramatic, cinematic sports background image for an NFL Instagram post.`,
    `Style: ESPN / NFL Network photography — stadium lighting, motion blur, depth of field, rich colors.`,
    styleSentenceForBackground(style),
    teamName
      ? `Context: ${teamName} NFL team. Use team colors as subtle accent lighting only.`
      : `Context: NFL football. Bold, high-impact sports aesthetic.`,
    `IMPORTANT: Do NOT include any text, captions, typography, watermarks, or logos. Pure cinematic background only.`,
    `Reserve the lower third visually quieter (subtle blur / darker exposure) so headline text can be composited later.`,
  ].join(" ");
}

// ─── fetch de imagem ───────────────────────────────────────────────────────────

async function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas 2D indisponível."));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        URL.revokeObjectURL(objectUrl);
        b ? resolve(b) : reject(new Error("Conversão PNG falhou."));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Falha ao carregar imagem."));
    };
    img.src = objectUrl;
  });
}

async function fetchAsBlob(url: string): Promise<Blob | null> {
  for (const candidate of [url, `https://corsproxy.io/?${encodeURIComponent(url)}`]) {
    try {
      const r = await fetch(candidate, { mode: "cors" });
      if (!r.ok) continue;
      return await convertToPng(await r.blob());
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

// ─── chamadas à API OpenAI ─────────────────────────────────────────────────────

async function callEdits(apiKey: string, prompt: string, newsBlob: Blob, size: string): Promise<string> {
  const form = new FormData();
  form.append("model", GPT_IMAGE_MODEL);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", size);
  form.append("quality", "high");
  form.append("image", new File([newsBlob], "news.png", { type: "image/png" }));

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = "";
    try {
      detail = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /**/
    }
    throw new Error(`OpenAI edits (${res.status})${detail ? ": " + detail : ""}`);
  }
  const data = JSON.parse(text) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = data.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("OpenAI retornou resposta sem imagem.");
}

async function callGenerations(apiKey: string, prompt: string, size: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: GPT_IMAGE_MODEL, prompt, n: 1, size, quality: "high" }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = "";
    try {
      detail = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /**/
    }
    throw new Error(`OpenAI generations (${res.status})${detail ? ": " + detail : ""}`);
  }
  const data = JSON.parse(text) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = data.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("OpenAI retornou resposta sem imagem.");
}

// ─── composição Canvas (background + gradient + logo + texto) ─────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem no canvas."));
    img.src = src;
  });
}

/** Segmenta uma palavra em pedaços que cabem em maxWidth. */
function breakWordToFit(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  if (!word) return [];
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const result: string[] = [];
  let buf = "";
  for (const ch of word) {
    const next = buf + ch;
    if (ctx.measureText(next).width <= maxWidth) {
      buf = next;
    } else {
      if (buf) result.push(buf);
      buf = ch;
      if (ctx.measureText(buf).width > maxWidth) {
        result.push(buf);
        buf = "";
      }
    }
  }
  if (buf) result.push(buf);
  return result;
}

/** Quebra texto em linhas com measureText; tokens largos são fatiados. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const rawWords = text.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const w of rawWords) {
    tokens.push(...breakWordToFit(ctx, w, maxWidth));
  }
  const lines: string[] = [];
  let cur = "";
  for (const t of tokens) {
    const cand = cur ? `${cur} ${t}` : t;
    if (ctx.measureText(cand).width <= maxWidth) cur = cand;
    else {
      if (cur) lines.push(cur);
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function ellipsisLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const t = text.trimEnd();
  if (!t) return "…";
  if (ctx.measureText(t).width <= maxWidth) return t;
  const ell = "…";
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const slice = t.slice(0, mid).trimEnd();
    const cand = slice ? `${slice}${ell}` : ell;
    if (ctx.measureText(cand).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  const slice = t.slice(0, lo).trimEnd();
  return slice ? `${slice}${ell}` : ell;
}

interface TextLayout {
  gradTop: number;
  chosenH: number;
  chosenD: number;
  hLines: string[];
  dLines: string[];
  lineHeadMult: number;
  lineDescMult: number;
}

function computeTextLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  description: string,
  height: number,
  padBottom: number,
  maxW: number,
): TextLayout {
  const accentH = 5;
  const accentGap = 12;
  const gapHD = 14;

  const hSizes = [44, 40, 36, 32, 28, 24, 20, 17, 15, 13, 11];
  const dSizes = [20, 17, 15, 13, 11, 9];
  const gradRatios = [0.3, 0.22, 0.15, 0.1, 0.05];
  const multPairs: [number, number][] = [
    [1.45, 1.5],
    [1.35, 1.4],
    [1.28, 1.32],
    [1.2, 1.22],
  ];

  const upperHeadline = headline.toUpperCase();
  const descTrim = description.trim();

  const descOptions = descTrim ? [true, false] : [false];

  for (const gradRatio of gradRatios) {
    const gradTop = Math.round(height * gradRatio);
    const availContentH = height - gradTop - padBottom - accentH - accentGap;

    for (const [lineHeadMult, lineDescMult] of multPairs) {
      for (const includeDesc of descOptions) {
        const activeDesc = includeDesc ? descTrim : "";

        for (const hPx of hSizes) {
          ctx.font = `900 ${hPx}px 'Arial Black', Arial, sans-serif`;
          const hLinesTry = wrapText(ctx, upperHeadline, maxW);
          const hH = hLinesTry.length * hPx * lineHeadMult;

          if (!activeDesc) {
            if (hH <= availContentH) {
              return {
                gradTop,
                chosenH: hPx,
                chosenD: 0,
                hLines: hLinesTry,
                dLines: [],
                lineHeadMult,
                lineDescMult,
              };
            }
            continue;
          }

          for (const dPx of dSizes) {
            ctx.font = `${dPx}px Arial, sans-serif`;
            const dLinesTry = wrapText(ctx, activeDesc, maxW);
            const dH = dLinesTry.length * dPx * lineDescMult;
            if (hH + gapHD + dH <= availContentH) {
              ctx.font = `900 ${hPx}px 'Arial Black', Arial, sans-serif`;
              const hLinesFinal = wrapText(ctx, upperHeadline, maxW);
              return {
                gradTop,
                chosenH: hPx,
                chosenD: dPx,
                hLines: hLinesFinal,
                dLines: dLinesTry,
                lineHeadMult,
                lineDescMult,
              };
            }
          }
        }
      }
    }
  }

  const gradTop = Math.round(height * 0.05);
  const availContentH = Math.max(height * 0.12, height - gradTop - padBottom - accentH - accentGap);
  const lineHeadMult = 1.18;
  const lineDescMult = 1.2;
  const hPx = 11;
  ctx.font = `900 ${hPx}px 'Arial Black', Arial, sans-serif`;
  let hLines = wrapText(ctx, upperHeadline, maxW);
  const lineH = hPx * lineHeadMult;
  let maxHeadLines = Math.max(1, Math.floor(availContentH / lineH));

  if (hLines.length > maxHeadLines) {
    hLines = hLines.slice(0, maxHeadLines);
    hLines[maxHeadLines - 1] = ellipsisLine(ctx, hLines[maxHeadLines - 1], maxW);
  }

  while (hLines.length * lineH > availContentH && hLines.length > 1) {
    hLines.pop();
    const idx = hLines.length - 1;
    hLines[idx] = ellipsisLine(ctx, hLines[idx], maxW);
  }

  if (hLines.length * lineH > availContentH) {
    let shortened = upperHeadline.replace(/\s+/g, " ").trim();
    while (
      shortened.length > 12 &&
      wrapText(ctx, shortened, maxW).length * lineH > availContentH
    ) {
      shortened = shortened.slice(0, Math.floor(shortened.length * 0.92)).trim();
    }
    const ellOne = ellipsisLine(ctx, shortened, maxW);
    hLines = wrapText(ctx, ellOne, maxW);
    while (hLines.length > maxHeadLines) {
      hLines.pop();
    }
    if (hLines.length > 0) {
      hLines[hLines.length - 1] = ellipsisLine(ctx, hLines[hLines.length - 1], maxW);
    }
  }

  return {
    gradTop,
    chosenH: hPx,
    chosenD: 0,
    hLines,
    dLines: [],
    lineHeadMult,
    lineDescMult,
  };
}

async function compositePost(
  backgroundUrl: string,
  logoBlob: Blob | null,
  headline: string,
  description: string,
  width: number,
  height: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível.");

  const padH = Math.round(width * 0.04);
  const padBottom = Math.round(height * 0.04);
  const maxW = width - padH * 2;

  const bgImg = await loadImage(backgroundUrl);
  ctx.drawImage(bgImg, 0, 0, width, height);

  const layout = computeTextLayout(ctx, headline, description, height, padBottom, maxW);
  const {
    gradTop,
    chosenH,
    chosenD,
    hLines,
    dLines,
    lineHeadMult,
    lineDescMult,
  } = layout;

  const accentH = 5;
  const accentGap = 12;
  const gapHD = 14;

  const grad = ctx.createLinearGradient(0, gradTop, 0, height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.25, "rgba(0,0,0,0.70)");
  grad.addColorStop(1, "rgba(0,0,0,0.93)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, gradTop, width, height - gradTop);

  if (logoBlob) {
    const logoUrl = URL.createObjectURL(logoBlob);
    try {
      const logoImg = await loadImage(logoUrl);
      const logoPx = Math.round(width * 0.08);
      const pad = 20;
      const cx = width - pad - logoPx / 2;
      const cy = pad + logoPx / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, logoPx / 2 + 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.50)";
      ctx.fill();
      ctx.drawImage(logoImg, cx - logoPx / 2, cy - logoPx / 2, logoPx, logoPx);
      ctx.restore();
    } catch {
      /* logo falhou — continua sem */
    }
    URL.revokeObjectURL(logoUrl);
  }

  const totalTextH =
    accentH +
    accentGap +
    hLines.length * chosenH * lineHeadMult +
    (dLines.length > 0 ? gapHD + dLines.length * chosenD * lineDescMult : 0);

  let y = height - padBottom - totalTextH;

  ctx.fillStyle = "#D50A0A";
  ctx.fillRect(padH, y, Math.min(maxW * 0.45, 120), accentH);
  y += accentH + accentGap;

  ctx.font = `900 ${chosenH}px 'Arial Black', Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 6;
  for (const line of hLines) {
    ctx.fillText(line, padH, y);
    y += chosenH * lineHeadMult;
  }

  if (dLines.length > 0 && chosenD > 0) {
    y += gapHD;
    ctx.font = `${chosenD}px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 4;
    for (const line of dLines) {
      ctx.fillText(line, padH, y);
      y += chosenD * lineDescMult;
    }
  }

  ctx.shadowBlur = 0;
  return canvas.toDataURL("image/png");
}

// ─── export principal ──────────────────────────────────────────────────────────

export async function generateInstagramPostWithGpt(
  opts: GenerateGptInstagramPostOptions,
): Promise<string> {
  const apiKey = openAiKeyStudio();
  if (!apiKey) throw new Error("Chave OpenAI não configurada. Defina OPENAI_API_KEY no .env e reinicie o Vite.");

  const {
    headline,
    description,
    sourceImageUrl,
    teamLogoUrl,
    teamName,
    aspect = "square",
    visualStyle = "general",
  } = opts;
  const size = aspectToSize(aspect);
  const { width, height } = aspectToDimensions(aspect);

  const prompt = buildBackgroundPrompt(teamName, visualStyle);

  const newsBlob =
    sourceImageUrl && sourceImageUrl.startsWith("http")
      ? await fetchAsBlob(sourceImageUrl)
      : null;

  const backgroundUrl = newsBlob
    ? await callEdits(apiKey, prompt, newsBlob, size)
    : await callGenerations(apiKey, prompt, size);

  const logoBlob =
    teamLogoUrl && teamLogoUrl.startsWith("http")
      ? await fetchAsBlob(teamLogoUrl).catch(() => null)
      : null;

  return compositePost(backgroundUrl, logoBlob, headline, description, width, height);
}
