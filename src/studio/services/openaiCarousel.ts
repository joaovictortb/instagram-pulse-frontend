/**
 * Geração de carrossel para Instagram via OpenAI (estrutura dos slides + legenda + imagens).
 * Usa VITE_OPENAI_API_KEY_STUDIO ou VITE_OPENAI_API_KEY.
 */

import { openAiKeyStudio } from "../lib/env-studio";
import type {
  NewsData,
  CarouselData,
  CarouselSlide,
  CarouselTemplate,
} from "../types/carousel";

const CHAT_MODEL = "gpt-4o-mini";
const IMAGE_MODEL = "dall-e-3";
const IMAGE_SIZE = "1024x1024";

function getApiKey(): string {
  const key = openAiKeyStudio();
  if (!key) {
    throw new Error(
      "Chave OpenAI não configurada. No .env da raiz: OPENAI_API_KEY= ou VITE_OPENAI_API_KEY_STUDIO= (reinicie o Vite).",
    );
  }
  return key;
}

const CAROUSEL_SYSTEM_PROMPT = `Você é um expert em redes sociais da NFL. Gere um carrossel para Instagram (5 a 8 slides) em português do Brasil, a partir da notícia fornecida.

Estrutura obrigatória do JSON de resposta:
{
  "slides": [
    { "type": "cover", "title": "...", "subtitle": "..." },
    { "type": "context", "title": "...", "content": "..." },
    { "type": "detail", "title": "...", "content": "..." },
    { "type": "stats", "title": "...", "stats": [{ "label": "...", "value": "..." }], "highlight": "..." },
    { "type": "analysis", "title": "...", "content": "..." },
    { "type": "quote", "title": "texto da citação", "subtitle": "— Nome ou fonte" },
    { "type": "headline", "title": "manchete impactante", "subtitle": "..." },
    { "type": "key_points", "title": "Título da seção", "points": ["Ponto 1", "Ponto 2", "Ponto 3"] },
    { "type": "comparison", "title": "A vs B", "content": "breve descrição", "stats": [{ "label": "Opção A", "value": "..." }, { "label": "Opção B", "value": "..." }] },
    { "type": "cta", "title": "...", "subtitle": "..." }
  ],
  "caption": "Legenda completa para o post (2-4 parágrafos, emojis, CTA, em português)",
  "hashtags": ["#NFL", "#NFLBrasil", ...]
}

Tipos de slide:
- "cover": manchete + subtítulo
- "context": resumo (title + content)
- "detail": detalhe (title + content)
- "stats": números com stats[] e opcional highlight
- "analysis": análise (title + content)
- "quote": citação impactante (title = texto, subtitle = autor/fonte)
- "headline": manchete única e impactante (title, subtitle opcional)
- "key_points": lista de tópicos (title + points: array de strings, 3 a 5 itens)
- "comparison": comparação (title "X vs Y", content opcional, stats com 2 itens para os lados)
- "cta": chamada para ação (title + subtitle)

Use variedade: inclua 1 ou 2 dos tipos quote, headline, key_points ou comparison quando fizer sentido para a notícia.
Retorne APENAS o JSON, sem markdown e sem texto antes ou depois.`;

/**
 * Gera a estrutura do carrossel (slides + caption + hashtags) a partir da notícia.
 * Se template for passado, a ordem e os tipos dos slides seguem exatamente o template.
 */
