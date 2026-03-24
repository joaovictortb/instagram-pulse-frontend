/**
 * Publicação no Instagram direto do browser (igual ao admin-dashboard do nfl-blog-brasil-v2).
 * Chama a API da Meta (graph.facebook.com), sem precisar de rota na nossa API.
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

function isImageUrlValidForInstagram(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u || u.startsWith("data:") || u.startsWith("/")) return false;
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  try {
    const parsed = new URL(u);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
      return false;
    return true;
  } catch {
    return false;
  }
}

function isVideoUrlValidForInstagram(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u || u.startsWith("data:") || u.startsWith("/")) return false;
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  try {
    const parsed = new URL(u);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
      return false;
    return true;
  } catch {
    return false;
  }
}

function isMediaNotReadyError(data: unknown): boolean {
  const e =
    (data as { error?: { code?: number; error_subcode?: number } })?.error ??
    (data as { code?: number; error_subcode?: number });
  return (
    e?.code === 9007 ||
    (e as { error_subcode?: number })?.error_subcode === 2207027
  );
}

function isMediaUriError(data: unknown): boolean {
  const e =
    (data as { error?: { code?: number; error_subcode?: number } })?.error ??
    (data as { error_subcode?: number });
  return (
    (e as { code?: number })?.code === 9004 &&
    (e as { error_subcode?: number })?.error_subcode === 2207052
  );
}

/** Token inválido ou sessão expirada (reconectar em Perfil > Instagram). */
function isTokenExpiredError(data: unknown): boolean {
  const e =
    (data as { error?: { code?: number; error_subcode?: number } })?.error ??
    (data as { code?: number; error_subcode?: number });
  // 190 = Invalid OAuth 2.0 Access Token
  // (não usar `type === OAuthException`, pois muitos erros vêm com esse type)
  return e?.code === 190;
}

/**
 * Erro temporário da Meta ("Please retry your request later", code 2, is_transient).
 * Comum ao criar carrossel / container com vários filhos.
 */
function isTransientGraphApiError(data: unknown): boolean {
  const err = (data as { error?: { code?: number; is_transient?: boolean } })
    ?.error;
  if (!err) return false;
  if (err.is_transient === true) return true;
  if (err.code === 2) return true;
  return false;
}

/** Para logs: nunca imprimir access_token completo. */
function redactTokenInUrl(url: string): string {
  try {
    return url.replace(/access_token=[^&]+/gi, "access_token=***REDACTED***");
  } catch {
    return "(url)";
  }
}

/** Máx. 2200 caracteres na legenda do feed Instagram. */
function clampInstagramCaptionText(input: string, maxLen = 2200): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  const normalized = s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
  if (normalized.length <= maxLen) return normalized;
  const clipped = normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd();
  return clipped ? `${clipped}…` : "";
}

/**
 * Log completo de falha na Graph API (mensagem, code, subcode, fbtrace_id, JSON bruto).
 */
function logMetaGraphApiFailure(
  context: string,
  httpStatus: number,
  data: unknown,
  requestUrl?: string,
): void {
  const raw = data as {
    error?: {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      is_transient?: boolean;
      error_user_title?: string;
      error_user_msg?: string;
      fbtrace_id?: string;
    };
  };
  console.error(
    `[instagram-publish] ${context} — ERRO Graph API (http ${httpStatus})`,
    {
      requestUrl: requestUrl ? redactTokenInUrl(requestUrl) : undefined,
      httpStatus,
      error: raw?.error ?? data,
      errorMessage: raw?.error?.message,
      errorCode: raw?.error?.code,
      errorSubcode: raw?.error?.error_subcode,
      isTransient: raw?.error?.is_transient,
      fbtrace_id: raw?.error?.fbtrace_id,
      /** Corpo completo para colar no suporte Meta / debug */
      responseJson: JSON.stringify(data),
    },
  );
}

/**
 * POST ao Graph API com várias tentativas quando a Meta devolve erro transitório.
 */
