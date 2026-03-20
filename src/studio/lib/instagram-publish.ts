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

    const publishRes = await fetch(
      `${GRAPH_API_BASE}/${accountId}/media_publish?creation_id=${creationId}&access_token=${encodeURIComponent(
        accessToken,
      )}`,
      { method: "POST" },
    );
    const publishData = await publishRes.json();

    console.log(`[instagram-publish] ${label}: media_publish response`, {
      attempt: attempt + 1,
      ok: publishRes.ok,
      status: publishRes.status,
      hasId: !!(publishData as { id?: string }).id,
      error: (publishData as { error?: { code?: number; message?: string } })
        ?.error,
    });

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
  const createUrl = `${GRAPH_API_BASE}/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(accessToken)}`;
  const createRes = await fetch(createUrl, { method: "POST" });
  const createData = await createRes.json();
  console.log("[instagram-publish] Feed: media create response", {
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
    console.error("[instagram-publish] Feed: token expirado", { createData });
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!createRes.ok && isMediaUriError(createData)) {
    const msg =
      (createData as { error?: { message?: string } })?.error?.message ||
      "Erro Meta API";
    console.error("[instagram-publish] Feed: create falhou (media URI)", {
      createData,
    });
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

/** Feed: carrossel com múltiplas imagens (2 a 10). Legenda só no post principal. */
export async function publishCarouselToInstagram(params: {
  imageUrls: string[];
  caption: string;
  accessToken: string;
  accountId: string;
}): Promise<PublishImageResult> {
  const { imageUrls, caption, accessToken, accountId } = params;
  const valid = imageUrls.filter((u) => isImageUrlValidForInstagram(u));
  if (valid.length < CAROUSEL_MIN_ITEMS || valid.length > CAROUSEL_MAX_ITEMS) {
    throw new Error(
      `Carrossel precisa de entre ${CAROUSEL_MIN_ITEMS} e ${CAROUSEL_MAX_ITEMS} imagens com URL pública. Recebido: ${valid.length}.`,
    );
  }
  console.log("[instagram-publish] Carrossel: início", {
    itemCount: valid.length,
    captionLength: caption?.length,
    accountId: accountId ? `${accountId.slice(0, 4)}...` : "(vazio)",
  });

  const childIds: string[] = [];
  for (let i = 0; i < valid.length; i++) {
    const imageUrl = valid[i];
    const createUrl = `${GRAPH_API_BASE}/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${encodeURIComponent(accessToken)}`;
    const createRes = await fetch(createUrl, { method: "POST" });
    const createData = await createRes.json();
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
    const id = (createData as { id?: string }).id;
    if (!id) throw new Error("Meta API não retornou ID do item do carrossel.");
    childIds.push(id);
    console.log("[instagram-publish] Carrossel: item criado", {
      index: i + 1,
      id,
    });
  }

  const childrenParam = childIds.join(",");
  const createParentUrl = `${GRAPH_API_BASE}/${accountId}/media?media_type=CAROUSEL&children=${encodeURIComponent(childrenParam)}&caption=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(accessToken)}`;
  const parentRes = await fetch(createParentUrl, { method: "POST" });
  const parentData = await parentRes.json();
  if (!parentRes.ok && isTokenExpiredError(parentData)) {
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!parentRes.ok) {
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
  let publishRes = await fetch(
    `${GRAPH_API_BASE}/${accountId}/media_publish?creation_id=${parentId}&access_token=${encodeURIComponent(accessToken)}`,
    { method: "POST" },
  );
  let publishData = await publishRes.json();
  if (!publishRes.ok && isMediaNotReadyError(publishData)) {
    console.log(
      "[instagram-publish] Carrossel: media não pronta, retry em 6s...",
    );
    await new Promise((r) => setTimeout(r, 6000));
    publishRes = await fetch(
      `${GRAPH_API_BASE}/${accountId}/media_publish?creation_id=${parentId}&access_token=${encodeURIComponent(accessToken)}`,
      { method: "POST" },
    );
    publishData = await publishRes.json();
  }
  if (!publishRes.ok && isTokenExpiredError(publishData)) {
    throw new Error(
      "Token do Instagram expirado. Vá em Perfil > Instagram e reconecte a conta.",
    );
  }
  if (!publishRes.ok) {
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