export async function generateCarouselContent(
  news: NewsData,
  template?: CarouselTemplate,
): Promise<CarouselData> {
  const apiKey = getApiKey();

  const templateInstruction = template
    ? `\n\nIMPORTANTE: O carrossel deve ter EXATAMENTE ${template.slideTypes.length} slides. Os tipos dos slides devem ser EXATAMENTE, nesta ordem: ${template.slideTypes.join(", ")}. Gere o conteúdo (title, subtitle, content, stats, points, highlight conforme o tipo) para cada slide nessa ordem.`
    : "";

  const userContent = `Notícia:
Título: ${news.headline}
Descrição: ${news.description}
${news.content ? `Conteúdo: ${news.content.slice(0, 4000)}` : ""}
${news.author ? `Autor: ${news.author}` : ""}
${news.published ? `Data: ${news.published}` : ""}

Gere o carrossel em JSON com slides, caption e hashtags.${templateInstruction}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: CAROUSEL_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Erro ao gerar carrossel (${response.status})`;
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
  const raw = (data?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw) throw new Error("Resposta vazia da IA.");

  let parsed: { slides?: unknown[]; caption?: string; hashtags?: string[] };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Resposta da IA não é um JSON válido.");
  }

  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const caption = typeof parsed.caption === "string" ? parsed.caption : "";
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((h) => typeof h === "string")
    : [];

  const validTypes = [
    "cover",
    "context",
    "detail",
    "stats",
    "analysis",
    "cta",
    "quote",
    "headline",
    "key_points",
    "comparison",
  ] as const;

  const normalizedSlides: CarouselSlide[] = slides.map(
    (s: Record<string, unknown>, index: number) => {
      const type = (s.type as string) || "detail";
      const validType = validTypes.includes(type as (typeof validTypes)[number])
        ? (type as CarouselSlide["type"])
        : "detail";
      const imageIndex = index % news.images.length;
      const image = news.images[imageIndex];
      return {
        id: index + 1,
        type: validType,
        title: String(s.title ?? ""),
        subtitle: s.subtitle != null ? String(s.subtitle) : undefined,
        content: s.content != null ? String(s.content) : undefined,
        stats: Array.isArray(s.stats)
          ? (s.stats as Array<{ label?: string; value?: string }>).map(
              (st) => ({
                label: String(st?.label ?? ""),
                value: String(st?.value ?? ""),
              }),
            )
          : undefined,
        highlight: s.highlight != null ? String(s.highlight) : undefined,
        points: Array.isArray(s.points)
          ? (s.points as string[]).map((p) => String(p)).filter(Boolean)
          : undefined,
        image,
      };
    },
  );

  /** Se template foi passado, forçar exatamente a sequência de tipos e o número de slides. */
  const finalSlides: CarouselSlide[] = template
    ? template.slideTypes.map((forcedType, i) => {
        const existing = normalizedSlides[i];
        const imageIndex = i % news.images.length;
        const image = news.images[imageIndex];
        return {
          id: i + 1,
          type: forcedType,
          title: existing?.title ?? "",
          subtitle: existing?.subtitle,
          content: existing?.content,
          stats: existing?.stats,
          highlight: existing?.highlight,
          points: existing?.points,
          image,
        };
      })
    : normalizedSlides;

  return {
    slides: finalSlides,
    caption,
    hashtags:
      hashtags.length > 0
        ? hashtags
        : ["#NFL", "#NFLBrasil", "#futebolamericano"],
  };
}

/** Resposta da IA com texto específico para cada um dos 6 slides (narrativa guia). */
export interface GuiaSlidesContent {
  slides: [
    { title: string; subtitle?: string },
    { title: string; content: string },
    { title: string; content?: string },
    { title: string; content?: string },
    { title: string; content?: string },
    { title: string; content: string },
  ];
  caption: string;
  hashtags: string[];
}