async function graphPostJsonWithRetry(
  url: string,
  label: string,
  maxAttempts = 4,
): Promise<{ ok: boolean; data: unknown }> {
  const betweenDelaysMs = [2500, 6000, 12000];
  let lastData: unknown = {};
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const wait = betweenDelaysMs[attempt - 1] ?? 10000;
      console.log(
        `[instagram-publish] ${label}: nova tentativa ${attempt + 1}/${maxAttempts} após ${wait}ms (erro transitório Meta)...`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    lastData = data;
    if (!res.ok) {
      logMetaGraphApiFailure(
        `${label} (tentativa ${attempt + 1}/${maxAttempts})`,
        res.status,
        data,
        url,
      );
    }
    if (res.ok) return { ok: true, data };
    if (isTokenExpiredError(data)) return { ok: false, data };
    if (!isTransientGraphApiError(data)) return { ok: false, data };
    console.warn(`[instagram-publish] ${label}: erro transitório (vai repetir)`, {
      attempt: attempt + 1,
      message: (data as { error?: { message?: string } })?.error?.message,
      code: (data as { error?: { code?: number; fbtrace_id?: string } })?.error
        ?.code,
      fbtrace_id: (data as { error?: { fbtrace_id?: string } })?.error
        ?.fbtrace_id,
    });
  }
  console.error(
    `[instagram-publish] ${label}: esgotadas ${maxAttempts} tentativas (erro transitório)`,
    {
      lastResponseJson: JSON.stringify(lastData),
      lastParsed: lastData,
    },
  );
  return { ok: false, data: lastData };
}

/**
 * POST com `application/x-www-form-urlencoded` no corpo (não na query string).
 * Necessário para legendas longas (~2200 chars + emojis): URLs GET podem estourar
 * limite de tamanho e a Meta responde 500 / OAuthException code 2.
 */
async function graphPostFormUrlEncodedWithRetry(
  endpoint: string,
  fields: Record<string, string>,
  label: string,
  maxAttempts = 4,
): Promise<{ ok: boolean; data: unknown }> {
  const betweenDelaysMs = [2500, 6000, 12000];
  let lastData: unknown = {};
  const safeLogHint = `${endpoint} [POST body: ${Object.keys(fields).join(", ")}; access_token redacted]`;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const wait = betweenDelaysMs[attempt - 1] ?? 10000;
      console.log(
        `[instagram-publish] ${label}: nova tentativa ${attempt + 1}/${maxAttempts} após ${wait}ms (erro transitório Meta)...`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    });
    const data = await res.json();
    lastData = data;
    if (!res.ok) {
      logMetaGraphApiFailure(
        `${label} (tentativa ${attempt + 1}/${maxAttempts})`,
        res.status,
        data,
        safeLogHint,
      );
    }
    if (res.ok) return { ok: true, data };
    if (isTokenExpiredError(data)) return { ok: false, data };
    if (!isTransientGraphApiError(data)) return { ok: false, data };
    console.warn(
      `[instagram-publish] ${label}: erro transitório (vai repetir)`,
      {
        attempt: attempt + 1,
        message: (data as { error?: { message?: string } })?.error?.message,
        code: (data as { error?: { code?: number; fbtrace_id?: string } })?.error
          ?.code,
        fbtrace_id: (data as { error?: { fbtrace_id?: string } })?.error
          ?.fbtrace_id,
      },
    );
  }
  console.error(
    `[instagram-publish] ${label}: esgotadas ${maxAttempts} tentativas (erro transitório)`,
    {
      lastResponseJson: JSON.stringify(lastData),
      lastParsed: lastData,
    },
  );
  return { ok: false, data: lastData };
}

/**
 * Aguarda cada item do carrossel ficar processado na Meta antes de montar o container pai.
 * Sem isto, POST com media_type=CAROUSEL + children pode devolver 500 / OAuthException code 2
 * (especialmente com vídeo).
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-container
 */
