"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Youtube,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Type,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Wand2,
  Send,
  Captions,
  Clapperboard,
  ChevronRight,
  Search,
  Film,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { extractYoutubeVideoId, isYoutubeShortsUrl } from "@/src/lib/youtube";

type TitlePosition = "bottom" | "center" | "top";

type Result = {
  ok?: boolean;
  error?: string;
  target?: string;
  cloudinaryUrl?: string;
  cloudinaryOriginalUrl?: string;
  instagramMediaId?: string;
};

type VideoMeta = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
  width: number;
  height: number;
  isVertical: boolean;
  needsClipForStory: boolean;
  needsClipForReel: boolean;
};

type DiscoveryDurationFilter =
  | "shorts60"
  | "shorts90"
  | "shorts120"
  | "youtube_short"
  | "all";

type DiscoveryVideo = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  durationIso: string;
  durationSec: number;
  watchUrl: string;
  shortsUrl: string;
};

type CaptionTone = "informal" | "hype" | "jornalistico";

type SubtitleFontFamily = "Arial" | "Verdana" | "Helvetica" | "DejaVu Sans";

const SUBS_PREFS_STORAGE_KEY = "instapulse-youtube-import-subs-v1";

const inputCls =
  "w-full bg-zinc-900 border border-dashboard-border rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-brand-primary placeholder:text-zinc-600";
const selectCls =
  "w-full bg-zinc-900 border border-dashboard-border rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-brand-primary";