const GUIA_SLIDES_SYSTEM_PROMPT = `Você é um expert em redes sociais da NFL. Gere textos ÚNICOS e INFORMATIVOS para cada um dos 6 slides de um carrossel Instagram, em português do Brasil. Cada slide deve trazer MAIS informações e contexto sobre a notícia, evitando repetir os mesmos títulos ou parágrafos.

Estrutura OBRIGATÓRIA do JSON (exatamente 6 itens na ordem abaixo):
{
  "slides": [
    { "title": "manchete impactante (1-2 linhas)", "subtitle": "NFL BREAKING ou subtítulo contextual (time, conferência, situação)" },
    { "title": "O QUE VOCÊ PRECISA SABER", "content": "Parágrafo completo (3 a 5 frases) resumindo a notícia: contexto, principais fatos, nomes, números e impacto. Seja específico e informativo." },
    { "title": "título do primeiro destaque (diferente da manchete)", "content": "1 a 2 frases com informação concreta (ex: nome do jogador, contrato, time, data). Dado ou ângulo específico da notícia." },
    { "title": "título do segundo destaque (outro ângulo)", "content": "1 a 2 frases com outro dado ou ângulo (estatística, declaração, comparação). Informação diferente do slide anterior." },
    { "title": "título do terceiro destaque (próximos passos/histórico)", "content": "1 a 2 frases com mais um fato relevante (próximos passos, expectativa, histórico). Cada slide acrescenta informação nova." },
    { "title": "FIQUE POR DENTRO", "content": "2 a 3 frases de CTA: incentive a seguir, comente o que mais interessa no tema, use emojis. Seja convidativo e específico ao tema da notícia." }
  ],
  "caption": "Legenda completa para o post (3-4 parágrafos, emojis, tom engajador, em português)",
  "hashtags": ["#NFL", "#NFLBrasil", "#NFLNews", "#FutebolAmericano"]
}

REGRAS:
- Cada slide deve ter TEXTO DIFERENTE e MAIS INFORMAÇÃO. Não repita a mesma frase em vários slides.
- Evite reutilizar exatamente a mesma manchete em todos os títulos: use variações, sinônimos e enfoques diferentes (especialmente nos slides 3, 4 e 5).
- Slide 2 (O que você precisa saber): seja completo — nomes, números, datas, contexto. 3 a 5 frases.
- Slides 3, 4, 5: além do título, inclua "content" com 1-2 frases informativas cada (dados, citações, estatísticas).
- Slide 6: CTA com 2-3 frases, convidando a interagir de forma específica com o tema.
- Títulos: claros e impactantes, mas com informação (não genéricos).
- Use as informações de time (nome, cidade, conferência, divisão, cores) e do tipo/categoria da notícia (ex.: transferência, lesão, renovação de contrato, análise de jogo) para deixar o texto mais específico e contextualizado.
Retorne APENAS o JSON, sem markdown e sem texto antes ou depois.`;

/**
 * Gera textos específicos para cada um dos 6 slides (capa, fato, 3 imagens, CTA) via OpenAI.
 * Cada slide recebe um texto diferente sobre a notícia.
 */
export async function generateGuiaSlidesContent(
  news: NewsData,
): Promise<GuiaSlidesContent> {
  const apiKey = getApiKey();

  const userContent = `Notícia:
Título: ${news.headline}
Descrição: ${news.description}
${news.content ? `Conteúdo: ${news.content.slice(0, 3000)}` : ""}
${news.author ? `Autor: ${news.author}` : ""}
${news.published ? `Publicado: ${news.published}` : ""}
${news.teamName ? `Time: ${news.teamName} (${news.teamAbbreviation ?? ""})` : ""}
${news.teamCity ? `Cidade: ${news.teamCity}` : ""}
${news.teamConference ? `Conferência: ${news.teamConference}` : ""}
${news.teamDivision ? `Divisão: ${news.teamDivision}` : ""}
${news.category ? `Categoria da notícia: ${news.category}` : ""}
${news.kind ? `Tipo de notícia: ${news.kind}` : ""}

Gere o JSON com os 6 slides (cada um com texto específico e diferente), caption e hashtags.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: GUIA_SLIDES_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Erro ao gerar textos do carrossel (${response.status})`;
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
  const raw = (data?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw) throw new Error("Resposta vazia da IA.");

  let parsed: {
    slides?: unknown[];
    caption?: string;
    hashtags?: string[];
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Resposta da IA não é um JSON válido.");
  }

  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const caption = typeof parsed.caption === "string" ? parsed.caption : "";
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((h) => typeof h === "string")
    : [];

  const TITLE_SUBTITLE = "NFL BREAKING";
  const CONTENT_HEADER = "O QUE VOCÊ PRECISA SABER";
  const CTA_TITLE = "FIQUE POR DENTRO";
  const CTA_DEFAULT = "Siga para mais atualizações da NFL";

  const s0 = slides[0] as { title?: string; subtitle?: string } | undefined;
  const s1 = slides[1] as { title?: string; content?: string } | undefined;
  const s2 = slides[2] as { title?: string; content?: string } | undefined;
  const s3 = slides[3] as { title?: string; content?: string } | undefined;
  const s4 = slides[4] as { title?: string; content?: string } | undefined;
  const s5 = slides[5] as { title?: string; content?: string } | undefined;

  return {
    slides: [
      {
        title: String(s0?.title || news.headline || "").slice(0, 200),
        subtitle: String(s0?.subtitle ?? TITLE_SUBTITLE).slice(0, 80),
      },
      {
        title: String(s1?.title ?? CONTENT_HEADER).slice(0, 150),
        content: String(s1?.content ?? news.description),
      },
      {
        title: String(s2?.title || `${news.headline} — detalhe 1`).slice(
          0,
          150,
        ),
        content: s2?.content != null ? String(s2.content) : undefined,
      },
      {
        title: String(s3?.title || `${news.headline} — detalhe 2`).slice(
          0,
          150,
        ),
        content: s3?.content != null ? String(s3.content) : undefined,
      },
      {
        title: String(s4?.title || `${news.headline} — detalhe 3`).slice(
          0,
          150,
        ),
        content: s4?.content != null ? String(s4.content) : undefined,
      },
      {
        title: String(s5?.title ?? CTA_TITLE).slice(0, 100),
        content: String(s5?.content ?? CTA_DEFAULT),
      },
    ],
    caption: caption.slice(0, 2200),
    hashtags:
      hashtags.length > 0 ? hashtags : ["#NFL", "#NFLBrasil", "#NFLNews"],
  };
}