async function waitForIgContainerFinished(params: {
  containerId: string;
  accessToken: string;
  label: string;
  isVideo: boolean;
}): Promise<void> {
  const { containerId, accessToken, label, isVideo } = params;
  const maxTotalMs = isVideo ? 10 * 60 * 1000 : 5 * 60 * 1000;
  const startedAt = Date.now();
  const baseDelaysMs = isVideo
    ? [
        1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000,
        25000, 30000,
      ]
    : [800, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000];
  let pollIndex = 0;

  while (Date.now() - startedAt < maxTotalMs) {
    const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      logMetaGraphApiFailure(
        `${label}: GET status do container`,
        res.status,
        data,
        url,
      );
      if (isTokenExpiredError(data)) {
        throw new Error(
          "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
        );
      }
      if (!isTransientGraphApiError(data)) {
        const msg =
          (data as { error?: { message?: string } })?.error?.message ||
          "Erro ao consultar estado do item do carrossel";
        throw new Error(msg);
      }
    } else {
      const statusCode = (data as { status_code?: string }).status_code;
      const status = (data as { status?: string }).status;
      if (statusCode === "FINISHED") {
        console.log(`[instagram-publish] ${label}: container pronto (FINISHED)`, {
          containerIdPrefix: `${containerId.slice(0, 6)}…`,
        });
        return;
      }
      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        console.error(`[instagram-publish] ${label}: container com falha`, {
          statusCode,
          status,
          responseJson: JSON.stringify(data),
        });
        throw new Error(
          statusCode === "EXPIRED"
            ? "Um item do carrossel expirou antes de ficar pronto. Tente novamente."
            : `Um item do carrossel falhou no processamento (${status ?? "ERROR"}). Verifique URLs públicas de imagem/vídeo.`,
        );
      }
      if (pollIndex === 0 || pollIndex % 5 === 0) {
        console.log(`[instagram-publish] ${label}: aguardando Meta processar item...`, {
          status_code: statusCode,
          status,
        });
      }
    }

    const wait =
      baseDelaysMs[Math.min(pollIndex, baseDelaysMs.length - 1)] ?? 15000;
    pollIndex++;
    await new Promise((r) => setTimeout(r, wait));
  }

  throw new Error(
    `${label}: tempo limite excedido aguardando o item ficar pronto na Meta (vídeo/imagem).`,
  );
}

async function publishWithRetry(params: {
  accountId: string;
  accessToken: string;
  creationId: string;
  label: "Feed" | "Story" | "Carrossel" | "Reels";
  /** Espera inicial antes do primeiro publish. */
  initialWaitMs: number;
  /** Sequência de delays entre tentativas quando a mídia não está pronta. */
  retryDelaysMs: number[];
  /** Limite total de tempo (evita loop infinito). */
  maxTotalWaitMs?: number;
}): Promise<string> {
  const {
    accountId,
    accessToken,
    creationId,
    label,
    initialWaitMs,
    retryDelaysMs,
    maxTotalWaitMs = 5 * 60 * 1000,
  } = params;

  const startedAt = Date.now();

  if (initialWaitMs > 0) {
    console.log(
      `[instagram-publish] ${label}: aguardando ${initialWaitMs}ms antes de publish...`,
    );
    await new Promise((r) => setTimeout(r, initialWaitMs));
  }

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > maxTotalWaitMs) {
      throw new Error(
        `${label}: tempo limite excedido aguardando processamento da mídia (Meta). Tente novamente em instantes.`,
      );
    }

    const publishReqUrl = `${GRAPH_API_BASE}/${accountId}/media_publish?creation_id=${creationId}&access_token=${encodeURIComponent(
      accessToken,
    )}`;
    const publishRes = await fetch(publishReqUrl, { method: "POST" });
    const publishData = await publishRes.json();

    console.log(`[instagram-publish] ${label}: media_publish response`, {
      attempt: attempt + 1,
      ok: publishRes.ok,
      status: publishRes.status,
      hasId: !!(publishData as { id?: string }).id,
      error: (publishData as { error?: { code?: number; message?: string } })
        ?.error,
    });
    if (!publishRes.ok) {
      logMetaGraphApiFailure(
        `${label}: media_publish`,
        publishRes.status,
        publishData,
        publishReqUrl,
      );
    }

    if (!publishRes.ok && isTokenExpiredError(publishData)) {
      throw new Error(
        "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
      );
    }

    if (publishRes.ok) {
      const mediaId = (publishData as { id?: string }).id;
      if (!mediaId) throw new Error("Meta API não retornou media_id");
      return mediaId;
    }

    if (isMediaNotReadyError(publishData) && attempt < retryDelaysMs.length) {
      const waitMs = retryDelaysMs[attempt];
      const elapsed2 = Date.now() - startedAt;
      if (elapsed2 + waitMs > maxTotalWaitMs) {
        throw new Error(
          `${label}: tempo limite excedido aguardando processamento da mídia (Meta). Tente novamente em instantes.`,
        );
      }
      console.log(
        `[instagram-publish] ${label}: mídia não pronta, retry em ${waitMs}ms...`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    console.error(
      `[instagram-publish] ${label}: media_publish falhou (sem mais retry adequado)`,
      {
        attempt: attempt + 1,
        responseJson: JSON.stringify(publishData),
        parsed: publishData,
      },
    );
    const msg =
      (publishData as { error?: { message?: string } })?.error?.message ||
      "Erro ao publicar";
    throw new Error(msg);
  }

  throw new Error("Erro ao publicar");
}

