/**
 * Upload de imagem direto do browser para a Cloudinary (unsigned).
 * Usado para enviar a imagem do post ao Instagram via URL pública.
 * Use VITE_CLOUDINARY_*_STUDIO ou VITE_CLOUDINARY_* no .env.
 */

import { envStudio } from "./env-studio";

function getCloudinaryCloudName(): string {
  return envStudio(
    "VITE_CLOUDINARY_CLOUD_NAME_STUDIO",
    "VITE_CLOUDINARY_CLOUD_NAME",
  );
}

function getCloudinaryUploadPreset(): string {
  return envStudio(
    "VITE_CLOUDINARY_UPLOAD_PRESET_STUDIO",
    "VITE_CLOUDINARY_UPLOAD_PRESET",
  );
}

export function hasCloudinaryConfig(): boolean {
  return Boolean(getCloudinaryCloudName() && getCloudinaryUploadPreset());
}

/**
 * Converte data URL (ex.: resultado de toJpeg) em File para o FormData.
 */
async function dataUrlToFile(
  dataUrl: string,
  fileName = "post.jpg",
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

async function blobToFile(blob: Blob, fileName: string): Promise<File> {
  const type = blob.type || "application/octet-stream";
  return new File([blob], fileName, { type });
}

function isCloudinaryFileSizeTooLargeMessage(message: string): boolean {
  const s = message.toLowerCase();
  return (
    s.includes("file size too large") ||
    (s.includes("too large") && s.includes("maximum")) ||
    s.includes("maximum is") ||
    s.includes("exceeds")
  );
}

async function reencodeDataUrlToJpeg(
  dataUrl: string,
  quality: number,
  scale: number,
): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = dataUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () =>
      rej(new Error("Falha ao carregar imagem para reencode."));
  });

  const canvas = document.createElement("canvas");
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d não disponível.");

  // JPEG não suporta alpha; preenche com fundo escuro (evita artefatos).
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Faz upload da imagem (data URL) para a Cloudinary e retorna a URL pública.
 * A Meta/Instagram exige URL HTTPS acessível publicamente — a Cloudinary fornece isso.
 */
export async function uploadImageToCloudinary(
  dataUrl: string,
): Promise<string> {
  const CLOUD_NAME = getCloudinaryCloudName();
  const UPLOAD_PRESET = getCloudinaryUploadPreset();
  console.log("[cloudinary] upload: início", {
    dataUrlLength: dataUrl?.length ?? 0,
    hasCloudName: !!CLOUD_NAME,
    hasUploadPreset: !!UPLOAD_PRESET,
  });
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary não configurada. Defina VITE_CLOUDINARY_CLOUD_NAME_STUDIO e VITE_CLOUDINARY_UPLOAD_PRESET_STUDIO (ou VITE_CLOUDINARY_* sem sufixo).",
    );
  }
  const file = await dataUrlToFile(dataUrl);
  console.log("[cloudinary] upload: file criado", {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const doUpload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    const r = await fetch(url, { method: "POST", body: fd });
    const t = await r.text();
    let d: { secure_url?: string; error?: { message?: string } };
    try {
      d = t
        ? (JSON.parse(t) as {
            secure_url?: string;
            error?: { message?: string };
          })
        : {};
    } catch {
      console.error("[cloudinary] upload: resposta não é JSON", {
        status: r.status,
        textPreview: t?.slice(0, 200),
      });
      throw new Error(`Resposta inválida do Cloudinary (${r.status}).`);
    }
    if (d.error?.message) {
      throw new Error(d.error.message);
    }
    const imageUrl = d.secure_url;
    if (typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
      throw new Error("Cloudinary não retornou URL da imagem.");
    }
    return imageUrl;
  };

  try {
    const imageUrl = await doUpload(file);
    console.log("[cloudinary] upload OK:", {
      imageUrl: imageUrl.slice(0, 60) + "...",
    });
    return imageUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isCloudinaryFileSizeTooLargeMessage(msg)) {
      console.error("[cloudinary] upload: erro da API", { error: msg });
      throw err instanceof Error ? err : new Error(msg);
    }

    console.warn(
      "[cloudinary] upload: arquivo grande; tentando reencode JPEG.",
      {
        error: msg,
        originalSize: file.size,
      },
    );

    // Candidatos mais agressivos para garantir abaixo de ~10MB.
    const qualityCandidates = [0.85, 0.7, 0.55];
    const scaleCandidates = [1, 0.9, 0.75];

    let lastErr: unknown = err;
    for (const scale of scaleCandidates) {
      for (const q of qualityCandidates) {
        try {
          const reencoded = await reencodeDataUrlToJpeg(dataUrl, q, scale);
          const f2 = await dataUrlToFile(reencoded);
          const imageUrl = await doUpload(f2);
          console.log("[cloudinary] upload OK (fallback):", {
            imageUrl: imageUrl.slice(0, 60) + "...",
            attempted: { scale, quality: q },
            newSize: f2.size,
          });
          return imageUrl;
        } catch (e2) {
          lastErr = e2;
        }
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}

export interface CloudinaryVideoUploadResult {
  secureUrl: string;
  publicId: string;
}

/**
 * Faz upload de um vídeo (Blob ou data URL) para a Cloudinary (unsigned) e retorna URL + public_id.
 * Útil para Reels (Instagram exige `video_url` público HTTPS).
 */
export async function uploadVideoToCloudinary(
  input: Blob | string,
  options?: { fileName?: string },
): Promise<CloudinaryVideoUploadResult> {
  const CLOUD_NAME = getCloudinaryCloudName();
  const UPLOAD_PRESET = getCloudinaryUploadPreset();
  console.log("[cloudinary] video upload: início", {
    inputType: typeof input === "string" ? "dataUrl" : "blob",
    inputSize: typeof input === "string" ? input.length : input.size,
    hasCloudName: !!CLOUD_NAME,
    hasUploadPreset: !!UPLOAD_PRESET,
  });
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary não configurada. Defina VITE_CLOUDINARY_CLOUD_NAME_STUDIO e VITE_CLOUDINARY_UPLOAD_PRESET_STUDIO (ou VITE_CLOUDINARY_* sem sufixo).",
    );
  }

  const fileName = options?.fileName?.trim() || "reels.webm";
  const file =
    typeof input === "string"
      ? await dataUrlToFile(input, fileName)
      : await blobToFile(input, fileName);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const res = await fetch(url, { method: "POST", body: formData });

  const text = await res.text();
  let data: {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };
  try {
    data = text
      ? (JSON.parse(text) as {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        })
      : {};
  } catch {
    console.error("[cloudinary] video upload: resposta não é JSON", {
      status: res.status,
      textPreview: text?.slice(0, 200),
    });
    throw new Error(`Resposta inválida do Cloudinary (${res.status}).`);
  }

  if (data.error?.message) {
    console.error("[cloudinary] video upload: erro da API", {
      status: res.status,
      error: data.error,
    });
    throw new Error(data.error.message);
  }
  const secureUrl = data.secure_url;
  const publicId = data.public_id;
  if (
    !secureUrl ||
    typeof secureUrl !== "string" ||
    !secureUrl.startsWith("http")
  ) {
    throw new Error("Cloudinary não retornou URL do vídeo.");
  }
  if (!publicId || typeof publicId !== "string") {
    throw new Error("Cloudinary não retornou public_id do vídeo.");
  }
  console.log("[cloudinary] video upload OK:", {
    status: res.status,
    secureUrl: secureUrl.slice(0, 60) + "...",
    publicId,
  });
  return { secureUrl, publicId };
}