// ——— Players-list: prompt que pede N slides dinâmicos (1 por jogador/destaque) ———

const PLAYERS_LIST_SYSTEM_PROMPT = `Você é um expert em redes sociais da NFL. A partir da notícia fornecida, identifique TODAS as pessoas/jogadores/treinadores mencionados e gere um carrossel Instagram em português do Brasil com UM slide dedicado para CADA pessoa — mais um slide de capa e um de CTA no final.

Estrutura OBRIGATÓRIA do JSON:
{
  "slides": [
    { "type": "title", "title": "manchete chamativa do carrossel", "subtitle": "subtítulo contextual" },
    { "type": "image", "title": "NOME DO JOGADOR", "subtitle": "Time · Posição · Período", "content": "2 a 4 frases sobre a pessoa: conquistas, curiosidades, estatísticas, impacto. Cada slide deve ser informativo e único." },
    ... (repita para CADA jogador/pessoa na notícia) ...
    { "type": "cta", "title": "FIQUE POR DENTRO", "content": "2-3 frases de CTA convidando a seguir" }
  ],
  "caption": "Legenda completa (3-4 parágrafos, emojis, tom engajador, português)",
  "hashtags": ["#NFL", "#NFLBrasil", ...]
}

REGRAS:
- Gere 1 slide de capa (type "title") + 1 slide para CADA pessoa mencionada (type "image") + 1 slide CTA no final.
- Pode ter 3, 5, 8, 10 ou mais slides — depende de quantas pessoas a notícia menciona. NÃO limite a 6.
- Cada slide de jogador DEVE ter: title (nome), subtitle (time/posição/período), content (2-4 frases informativas únicas).
- Não repita informações entre slides.
- Se a notícia mencionar imagens (URLs), ignore — as imagens são tratadas separadamente.
Retorne APENAS o JSON, sem markdown.`;

export interface PlayersListContent {
  slides: Array<{
    type: "title" | "image" | "cta";
    title: string;
    subtitle?: string;
    content?: string;
  }>;
  caption: string;
  hashtags: string[];
}