export interface PublishImageResult {
  mediaId: string;
}

export interface PublishReelResult {
  mediaId: string;
}

/** Feed: imagem + legenda (igual ao dashboard). */
export async function publishImageToInstagram(params: {
  imageUrl: string;
  caption: string;
  accessToken: string;
  accountId: string;
}): Promise<PublishImageResult> {
  const { imageUrl, caption, accessToken, accountId } = params;
  console.log("[instagram-publish] Feed: início", {
    imageUrlPrefix: imageUrl.slice(0, 50) + "...",
    captionLength: caption?.length,
    accountId: accountId ? `${accountId.slice(0, 4)}...` : "(vazio)",
  });
  if (!isImageUrlValidForInstagram(imageUrl)) {
    console.error("[instagram-publish] Feed: URL inválida", {
      imageUrl: imageUrl?.slice(0, 80),
    });
    throw new Error(
      "A URL da imagem não é válida para o Instagram. Use uma URL pública (HTTPS).",
    );
  }
  const captionSafe = clampInstagramCaptionText(caption);
  const mediaEndpoint = `${GRAPH_API_BASE}/${accountId}/media`;
  const { ok: createOk, data: createData } =
    await graphPostFormUrlEncodedWithRetry(
      mediaEndpoint,
      {
        image_url: imageUrl,
        caption: captionSafe,
        access_token: accessToken,
      },
      "Feed: criar media",
    );
  console.log("[instagram-publish] Feed: media create response", {
    ok: createOk,
    hasId: !!(createData as { id?: string }).id,
    error: (
      createData as {
        error?: { code?: number; message?: string; error_subcode?: number };
      }
    )?.error,
  });
  if (!createOk && isTokenExpiredError(createData)) {
    console.error("[instagram-publish] Feed: token expirado", { createData });
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!createOk && isMediaUriError(createData)) {
    const msg =
      (createData as { error?: { message?: string } })?.error?.message ||
      "Erro Meta API";
    console.error("[instagram-publish] Feed: create falhou (media URI)", {
      createData,
    });
    throw new Error(msg);
  }
  if (!createOk) {
    const msg =
      (createData as { error?: { message?: string } })?.error?.message ||
      "Erro ao criar mídia no Feed.";
    throw new Error(msg);
  }
  const creationId = (createData as { id?: string }).id;
  if (!creationId) {
    console.error("[instagram-publish] Feed: sem creation_id", { createData });
    throw new Error("Meta API não retornou creation_id");
  }
  const mediaId = await publishWithRetry({
    accountId,
    accessToken,
    creationId,
    label: "Feed",
    initialWaitMs: 5000,
    retryDelaysMs: [6000, 8000, 12000],
  });
  return { mediaId };
}

