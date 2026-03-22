"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Youtube, Loader2, CheckCircle2, AlertTriangle, Type } from "lucide-react";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import {
  extractYoutubeVideoId,
  isYoutubeShortsUrl,
} from "@/src/lib/youtube";

type TitlePosition = "bottom" | "center" | "top";

type Result = {
  ok?: boolean;
  error?: string;
  target?: string;
  cloudinaryUrl?: string;
  cloudinaryOriginalUrl?: string;
  instagramMediaId?: string;
};

export default function YoutubeImportPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [target, setTarget] = useState<"reels" | "story">("reels");
  const [caption, setCaption] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [titlePosition, setTitlePosition] = useState<TitlePosition>("bottom");
  const [titleColorHex, setTitleColorHex] = useState("ffffff");

  const videoId = useMemo(
    () => extractYoutubeVideoId(youtubeUrl),
    [youtubeUrl],
  );
  const isShorts = useMemo(
    () => isYoutubeShortsUrl(youtubeUrl),
    [youtubeUrl],
  );

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`
    : null;

  const titleColorCss = useMemo(() => {
    const h = titleColorHex.replace(/^#/, "").trim();
    if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h}`;
    return "#ffffff";
  }, [titleColorHex]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/content/youtube-to-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          target,
          caption: caption.trim() || undefined,
          shareToFeed: true,
          videoTitle: videoTitle.trim() || undefined,
          titlePosition: videoTitle.trim() ? titlePosition : undefined,
          titleColorHex: videoTitle.trim() ? titleColorHex : undefined,
        }),
      });
      const data = await readJsonBody<Result>(res);
      if (!res.ok) throw new Error(data.error || "Falha no pipeline");
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Youtube className="text-red-500" size={28} />
          YouTube → Cloudinary → Instagram
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Pré-visualiza o vídeo, opcionalmente adiciona um <strong>título no
          vídeo</strong> (Cloudinary, estilo Canva) e publica como Reel ou Story.
        </p>
      </div>

      <div
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        role="note"
      >
        <p className="font-medium flex items-center gap-2">
          <AlertTriangle size={16} />
          Direitos e termos
        </p>
        <p className="mt-1 text-amber-200/90">
          Usa apenas conteúdo em que tenhas permissão. O título no vídeo é
          aplicado na Cloudinary antes de enviar à Meta.
        </p>
      </div>

      <div className="glass-card p-6 space-y-5 border border-dashboard-border/80">
        <label className="block space-y-2">
          <span className="text-xs font-medium text-zinc-400">URL YouTube</span>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/shorts/… ou watch?v=…"
            className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-brand-primary"
          />
        </label>

        {embedUrl && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-400">
              Pré-visualização (YouTube)
            </span>
            <div
              className={`relative w-full overflow-hidden rounded-xl border border-white/8 bg-black ${
                isShorts ? "aspect-9/16 max-w-[280px] mx-auto" : "aspect-video"
              }`}
            >
              <iframe
                title="Pré-visualização YouTube"
                src={embedUrl}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {videoTitle.trim() && (
                <div
                  className="pointer-events-none absolute inset-x-0 flex px-4 text-center font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                  style={{
                    color: titleColorCss,
                    fontSize: isShorts ? "clamp(1rem, 4vw, 1.35rem)" : "clamp(1.1rem, 2.5vw, 1.5rem)",
                    ...(titlePosition === "bottom"
                      ? { bottom: "8%", justifyContent: "center" }
                      : titlePosition === "top"
                        ? { top: "8%", justifyContent: "center" }
                        : {
                            top: "50%",
                            transform: "translateY(-50%)",
                            justifyContent: "center",
                          }),
                  }}
                >
                  <span className="w-full line-clamp-3">{videoTitle.trim()}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              O texto em cima é uma <strong>pré-visualização</strong> — o
              resultado final no Instagram segue a mesma posição aproximada
              (Cloudinary Arial bold).
            </p>
          </div>
        )}

        <div className="border-t border-white/6 pt-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Type size={16} className="text-brand-primary" />
            Título no vídeo (opcional)
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-medium text-zinc-400">Texto</span>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Ex.: Novo episódio já disponível"
              maxLength={96}
              className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-brand-primary"
            />
          </label>
          <div className="flex flex-wrap gap-4 items-end">
            <label className="space-y-1.5">
              <span className="text-xs text-zinc-500">Posição</span>
              <select
                value={titlePosition}
                onChange={(e) =>
                  setTitlePosition(e.target.value as TitlePosition)
                }
                disabled={!videoTitle.trim()}
                className="bg-zinc-900 border border-dashboard-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 ring-brand-primary disabled:opacity-40"
              >
                <option value="bottom">Inferior (como Canva)</option>
                <option value="center">Centro</option>
                <option value="top">Superior</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs text-zinc-500">Cor (#hex)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={titleColorCss}
                  onChange={(e) =>
                    setTitleColorHex(e.target.value.replace("#", ""))
                  }
                  disabled={!videoTitle.trim()}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-dashboard-border bg-zinc-900 disabled:opacity-40"
                />
                <input
                  type="text"
                  value={titleColorHex}
                  onChange={(e) =>
                    setTitleColorHex(
                      e.target.value.replace(/#/g, "").slice(0, 6),
                    )
                  }
                  placeholder="ffffff"
                  maxLength={6}
                  disabled={!videoTitle.trim()}
                  className="w-28 bg-zinc-900 border border-dashboard-border rounded-xl px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-1 ring-brand-primary disabled:opacity-40"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="radio"
              name="target"
              checked={target === "reels"}
              onChange={() => setTarget("reels")}
              className="accent-brand-primary"
            />
            Reel (até ~15 min)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="radio"
              name="target"
              checked={target === "story"}
              onChange={() => setTarget("story")}
              className="accent-brand-primary"
            />
            Story (vídeo ≤ 60 s)
          </label>
        </div>

        {target === "reels" && (
          <label className="block space-y-2">
            <span className="text-xs font-medium text-zinc-400">
              Legenda do post (opcional, diferente do título no vídeo)
            </span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Legenda que aparece no feed / descrição do Reel…"
              className="w-full bg-zinc-900 border border-dashboard-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-brand-primary resize-y min-h-[80px]"
            />
          </label>
        )}

        <button
          type="button"
          disabled={mutation.isPending || !youtubeUrl.trim()}
          onClick={() => mutation.mutate()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {mutation.isPending ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Youtube size={20} />
          )}
          Importar e publicar
        </button>

        {mutation.isError && (
          <p className="text-sm text-red-400">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Erro"}
          </p>
        )}

        {mutation.isSuccess && mutation.data?.ok && (
          <div className="flex items-start gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-medium">
                Publicado como {mutation.data.target} — ID{" "}
                {mutation.data.instagramMediaId}
              </p>
              {mutation.data.cloudinaryUrl && (
                <p className="text-xs text-zinc-500 mt-1 break-all">
                  Vídeo enviado à Meta: {mutation.data.cloudinaryUrl}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500 space-y-2">
        <p>
          <strong className="text-zinc-400">API:</strong>{" "}
          <code className="text-zinc-400">CLOUDINARY_CLOUD_NAME</code>, preset
          de vídeo, <strong className="text-zinc-400">yt-dlp</strong> no
          servidor.
        </p>
      </div>
    </div>
  );
}