export async function generatePlayersListContent(
  news: NewsData,
): Promise<PlayersListContent> {
  const apiKey = getApiKey();

  const contentText = news.content || news.description || "";
  console.log(
    "[generatePlayersListContent] news.content length:",
    news.content?.length ?? 0,
    "| news.description length:",
    news.description?.length ?? 0,
    "| contentText length:",
    contentText.length,
    "| primeiros 200 chars:",
    contentText.slice(0, 200),
  );

  const userContent = `Notícia:\nTítulo: ${news.headline}\nDescrição: ${news.description}\n${contentText ? `Conteúdo completo da notícia:\n${contentText.slice(0, 12000)}` : ""}\n${news.author ? `Autor: ${news.author}` : ""}\n${news.published ? `Publicado: ${news.published}` : ""}\n${news.teamName ? `Time: ${news.teamName}` : ""}\n\nIdentifique TODOS os jogadores/pessoas mencionados no conteúdo e gere o JSON com 1 slide por pessoa. A notícia menciona vários jogadores — gere um slide para CADA um.`;

  console.log(
    "[generatePlayersListContent] userContent length:",
    userContent.length,
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: PLAYERS_LIST_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Erro ao gerar lista de jogadores (${response.status})`;
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
  const raw = (data?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw) throw new Error("Resposta vazia da IA.");

  let parsed: { slides?: unknown[]; caption?: string; hashtags?: string[] };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Resposta da IA não é um JSON válido.");
  }

  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const caption = typeof parsed.caption === "string" ? parsed.caption : "";
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((h) => typeof h === "string")
    : [];

  console.log(
    "[generatePlayersListContent] IA retornou",
    slides.length,
    "slides. Tipos:",
    slides.map((s: Record<string, unknown>) => s.type),
  );

  const validTypes = ["title", "image", "cta"] as const;
  const normalizedSlides = slides.map((s: Record<string, unknown>) => {
    const t = String(s.type ?? "image");
    const type = validTypes.includes(t as (typeof validTypes)[number])
      ? (t as "title" | "image" | "cta")
      : "image";
    return {
      type,
      title: String(s.title ?? ""),
      subtitle: s.subtitle != null ? String(s.subtitle) : undefined,
      content: s.content != null ? String(s.content) : undefined,
    };
  });

  console.log(
    "[generatePlayersListContent] slides finais:",
    normalizedSlides.length,
    normalizedSlides.map((s) => `${s.type}: ${s.title.slice(0, 40)}`),
  );

  return {
    slides: normalizedSlides,
    caption: caption.slice(0, 2200),
    hashtags:
      hashtags.length > 0 ? hashtags : ["#NFL", "#NFLBrasil", "#NFLNews"],
  };
}

/**
 * Gera um prompt de imagem para um slide (estilo NFL, sem texto na imagem).
 */
export async function generateImagePrompt(
  news: NewsData,
  slideTitle: string,
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você gera prompts para gerador de imagens (DALL-E). Retorne apenas o prompt em inglês: cena esportiva NFL, estádio, jogadores, atmosfera cinematográfica, iluminação dramática, fotografia profissional. NUNCA inclua texto ou palavras na imagem. Uma única frase ou duas, sem aspas.",
        },
        {
          role: "user",
          content: `Contexto da notícia: ${news.headline}. Slide: ${slideTitle}. Gere um prompt para uma imagem de fundo para este slide (NFL, esportivo, sem texto).`,
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Erro ao gerar prompt de imagem (${response.status})`;
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
  const raw = (data?.choices?.[0]?.message?.content ?? "").trim();
  return (
    raw ||
    "NFL stadium game day dramatic lighting professional sports photography"
  );
}

/**
 * Gera uma imagem quadrada (1:1) para o slide e retorna como data URL.
 */
export async function generateSlideImage(prompt: string): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: IMAGE_SIZE,
      response_format: "b64_json",
      quality: "standard",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Erro ao gerar imagem (${response.status})`;
    try {
      const errJson = JSON.parse(errBody);
      if (errJson.error?.message) msg = errJson.error.message;
    } catch {
      if (errBody) msg = errBody.slice(0, 200);
    }
    throw new Error(msg);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Resposta da API de imagens sem b64_json.");

  return `data:image/png;base64,${b64}`;
}