/** Stories: imagem (sem legenda), recomendado 9:16. */
export async function publishStoryImageToInstagram(params: {
  imageUrl: string;
  accessToken: string;
  accountId: string;
}): Promise<PublishImageResult> {
  const { imageUrl, accessToken, accountId } = params;
  console.log("[instagram-publish] Story: início", {
    imageUrlPrefix: imageUrl.slice(0, 50) + "...",
    accountId: accountId ? `${accountId.slice(0, 4)}...` : "(vazio)",
  });
  if (!isImageUrlValidForInstagram(imageUrl)) {
    console.error("[instagram-publish] Story: URL inválida", {
      imageUrl: imageUrl?.slice(0, 80),
    });
    throw new Error(
      "A URL da imagem não é válida para o Instagram. Use uma URL pública (HTTPS).",
    );
  }
  const createUrl = `${GRAPH_API_BASE}/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&media_type=STORIES&access_token=${encodeURIComponent(accessToken)}`;
  const createRes = await fetch(createUrl, { method: "POST" });
  const createData = await createRes.json();
  console.log("[instagram-publish] Story: media create response", {
    ok: createRes.ok,
    status: createRes.status,
    hasId: !!(createData as { id?: string }).id,
    error: (createData as { error?: { code?: number; message?: string } })
      ?.error,
  });
  if (!createRes.ok && isTokenExpiredError(createData)) {
    console.error("[instagram-publish] Story: token expirado", { createData });
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!createRes.ok && isMediaUriError(createData)) {
    const msg =
      (createData as { error?: { message?: string } })?.error?.message ||
      "Erro Meta API Story";
    console.error("[instagram-publish] Story: create falhou", { createData });
    throw new Error(msg);
  }
  const creationId = (createData as { id?: string }).id;
  if (!creationId) {
    console.error("[instagram-publish] Story: sem creation_id", { createData });
    throw new Error("Meta API não retornou creation_id para Story");
  }
  const mediaId = await publishWithRetry({
    accountId,
    accessToken,
    creationId,
    label: "Story",
    initialWaitMs: 5000,
    retryDelaysMs: [6000, 8000, 12000],
  });
  return { mediaId };
}

/**
 * Reels: vídeo + legenda. A Meta API exige URL pública HTTPS (video_url).
 * Obs.: Reels é publicado como vídeo; uma imagem não funciona.
 */
export async function publishReelToInstagram(params: {
  videoUrl: string;
  caption?: string;
  accessToken: string;
  accountId: string;
  /** Se true, também compartilha no feed (opcional). */
  shareToFeed?: boolean;
}): Promise<PublishReelResult> {
  const {
    videoUrl,
    caption = "",
    accessToken,
    accountId,
    shareToFeed = true,
  } = params;
  console.log("[instagram-publish] Reels: início", {
    videoUrlPrefix: videoUrl?.slice(0, 50) + "...",
    captionLength: caption?.length,
    shareToFeed,
    accountId: accountId ? `${accountId.slice(0, 4)}...` : "(vazio)",
  });

  if (!isVideoUrlValidForInstagram(videoUrl)) {
    throw new Error(
      "A URL do vídeo não é válida para o Instagram. Use uma URL pública (HTTPS).",
    );
  }

  const createUrl =
    `${GRAPH_API_BASE}/${accountId}/media?media_type=REELS&video_url=${encodeURIComponent(
      videoUrl,
    )}` +
    (caption.trim() ? `&caption=${encodeURIComponent(caption)}` : "") +
    `&share_to_feed=${encodeURIComponent(String(shareToFeed))}` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  const createRes = await fetch(createUrl, { method: "POST" });
  const createData = await createRes.json();
  console.log("[instagram-publish] Reels: media create response", {
    ok: createRes.ok,
    status: createRes.status,
    hasId: !!(createData as { id?: string }).id,
    error: (
      createData as {
        error?: { code?: number; message?: string; error_subcode?: number };
      }
    )?.error,
  });

  if (!createRes.ok && isTokenExpiredError(createData)) {
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!createRes.ok && isMediaUriError(createData)) {
    const msg =
      (createData as { error?: { message?: string } })?.error?.message ||
      "Erro Meta API";
    throw new Error(msg);
  }
  if (!createRes.ok) {
    const msg =
      (createData as { error?: { message?: string } })?.error?.message ||
      "Erro ao criar mídia (Reels).";
    throw new Error(msg);
  }

  const creationId = (createData as { id?: string }).id;
  if (!creationId)
    throw new Error("Meta API não retornou creation_id (Reels).");
  const mediaId = await publishWithRetry({
    accountId,
    accessToken,
    creationId,
    label: "Reels",
    initialWaitMs: 15000,
    // Reels pode demorar bastante para processar vídeo.
    retryDelaysMs: [
      10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 60000, 60000,
    ],
    maxTotalWaitMs: 10 * 60 * 1000,
  });
  return { mediaId };
}