function formatViewCount(n: number) {
  return new Intl.NumberFormat("pt-PT", {
    notation: n >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatDurationVerbose(sec: number): string {
  if (sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StepHeader({
  step,
  title,
  subtitle,
  icon: Icon,
  iconClass,
}: {
  step: number;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  iconClass: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.08] bg-zinc-900/40 px-4 py-3 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-100 tabular-nums">
        {step}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <Icon className={iconClass} size={18} />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            {title}
          </h2>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function needsClip(meta: VideoMeta, target: "reels" | "story"): boolean {
  return target === "story" ? meta.needsClipForStory : meta.needsClipForReel;
}

export default function YoutubeImportPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [target, setTarget] = useState<"reels" | "story">("story");
  const [clipSeconds, setClipSeconds] = useState(0);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [subtitleLocale, setSubtitleLocale] = useState<"pt-BR" | "en">("pt-BR");
  const [subtitleFontSize, setSubtitleFontSize] = useState(14);
  const [subtitlePosition, setSubtitlePosition] =
    useState<TitlePosition>("bottom");
  const [subtitleFontFamily, setSubtitleFontFamily] =
    useState<SubtitleFontFamily>("Arial");
  const [subsPrefsReady, setSubsPrefsReady] = useState(false);

  const [caption, setCaption] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [titlePosition, setTitlePosition] = useState<TitlePosition>("bottom");
  const [titleColorHex, setTitleColorHex] = useState("ffffff");
  const [captionTone, setCaptionTone] = useState<CaptionTone>("informal");
  const [aiRecommendationsMd, setAiRecommendationsMd] = useState("");
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [processedAsset, setProcessedAsset] = useState<{
    secureUrl: string;
    publicId: string;
    key: string;
  } | null>(null);

  const [topicQuery, setTopicQuery] = useState("NFL");
  const [discoveryFilter, setDiscoveryFilter] =
    useState<DiscoveryDurationFilter>("shorts60");
  const [selectedDiscovery, setSelectedDiscovery] =
    useState<DiscoveryVideo | null>(null);

  const processVideoKey = useMemo(
    () =>
      JSON.stringify({
        u: youtubeUrl.trim(),
        c: clipSeconds,
        b: burnSubtitles,
        l: subtitleLocale,
        f: subtitleFontSize,
        p: subtitlePosition,
        ff: subtitleFontFamily,
        t: target,
      }),
    [
      youtubeUrl,
      clipSeconds,
      burnSubtitles,
      subtitleLocale,
      subtitleFontSize,
      subtitlePosition,
      subtitleFontFamily,
      target,
    ],
  );
  const processVideoKeyRef = useRef(processVideoKey);
  processVideoKeyRef.current = processVideoKey;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBS_PREFS_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<{
          burnSubtitles: boolean;
          subtitleFontSize: number;
          subtitlePosition: TitlePosition;
          subtitleFontFamily: SubtitleFontFamily;
        }>;
        if (typeof p.burnSubtitles === "boolean")
          setBurnSubtitles(p.burnSubtitles);
        if (
          typeof p.subtitleFontSize === "number" &&
          p.subtitleFontSize >= 8 &&
          p.subtitleFontSize <= 60
        ) {
          setSubtitleFontSize(p.subtitleFontSize);
        }
        if (
          p.subtitlePosition === "top" ||
          p.subtitlePosition === "center" ||
          p.subtitlePosition === "bottom"
        ) {
          setSubtitlePosition(p.subtitlePosition);
        }
        const ff = p.subtitleFontFamily;
        if (
          ff === "Arial" ||
          ff === "Verdana" ||
          ff === "Helvetica" ||
          ff === "DejaVu Sans"
        ) {
          setSubtitleFontFamily(ff);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSubsPrefsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!subsPrefsReady) return;
    try {
      localStorage.setItem(
        SUBS_PREFS_STORAGE_KEY,
        JSON.stringify({
          burnSubtitles,
          subtitleFontSize,
          subtitlePosition,
          subtitleFontFamily,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    subsPrefsReady,
    burnSubtitles,
    subtitleFontSize,
    subtitlePosition,
    subtitleFontFamily,
  ]);

  useEffect(() => {
    setProcessedAsset((prev) =>
      prev && prev.key !== processVideoKey ? null : prev,
    );
  }, [processVideoKey]);

  const videoId = useMemo(
    () => extractYoutubeVideoId(youtubeUrl),
    [youtubeUrl],
  );
  const isShorts = useMemo(() => isYoutubeShortsUrl(youtubeUrl), [youtubeUrl]);
  const urlMismatch = !!videoMeta && !!videoId && videoMeta.videoId !== videoId;

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`
    : null;

  const titleColorCss = useMemo(() => {
    const h = titleColorHex.replace(/^#/, "").trim();
    if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h}`;
    return "#ffffff";
  }, [titleColorHex]);

  useEffect(() => {
    if (!videoMeta) return;
    const clipNeeded = needsClip(videoMeta, target);
    if (!clipNeeded) {
      setClipSeconds(0);
      return;
    }
    setClipSeconds((prev) => {
      if (prev >= 15) {
        if (target === "story" && prev > 60) return 60;
        return prev;
      }
      return target === "story" ? 30 : 45;
    });
  }, [videoMeta, target]);

  const analyzeMutation = useMutation({
    mutationFn: async (urlOverride?: string) => {
      const u = (urlOverride ?? youtubeUrl).trim();
      if (u.length < 12) {
        throw new Error("Cola um URL válido do YouTube.");
      }
      const res = await apiFetch("/api/content/youtube-video-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: u }),
      });
      const data = await readJsonBody<
        VideoMeta & { ok?: boolean; error?: string }
      >(res);
      if (!res.ok) throw new Error(data.error || "Falha ao analisar o vídeo");
      return data;
    },
    onSuccess: (data) => {
      setVideoMeta({
        videoId: data.videoId,
        title: data.title,
        description: data.description,
        channelTitle: data.channelTitle,
        thumbnailUrl: data.thumbnailUrl,
        durationSec: data.durationSec,
        width: data.width,
        height: data.height,
        isVertical: data.isVertical,
        needsClipForStory: data.needsClipForStory,
        needsClipForReel: data.needsClipForReel,
      });
      setProcessedAsset(null);
      setGeneratedCaptions([]);
      setGeneratedHashtags([]);
    },
  });

  const discoveryQuery = useQuery({
    queryKey: [
      "youtube-nfl-discovery",
      topicQuery.trim() || "NFL",
      discoveryFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        topic: (topicQuery.trim() || "NFL").slice(0, 80),
        days: "7",
        maxResults: "12",
        durationFilter: discoveryFilter,
      });
      const res = await apiFetch(
        `/api/content/youtube-nfl-discovery?${params.toString()}`,
      );
      const data = await readJsonBody<{
        ok?: boolean;
        videos?: DiscoveryVideo[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Falha ao carregar vídeos");
      return data.videos ?? [];
    },
    staleTime: 5 * 60_000,
    enabled: false,
  });

  const recMutation = useMutation({
    mutationFn: async (videos: DiscoveryVideo[]) => {
      const res = await apiFetch(
        "/api/content/youtube-discovery/ai-recommendations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: (topicQuery.trim() || "NFL").slice(0, 80),
            videos: videos.map((v) => ({
              videoId: v.videoId,
              title: v.title.slice(0, 500),
              channelTitle: v.channelTitle,
              viewCount: v.viewCount,
              durationSec: v.durationSec,
              description: v.description.slice(0, 3500),
            })),
          }),
        },
      );
      const data = await readJsonBody<{
        ok?: boolean;
        markdown?: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Falha nas recomendações");
      return data.markdown ?? "";
    },
    onSuccess: (md) => setAiRecommendationsMd(md),
  });

  const captionMutation = useMutation({
    mutationFn: async () => {
      const m = videoMeta;
      if (!m) {
        throw new Error("Analisa o vídeo no passo 1 antes de gerar legendas.");
      }
      const res = await apiFetch(
        "/api/content/youtube-discovery/instagram-captions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: m.title,
            description: m.description,
            channelTitle: m.channelTitle,
            tone: captionTone,
          }),
        },
      );
      const data = await readJsonBody<{
        ok?: boolean;
        captions?: string[];
        hashtags?: string[];
        onVideoTitleSuggestion?: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Falha ao gerar legendas");
      return data;
    },
    onSuccess: (data) => {
      setGeneratedCaptions(data.captions ?? []);
      setGeneratedHashtags(data.hashtags ?? []);
      const first = data.captions?.[0]?.trim();
      if (first && target === "reels") setCaption(first);
      const overlay = data.onVideoTitleSuggestion?.trim();
      if (overlay) setVideoTitle(overlay.slice(0, 96));
    },
  });

  const clipInvalid =
    !!videoMeta &&
    needsClip(videoMeta, target) &&
    (clipSeconds < 15 || (target === "story" && clipSeconds > 60));

  const previewMutation = useMutation({
    mutationFn: async () => {
      const u = youtubeUrl.trim();
      if (!videoMeta) throw new Error("Analisa o vídeo primeiro.");
      if (clipInvalid) {
        throw new Error(
          target === "story"
            ? "Para Story, escolhe um corte entre 15 e 60 segundos."
            : "Para este vídeo longo, escolhe um corte de pelo menos 15s.",
        );
      }
      const res = await apiFetch("/api/content/youtube-processed-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: u,
          target,
          clipDurationSec: clipSeconds > 0 ? clipSeconds : undefined,
          burnSubtitles,
          subtitleLocale,
          subtitleFontSize: burnSubtitles ? subtitleFontSize : undefined,
          subtitlePosition: burnSubtitles ? subtitlePosition : undefined,
          subtitleFontFamily: burnSubtitles ? subtitleFontFamily : undefined,
        }),
      });
      const data = await readJsonBody<{
        ok?: boolean;
        secureUrl?: string;
        publicId?: string | null;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Falha na pré-visualização");
      return data;
    },
    onSuccess: (data) => {
      if (!data.secureUrl) return;
      const pid = data.publicId?.trim() ?? "";
      setProcessedAsset({
        secureUrl: data.secureUrl,
        publicId: pid,
        key: processVideoKeyRef.current,
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const reuse =
        processedAsset &&
        processedAsset.key === processVideoKey &&
        processedAsset.publicId
          ? {
              secureUrl: processedAsset.secureUrl,
              publicId: processedAsset.publicId,
            }
          : undefined;

      const base = {
        target,
        caption: caption.trim() || undefined,
        shareToFeed: true,
        videoTitle: videoTitle.trim() || undefined,
        titlePosition: videoTitle.trim() ? titlePosition : undefined,
        titleColorHex: videoTitle.trim() ? titleColorHex : undefined,
      };

      const body = reuse
        ? {
            ...base,
            reuseCloudinary: reuse,
            youtubeUrl: youtubeUrl.trim(),
          }
        : {
            ...base,
            youtubeUrl: youtubeUrl.trim(),
            clipDurationSec: clipSeconds > 0 ? clipSeconds : undefined,
            burnSubtitles: burnSubtitles ? true : undefined,
            subtitleLocale: burnSubtitles ? subtitleLocale : undefined,
            subtitleFontSize: burnSubtitles ? subtitleFontSize : undefined,
            subtitlePosition: burnSubtitles ? subtitlePosition : undefined,
            subtitleFontFamily: burnSubtitles ? subtitleFontFamily : undefined,
          };

      const res = await apiFetch("/api/content/youtube-to-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonBody<Result>(res);
      if (!res.ok) throw new Error(data.error || "Falha no pipeline");
      return data;
    },
  });

  const discoveryVideos = discoveryQuery.data ?? [];

  function selectDiscoveryVideo(v: DiscoveryVideo) {
    setSelectedDiscovery(v);
    const preferShorts =
      v.durationSec > 0 && v.durationSec <= 60 && v.shortsUrl;
    const url = preferShorts ? v.shortsUrl : v.watchUrl;
    setYoutubeUrl(url);
    setVideoMeta(null);
    setProcessedAsset(null);
    analyzeMutation.mutate(url);
  }

  const showStoryClipHint =
    videoMeta?.needsClipForStory &&
    target === "story" &&
    videoMeta.durationSec > 60;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <header className="mb-8 border-b border-white/[0.06] pb-6">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          <Youtube className="shrink-0 text-red-500" size={28} />
          YouTube → Instagram
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
          Cola o URL → analisamos a duração e o formato → defines o destino
          (Story ou Reel) e, se for preciso, o{" "}
          <span className="text-zinc-400">corte</span> para cumprir os limites
          do Instagram → geras legendas (Whisper + tradução) e vês a{" "}
          <span className="text-zinc-400">pré-visualização</span> com o aspeto
          final antes de publicar.
        </p>

        <ol className="mt-5 flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
          {[
            { n: 1, t: "URL + análise" },
            { n: 2, t: "Destino e corte" },
            { n: 3, t: "Legendas e estilo" },
            { n: 4, t: "Pré-visualizar" },
            { n: 5, t: "Publicar" },
          ].map((s, i) => (
            <li key={s.n} className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-bold text-zinc-300">
                {s.n}
              </span>
              <span className="text-zinc-400">{s.t}</span>
              {i < 4 ? (
                <ChevronRight
                  className="hidden h-3.5 w-3.5 text-zinc-600 sm:inline"
                  aria-hidden
                />
              ) : null}
            </li>
          ))}
        </ol>
      </header>

      <div
        className="mb-6 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-100/95"
        role="note"
      >
        <AlertTriangle className="shrink-0 text-amber-400/90" size={18} />
        <div>
          <p className="font-medium text-amber-100">Direitos de autor</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
            Só usa conteúdo que tenhas permissão para republicar. A ferramenta é
            técnica; a responsabilidade legal é tua.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:gap-8">
        <section className="glass-card overflow-hidden rounded-2xl border border-dashboard-border/80">
          <StepHeader
            step={1}
            title="URL do YouTube"
            subtitle="Vídeo normal, Shorts ou youtu.be — o mesmo fluxo para todos."
            icon={Search}
            iconClass="text-sky-400"
          />
          <div className="space-y-4 p-4 sm:p-5">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Ligação do vídeo
              </span>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setSelectedDiscovery(null);
                }}
                placeholder="https://www.youtube.com/watch?v=… ou /shorts/…"
                className={inputCls}
              />
            </label>
            {urlMismatch ? (
              <p className="text-xs text-amber-200/90">
                O URL mudou em relação ao vídeo analisado. Clica outra vez em
                &quot;Analisar vídeo&quot;.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!youtubeUrl.trim() || analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate(undefined)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-45"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Film size={18} />
                )}
                Analisar vídeo
              </button>
              <span className="text-xs text-zinc-600">
                Consulta metadados (duração, formato) sem descarregar o ficheiro
                completo.
              </span>
            </div>
            {analyzeMutation.isError && (
              <p className="text-sm text-red-400">
                {analyzeMutation.error instanceof Error
                  ? analyzeMutation.error.message
                  : "Erro"}
              </p>
            )}
          </div>
        </section>

        {videoMeta && !urlMismatch ? (
          <section className="glass-card overflow-hidden rounded-2xl border border-dashboard-border/80">
            <StepHeader
              step={2}
              title="Resumo e destino"
              subtitle="Story tem máximo 60s. Vídeos longos precisam de corte; o servidor usa yt-dlp + ffmpeg."
              icon={TrendingUp}
              iconClass="text-emerald-400"
            />
            <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2 lg:gap-8">
              <div className="flex gap-4 rounded-xl border border-white/[0.06] bg-zinc-950/50 p-3">
                {videoMeta.thumbnailUrl ? (
                  <img
                    src={videoMeta.thumbnailUrl}
                    alt=""
                    className="h-24 w-40 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-600">
                    <Youtube size={32} />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <p className="line-clamp-2 text-sm font-medium text-zinc-100">
                    {videoMeta.title || "Sem título"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {videoMeta.channelTitle}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Duração:{" "}
                    <span className="font-medium text-zinc-200">
                      {formatDurationVerbose(videoMeta.durationSec)}
                    </span>
                    {videoMeta.width > 0 && videoMeta.height > 0 ? (
                      <>
                        {" "}
                        · {videoMeta.width}×{videoMeta.height}
                        {videoMeta.isVertical ? " · vertical" : " · horizontal"}
                      </>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {videoMeta.needsClipForStory ? (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200/90">
                        &gt;60s — corte obrigatório para Story
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">
                        ≤60s — ok para Story sem corte
                      </span>
                    )}
                    {videoMeta.needsClipForReel ? (
                      <span className="rounded-md bg-zinc-700/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        &gt;15 min — corte recomendado para Reel
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <fieldset className="space-y-2 rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4">
                  <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Onde publicar
                  </legend>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-300 has-[:checked]:border-brand-primary/50 has-[:checked]:bg-brand-primary/5">
                      <input
                        type="radio"
                        name="target"
                        checked={target === "story"}
                        onChange={() => setTarget("story")}
                        className="accent-brand-primary"
                      />
                      Story (máx. 60s)
                    </label>
                    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-300 has-[:checked]:border-brand-primary/50 has-[:checked]:bg-brand-primary/5">
                      <input
                        type="radio"
                        name="target"
                        checked={target === "reels"}
                        onChange={() => setTarget("reels")}
                        className="accent-brand-primary"
                      />
                      Reel
                    </label>
                  </div>
                </fieldset>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Corte a partir do início
                  </span>
                  <select
                    value={clipSeconds}
                    onChange={(e) => setClipSeconds(Number(e.target.value))}
                    disabled={videoMeta ? !needsClip(videoMeta, target) : true}
                    className={selectCls + " disabled:opacity-45"}
                  >
                    {videoMeta && !needsClip(videoMeta, target) ? (
                      <option value={0}>
                        Sem corte (vídeo dentro do limite)
                      </option>
                    ) : null}
                    {videoMeta && needsClip(videoMeta, target) ? (
                      <>
                        <option value={15}>15 s</option>
                        <option value={30}>30 s</option>
                        <option value={45}>45 s</option>
                        <option value={60}>
                          60 s
                          {target === "reels" ? " (trecho)" : " (máx. Story)"}
                        </option>
                        {target === "reels" ? (
                          <>
                            <option value={90}>90 s</option>
                            <option value={120}>2 min</option>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </select>
                  {showStoryClipHint ? (
                    <p className="text-[11px] leading-relaxed text-amber-200/85">
                      O vídeo original ultrapassa 60s. Para Story, o Instagram
                      só aceita até 60s — escolhe quantos segundos queres do{" "}
                      <strong className="font-medium text-amber-100/90">
                        início
                      </strong>
                      .
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-600">
                      yt-dlp + ffmpeg no servidor.
                    </p>
                  )}
                  {clipInvalid ? (
                    <p className="text-xs text-red-400">
                      Ajusta o corte: Story entre 15 e 60s; Reel longo precisa
                      de pelo menos 15s de corte.
                    </p>
                  ) : null}
                </label>
              </div>
            </div>
          </section>
        ) : null}

        {videoMeta && !urlMismatch ? (
          <section className="glass-card overflow-hidden rounded-2xl border border-dashboard-border/80">
            <StepHeader
              step={3}
              title="Legendas no vídeo"
              subtitle="Whisper (EN) + tradução para PT quando ativas. Ajusta fonte, tamanho e posição — depois gera a pré-visualização."
              icon={Captions}
              iconClass="text-cyan-400"
            />
            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
              <fieldset className="space-y-3 rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4">
                <legend className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Captions size={14} className="text-cyan-400" />
                  Queimar legendas no MP4
                </legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={burnSubtitles}
                    onChange={(e) => setBurnSubtitles(e.target.checked)}
                    className="mt-0.5 accent-brand-primary"
                  />
                  <span className="text-sm text-zinc-300">
                    <span className="font-medium text-zinc-200">
                      Legendas em português (áudio em inglês)
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                      Extrai áudio → Whisper → tradução (se PT) → ffmpeg. Exige{" "}
                      <code className="text-zinc-400">OPENAI_API_KEY</code> no
                      servidor.
                    </span>
                  </span>
                </label>
                {burnSubtitles && (
                  <div className="space-y-3 pl-1">
                    <p className="text-[11px] text-emerald-500/90">
                      Preferências guardadas neste browser.
                    </p>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] text-zinc-500">
                        Idioma das legendas
                      </span>
                      <select
                        value={subtitleLocale}
                        onChange={(e) =>
                          setSubtitleLocale(e.target.value as "pt-BR" | "en")
                        }
                        className={selectCls}
                      >
                        <option value="pt-BR">
                          Português (tradução a partir do Whisper EN)
                        </option>
                        <option value="en">Inglês (só Whisper)</option>
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] text-zinc-500">Fonte</span>
                      <select
                        value={subtitleFontFamily}
                        onChange={(e) =>
                          setSubtitleFontFamily(
                            e.target.value as SubtitleFontFamily,
                          )
                        }
                        className={selectCls}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="DejaVu Sans">DejaVu Sans</option>
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] text-zinc-500">
                        Tamanho (px)
                      </span>
                      <select
                        value={subtitleFontSize}
                        onChange={(e) =>
                          setSubtitleFontSize(Number(e.target.value))
                        }
                        className={selectCls}
                      >
                        {[
                          8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 50, 60,
                        ].map((n) => (
                          <option key={n} value={n}>
                            {n}px{n === 14 ? " — padrão" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[11px] text-zinc-500">Posição</span>
                      <select
                        value={subtitlePosition}
                        onChange={(e) =>
                          setSubtitlePosition(e.target.value as TitlePosition)
                        }
                        className={selectCls}
                      >
                        <option value="bottom">Inferior</option>
                        <option value="center">Centro</option>
                        <option value="top">Superior</option>
                      </select>
                    </label>
                  </div>
                )}
              </fieldset>

              <div className="space-y-3 rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  IA — texto do post (opcional)
                </p>
                <p className="text-xs text-zinc-500">
                  Gera variantes de legenda e hashtags a partir do título e
                  descrição do vídeo analisado.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-[140px] flex-1 space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Tom
                    </span>
                    <select
                      value={captionTone}
                      onChange={(e) =>
                        setCaptionTone(e.target.value as CaptionTone)
                      }
                      className={selectCls}
                    >
                      <option value="informal">Descontraído</option>
                      <option value="hype">Hype</option>
                      <option value="jornalistico">Jornalístico</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={captionMutation.isPending}
                    onClick={() => captionMutation.mutate()}
                    className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-45"
                  >
                    {captionMutation.isPending ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Wand2 size={18} />
                    )}
                    Gerar
                  </button>
                </div>
                {captionMutation.isError && (
                  <p className="text-sm text-red-400">
                    {captionMutation.error instanceof Error
                      ? captionMutation.error.message
                      : "Erro"}
                  </p>
                )}
                {generatedCaptions.length > 0 ? (
                  <div className="space-y-2 border-t border-white/[0.06] pt-3">
                    {generatedCaptions.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => target === "reels" && setCaption(c)}
                        disabled={target !== "reels"}
                        className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-left text-xs leading-snug text-zinc-200 transition hover:border-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="font-semibold text-zinc-500">
                          {i + 1}.{" "}
                        </span>
                        <span className="line-clamp-3">{c}</span>
                      </button>
                    ))}
                    {generatedHashtags.length > 0 ? (
                      <p className="break-all text-[11px] text-zinc-500">
                        {generatedHashtags.join(" ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {videoMeta && !urlMismatch ? (
          <section className="glass-card overflow-hidden rounded-2xl border border-dashboard-border/80">
            <StepHeader
              step={4}
              title="Pré-visualizar e publicar"
              subtitle="Gera o MP4 na Cloudinary (o mesmo ficheiro que vai para o Instagram). Alteraste fonte ou posição? Volta a gerar aqui."
              icon={Send}
              iconClass="text-brand-primary"
            />
            <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2 lg:gap-8">
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={previewMutation.isPending || clipInvalid}
                  onClick={() => previewMutation.mutate()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-45 sm:w-auto"
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Clapperboard size={18} />
                  )}
                  {burnSubtitles
                    ? "Gerar pré-visualização (com legendas)"
                    : "Gerar pré-visualização (sem legendas)"}
                </button>
                {previewMutation.isError && (
                  <p className="text-sm text-red-400">
                    {previewMutation.error instanceof Error
                      ? previewMutation.error.message
                      : "Erro"}
                  </p>
                )}

                {processedAsset &&
                processedAsset.key === processVideoKey &&
                processedAsset.secureUrl ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">
                      Pré-visualização (Cloudinary)
                    </span>
                    <video
                      key={processedAsset.secureUrl}
                      src={processedAsset.secureUrl}
                      controls
                      playsInline
                      className={`w-full rounded-xl border border-emerald-500/25 bg-black ${
                        isShorts || videoMeta.isVertical
                          ? "aspect-9/16 max-w-[280px]"
                          : "aspect-video max-w-xl"
                      }`}
                    />
                    <p className="text-[11px] text-zinc-500">
                      {burnSubtitles
                        ? "Legendas gravadas com as definições atuais — muda no passo 3 e gera de novo se precisares."
                        : "Clip sem legendas queimadas."}
                      {processedAsset.publicId
                        ? " «Importar e publicar» reutiliza este upload."
                        : ""}
                    </p>
                  </div>
                ) : burnSubtitles ? (
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-200/90">
                    Gera a pré-visualização para veres o vídeo cortado com
                    legendas antes de publicares.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600">
                    Ainda sem pré-visualização. Clica no botão acima.
                  </p>
                )}

                {embedUrl ? (
                  <details className="group rounded-xl border border-white/10 bg-zinc-950/40">
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-zinc-400 group-open:text-zinc-300">
                      Original no YouTube
                    </summary>
                    <div className="border-t border-white/8 p-3">
                      <div
                        className={`relative mx-auto w-full overflow-hidden rounded-lg border border-white/10 bg-black ${
                          isShorts || videoMeta.isVertical
                            ? "aspect-9/16 max-w-[220px]"
                            : "aspect-video max-w-lg"
                        }`}
                      >
                        <iframe
                          title="YouTube"
                          src={embedUrl}
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </details>
                ) : null}
              </div>

              <div className="flex flex-col gap-5">
                <fieldset className="space-y-3 rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4">
                  <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Título no vídeo (opcional, Cloudinary)
                  </legend>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Type size={16} className="shrink-0 text-brand-primary" />
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Texto sobre o vídeo"
                      maxLength={96}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] text-zinc-500">Posição</span>
                      <select
                        value={titlePosition}
                        onChange={(e) =>
                          setTitlePosition(e.target.value as TitlePosition)
                        }
                        disabled={!videoTitle.trim()}
                        className={selectCls + " disabled:opacity-40"}
                      >
                        <option value="bottom">Inferior</option>
                        <option value="center">Centro</option>
                        <option value="top">Superior</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] text-zinc-500">Cor</span>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={titleColorCss}
                          onChange={(e) =>
                            setTitleColorHex(e.target.value.replace("#", ""))
                          }
                          disabled={!videoTitle.trim()}
                          className="h-[42px] w-14 cursor-pointer rounded-lg border border-dashboard-border bg-zinc-900 disabled:opacity-40"
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
                          className={
                            inputCls +
                            " font-mono uppercase disabled:opacity-40"
                          }
                        />
                      </div>
                    </label>
                  </div>
                </fieldset>

                {target === "reels" && (
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Legenda do Reel
                    </span>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={3}
                      placeholder="Texto do post no feed…"
                      className={inputCls + " min-h-[88px] resize-y"}
                    />
                  </label>
                )}

                <button
                  type="button"
                  disabled={
                    mutation.isPending || !youtubeUrl.trim() || clipInvalid
                  }
                  onClick={() => mutation.mutate()}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-45 sm:w-auto sm:min-w-[220px] sm:px-8"
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
                  <div className="flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="font-medium text-emerald-100">
                        Publicado ({mutation.data.target}) —{" "}
                        {mutation.data.instagramMediaId}
                      </p>
                      {mutation.data.cloudinaryUrl && (
                        <p className="mt-1 break-all text-xs text-emerald-200/70">
                          {mutation.data.cloudinaryUrl}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <details className="glass-card mt-10 overflow-hidden rounded-2xl border border-dashboard-border/60">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-300 sm:px-5">
          Explorar vídeos por tema (opcional)
        </summary>
        <div className="border-t border-white/[0.06] p-4 sm:p-5">
          <p className="mb-4 text-xs text-zinc-500">
            Pesquisa na API do YouTube. Ao escolheres um cartão, o URL é
            preenchido e a análise corre automaticamente.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <label className="space-y-1.5 lg:col-span-4">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Pesquisa
              </span>
              <input
                type="text"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="Ex.: NFL"
                maxLength={80}
                className={inputCls}
              />
            </label>
            <label className="space-y-1.5 lg:col-span-5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Duração máxima
              </span>
              <select
                value={discoveryFilter}
                onChange={(e) =>
                  setDiscoveryFilter(e.target.value as DiscoveryDurationFilter)
                }
                className={selectCls}
              >
                <option value="shorts60">≤60s (Shorts)</option>
                <option value="shorts90">≤90s</option>
                <option value="shorts120">≤2 min</option>
                <option value="youtube_short">
                  Curtos YouTube (&lt;4 min)
                </option>
                <option value="all">Sem limite</option>
              </select>
            </label>
            <div className="flex sm:col-span-2 lg:col-span-3">
              <button
                type="button"
                onClick={() => discoveryQuery.refetch()}
                disabled={discoveryQuery.isFetching}
                className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {discoveryQuery.isFetching ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <RefreshCw size={18} />
                )}
                Carregar lista
              </button>
            </div>
          </div>

          {discoveryQuery.isError && (
            <p className="mt-3 text-sm text-red-400">
              {discoveryQuery.error instanceof Error
                ? discoveryQuery.error.message
                : "Erro"}
            </p>
          )}

          {discoveryQuery.isSuccess && discoveryVideos.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              Nada encontrado. Clica em «Carregar lista» depois de ajustar os
              filtros.
            </p>
          )}

          {discoveryVideos.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {discoveryVideos.map((v) => {
                const active = selectedDiscovery?.videoId === v.videoId;
                return (
                  <li key={v.videoId}>
                    <button
                      type="button"
                      onClick={() => selectDiscoveryVideo(v)}
                      className={`group w-full overflow-hidden rounded-xl border text-left transition ${
                        active
                          ? "border-brand-primary ring-2 ring-brand-primary/30"
                          : "border-white/10 hover:border-white/20"
                      } bg-zinc-950/90`}
                    >
                      <div className="relative aspect-video bg-black">
                        <img
                          src={v.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                        />
                        {v.durationSec > 0 && v.durationSec <= 60 && (
                          <span className="absolute right-2 top-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Short
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-100">
                          {v.title}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {v.channelTitle} · {formatViewCount(v.viewCount)}{" "}
                          views
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              disabled={
                recMutation.isPending ||
                discoveryVideos.length === 0 ||
                discoveryQuery.isFetching
              }
              onClick={() => recMutation.mutate(discoveryVideos)}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-45"
            >
              {recMutation.isPending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              Recomendações IA
            </button>
          </div>

          {aiRecommendationsMd.trim() ? (
            <div className="mt-4 max-h-[min(24rem,50vh)] overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-950/60 p-4">
              <div className="prose prose-invert prose-sm max-w-none text-zinc-300 markdown-body prose-p:leading-relaxed">
                <ReactMarkdown>{aiRecommendationsMd}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>
      </details>

      <footer className="mt-8 border-t border-white/[0.06] pt-4 text-[11px] leading-relaxed text-zinc-600">
        <code className="text-zinc-500">YOUTUBE_API_KEY</code> (descoberta),{" "}
        <code className="text-zinc-500">OPENAI_API_KEY</code>,{" "}
        <code className="text-zinc-500">CLOUDINARY_*</code>, yt-dlp, ffmpeg.
      </footer>
    </div>
  );
}
