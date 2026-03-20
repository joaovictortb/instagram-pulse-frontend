/**
 * Reescreve o conteúdo da notícia como legenda para Instagram usando OpenAI
 * direto do frontend (sem depender do endpoint do blog).
 *
 * Chave: VITE_OPENAI_API_KEY_STUDIO, VITE_OPENAI_API_KEY, ou OPENAI_API_KEY na raiz (via Vite).
 * Atenção: a chave fica exposta no bundle do cliente; use em ambiente controlado.
 */

import { openAiKeyStudio } from "./env-studio";

const MAX_CAPTION_LENGTH = 2200;

const SYSTEM_PROMPT = `Você gera UMA legenda COMPLETA e DETALHADA para um post de NFL no Instagram, em português do Brasil.

IMPORTANTE: Gere legendas LONGAS e ricas em conteúdo. Use entre 1200 e 2200 caracteres (aproveite o espaço). Não seja breve.

Estrutura obrigatória:
1. Gancho forte no início, SEM usar "Você sabia que..." ou "Você sabia...". Comece direto com a notícia: use um dado impactante, pergunta, manchete ou frase de efeito (ex: "E aí, hein?", "Breaking:", "[Time/Jogador] acaba de...", "A novidade é..."). Varie o estilo a cada legenda. 1-2 emojis no início.
2. Três a cinco parágrafos curtos (2-4 linhas cada), com emojis relevantes (🏈 ⚡ 🏆 etc.), desenvolvendo bem a notícia, contexto e impacto.
3. Uma ou duas perguntas ou reflexões para engajamento (ex: "O que você acha?", "Será que...?").
4. Frase final positiva ou de torcida, com emoji.
5. CTA: "Qual sua opinião? Deixe seu comentário! 👇"
6. Entre 10 e 18 hashtags (ex: #NFL #NFLBrasil #futebolamericano #notíciasNFL e outras relevantes à notícia).
7. Se for informado um link da notícia, termine com: "🔗 Link da notícia: [url]"

Não invente fatos: use APENAS o título e o conteúdo fornecidos. Tom: envolvente, informativo, adequado a redes sociais. A legenda deve ter no máximo ${MAX_CAPTION_LENGTH} caracteres.`;

export function hasOpenAIKey(): boolean {
  return Boolean(openAiKeyStudio());
}

export interface RewriteCaptionOptions {
  title: string;
  content: string;
  sourceUrl?: string;
}

/**
 * Usa o conteúdo da notícia (já buscado) e reescreve como legenda para o Feed via OpenAI.
 */
export async function rewriteContentAsCaption(
  opts: RewriteCaptionOptions,
): Promise<string> {
  const apiKey = openAiKeyStudio();
  if (!apiKey) {
    throw new Error(
      "Chave OpenAI não configurada. No .env da raiz use OPENAI_API_KEY= ou VITE_OPENAI_API_KEY_STUDIO= (reinicie o Vite).",
    );
  }

  const { title, content, sourceUrl } = opts;
  const contentText = (content || "").trim().slice(0, 6000);
  const linkLine =
    sourceUrl &&
    sourceUrl.trim() &&
    (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://"))
      ? `Inclua no final da legenda: "🔗 Link da notícia: ${sourceUrl}"`
      : "";

  const userContent = `Gere UMA legenda completa para esta notícia de NFL no Instagram.

Título: ${title || "Sem título"}
Conteúdo da notícia:
${contentText}
${linkLine ? linkLine + "\n\n" : ""}

Retorne APENAS a legenda pronta para colar no Instagram, sem JSON e sem explicações. Gere uma legenda LONGA e completa (idealmente entre 1200 e ${MAX_CAPTION_LENGTH} caracteres).`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.85,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Erro ao gerar legenda (${response.status})`;
    try {
      const errJson = JSON.parse(errBody);
      if (errJson.error?.message) msg = errJson.error.message;
    } catch {
      if (errBody) msg = errBody.slice(0, 200);
    }
    throw new Error(msg);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let raw = (data?.choices?.[0]?.message?.content ?? "").trim();

  if (!raw) {
    throw new Error("Resposta vazia da IA.");
  }

  let caption = raw.slice(0, MAX_CAPTION_LENGTH);
  const voceSabiaPattern = /^\s*(Você sabia que\s+|Você sabia\s+)/i;
  if (voceSabiaPattern.test(caption)) {
    caption = caption.replace(voceSabiaPattern, "").trim();
    if (caption.length > 0 && !/^[A-ZÁÉÍÓÚÂÊÔÃÕ]/.test(caption)) {
      caption = caption.charAt(0).toUpperCase() + caption.slice(1);
    }
  }

  return caption;
}