const CAROUSEL_MIN_ITEMS = 2;
const CAROUSEL_MAX_ITEMS = 10;

/** Item do carrossel: imagem ou vídeo (URLs públicas HTTPS). */
export type InstagramCarouselItem =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string };

function isCarouselItemValid(item: InstagramCarouselItem): boolean {
  if (item.kind === "video") return isVideoUrlValidForInstagram(item.url);
  return isImageUrlValidForInstagram(item.url);
}

/** Feed: carrossel com múltiplas mídias (2 a 10) — imagens e/ou vídeos. Legenda só no post principal. */
export async function publishCarouselToInstagram(params: {
  /** Preferencial: lista ordenada de imagens e vídeos. */
  items?: InstagramCarouselItem[];
  /** @deprecated use `items`; mantido para compatibilidade (só imagens). */
  imageUrls?: string[];
  caption: string;
  accessToken: string;
  accountId: string;
}): Promise<PublishImageResult> {
  const { caption, accessToken, accountId } = params;
  const captionSafe = clampInstagramCaptionText(caption);
  const normalizedLen = (caption ?? "")
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ").length;
  if (normalizedLen > 2200) {
    console.warn(
      "[instagram-publish] Carrossel: legenda truncada para 2200 caracteres (limite Instagram).",
      { originalLength: normalizedLen, usedLength: captionSafe.length },
    );
  }
  const items: InstagramCarouselItem[] =
    params.items?.length
      ? params.items
      : (params.imageUrls ?? []).map((url) => ({
          kind: "image" as const,
          url,
        }));
  const valid = items.filter(isCarouselItemValid);
  if (valid.length < CAROUSEL_MIN_ITEMS || valid.length > CAROUSEL_MAX_ITEMS) {
    throw new Error(
      `Carrossel precisa de entre ${CAROUSEL_MIN_ITEMS} e ${CAROUSEL_MAX_ITEMS} mídias com URL pública. Recebido: ${valid.length}.`,
    );
  }
  console.log("[instagram-publish] Carrossel: início", {
    itemCount: valid.length,
    kinds: valid.map((v) => v.kind),
    captionLengthOriginal: caption?.length,
    captionLengthUsed: captionSafe.length,
    accountId: accountId ? `${accountId.slice(0, 4)}...` : "(vazio)",
  });

  const childIds: string[] = [];
  for (let i = 0; i < valid.length; i++) {
    const item = valid[i];
    const createUrl =
      item.kind === "video"
        ? `${GRAPH_API_BASE}/${accountId}/media?media_type=VIDEO&video_url=${encodeURIComponent(item.url)}&is_carousel_item=true&access_token=${encodeURIComponent(accessToken)}`
        : `${GRAPH_API_BASE}/${accountId}/media?image_url=${encodeURIComponent(item.url)}&is_carousel_item=true&access_token=${encodeURIComponent(accessToken)}`;
    const { ok: childOk, data: createData } = await graphPostJsonWithRetry(
      createUrl,
      `Carrossel item ${i + 1}/${valid.length}`,
    );
    if (!childOk && isTokenExpiredError(createData)) {
      throw new Error(
        "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
      );
    }
    if (!childOk && isMediaUriError(createData)) {
      const msg =
        (createData as { error?: { message?: string } })?.error?.message ||
        "Erro Meta API";
      throw new Error(msg);
    }
    if (!childOk) {
      const msg =
        (createData as { error?: { message?: string } })?.error?.message ||
        "Erro ao criar item do carrossel";
      throw new Error(msg);
    }
    const id = (createData as { id?: string }).id;
    if (!id) throw new Error("Meta API não retornou ID do item do carrossel.");
    childIds.push(id);
    console.log("[instagram-publish] Carrossel: item criado", {
      index: i + 1,
      id,
    });
    await waitForIgContainerFinished({
      containerId: id,
      accessToken,
      label: `Carrossel item ${i + 1}/${valid.length}`,
      isVideo: item.kind === "video",
    });
  }

  console.log(
    "[instagram-publish] Carrossel: todos os itens FINISHED; breve pausa antes do container pai...",
  );
  await new Promise((r) => setTimeout(r, 1500));

  const childrenParam = childIds.join(",");
  const mediaEndpoint = `${GRAPH_API_BASE}/${accountId}/media`;
  const { ok: parentOk, data: parentData } =
    await graphPostFormUrlEncodedWithRetry(
      mediaEndpoint,
      {
        media_type: "CAROUSEL",
        children: childrenParam,
        caption: captionSafe,
        access_token: accessToken,
      },
      "Carrossel (container)",
    );
  if (!parentOk && isTokenExpiredError(parentData)) {
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!parentOk) {
    const msg =
      (parentData as { error?: { message?: string } })?.error?.message ||
      "Erro ao criar carrossel";
    throw new Error(msg);
  }
  const parentId = (parentData as { id?: string }).id;
  if (!parentId) throw new Error("Meta API não retornou ID do carrossel.");

  console.log(
    "[instagram-publish] Carrossel: aguardando 5s antes de publish...",
  );
  await new Promise((r) => setTimeout(r, 5000));
  const publishUrl = `${GRAPH_API_BASE}/${accountId}/media_publish?creation_id=${parentId}&access_token=${encodeURIComponent(accessToken)}`;
  let { ok: publishOk, data: publishData } = await graphPostJsonWithRetry(
    publishUrl,
    "Carrossel media_publish",
  );
  for (
    let waitRound = 0;
    !publishOk && isMediaNotReadyError(publishData) && waitRound < 6;
    waitRound++
  ) {
    console.log(
      `[instagram-publish] Carrossel: mídia ainda não pronta na Meta, aguardando 6s (extra ${waitRound + 1}/6)...`,
    );
    await new Promise((r) => setTimeout(r, 6000));
    const res = await fetch(publishUrl, { method: "POST" });
    publishData = await res.json();
    publishOk = res.ok;
    if (!res.ok) {
      logMetaGraphApiFailure(
        `Carrossel media_publish (após espera mídia, round ${waitRound + 1})`,
        res.status,
        publishData,
        publishUrl,
      );
    }
  }
  if (!publishOk && isTokenExpiredError(publishData)) {
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!publishOk) {
    console.error(
      "[instagram-publish] Carrossel media_publish (final, sem sucesso após retries)",
      {
        requestUrl: redactTokenInUrl(publishUrl),
        responseJson: JSON.stringify(publishData),
        parsed: publishData,
      },
    );
    const msg =
      (publishData as { error?: { message?: string } })?.error?.message ||
      "Erro ao publicar carrossel";
    throw new Error(msg);
  }
  const mediaId = (publishData as { id?: string }).id;
  if (!mediaId) throw new Error("Meta API não retornou media_id do carrossel.");
  console.log("[instagram-publish] Carrossel: sucesso", { mediaId });
  return { mediaId };
}
