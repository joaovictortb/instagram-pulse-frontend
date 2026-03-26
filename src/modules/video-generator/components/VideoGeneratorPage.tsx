import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Article } from "../hooks/useNewsList";
import { NewsSelectPanel } from "./NewsSelectPanel";
import {
  buildSceneImageUrlsPayload,
  creatomateGetRenderStatus,
  creatomateStartRenderFromArticle,
  DEFAULT_VIDEO_GEN_ENGINE,
  type CreatomateStatusResponse,
  type VideoGenEngine,
} from "../services/videoGeneratorPipeline";

const SCENE_IMAGE_LABELS = [
  "Cena 1 — intro (título)",
  "Cena 2 — resumo",
  "Cena 3 — texto da notícia",
  "Cena 4 — detalhes",
  "Cena 5 — encerramento",
] as const;

const DURATION_QUICK = [15, 30, 45, 60, 90, 120] as const;

const DEFAULT_ENGINE_LABEL =
  DEFAULT_VIDEO_GEN_ENGINE === "json2video" ? "JSON2Video" : "Creatomate";

/** POST /render-from-article faz tudo no servidor (vários minutos). */
const START_RENDER_TIMEOUT_MS = 55 * 60 * 1000;
/** Após ter id, consultar status do render (Creatomate ou JSON2Video) no máximo isto. */
const POLL_MAX_MS = 60 * 60 * 1000;

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export function VideoGeneratorPage() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(30);
  const [starting, setStarting] = useState(false);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [status, setStatus] = useState<CreatomateStatusResponse | null>(null);
  const [polling, setPolling] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [sceneImageFields, setSceneImageFields] = useState<
    [string, string, string, string, string]
  >(["", "", "", "", ""]);
  /** URLs efetivas devolvidas pela API no último render iniciado (útil para repetir ou ajustar). */
  const [lastRenderSceneImageUrls, setLastRenderSceneImageUrls] = useState<
    string[] | null
  >(null);
  /** Motor usado no último POST (Creatomate vs JSON2Video). */
  const activeVideoEngineRef = useRef<VideoGenEngine>(DEFAULT_VIDEO_GEN_ENGINE);
  const pollStartRef = useRef(0);

  const canStart = !!selectedArticle && !starting;

  const statusLabel = useMemo(() => {
    const st = status?.render?.status?.toLowerCase() || "";
    if (!st) return renderId ? "Consultando…" : "—";
    return st;
  }, [status, renderId]);

  const rawOutputUrl = status?.render?.url || null;
  /** Creatomate pode expor primeiro um snapshot .jpg em `url`; o MP4 termina em .mp4. */
  const videoUrl =
    rawOutputUrl && /\.mp4(\?|$)/i.test(rawOutputUrl) ? rawOutputUrl : null;
  const snapshotUrl =
    status?.render?.snapshot_url ||
    (rawOutputUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(rawOutputUrl)
      ? rawOutputUrl
      : null);
  const errorMsg = status?.render?.error || status?.error || null;

  useEffect(() => {
    if (!renderId) return;
    let cancelled = false;
    let timer: number | null = null;
    pollStartRef.current = Date.now();
    setClientError(null);

    async function tick() {
      if (cancelled) return;
      if (Date.now() - pollStartRef.current > POLL_MAX_MS) {
        setClientError(
          "Tempo esgotado a aguardar o vídeo (1 h). Verifica o dashboard do fornecedor (Creatomate / JSON2Video) ou tenta de novo.",
        );
        return;
      }
      try {
        setPolling(true);
        const next = await creatomateGetRenderStatus(
          renderId,
          activeVideoEngineRef.current,
        );
        if (!cancelled) setStatus(next);
        const st = (next.render?.status || "").toLowerCase();
        // Não parar só porque veio `url` — pode ser snapshot .jpg antes do MP4.
        const done =
          st === "completed" ||
          st === "failed" ||
          !!next.render?.error;
        if (!done && !cancelled) {
          timer = window.setTimeout(tick, 2500);
        }
      } finally {
        if (!cancelled) setPolling(false);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [renderId]);

  async function handleStartRender() {
    if (!selectedArticle) return;
    setStarting(true);
    setStatus(null);
    setRenderId(null);
    setClientError(null);
    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), START_RENDER_TIMEOUT_MS);
    try {
      const scenePayload = buildSceneImageUrlsPayload(sceneImageFields);
      const out = await creatomateStartRenderFromArticle(selectedArticle, {
        totalDurationSeconds,
        signal: ac.signal,
        ...(scenePayload ? { sceneImageUrls: scenePayload } : {}),
      });
      if (!out.ok || !out.render?.id) {
        throw new Error(out.error || "Falha ao iniciar render de vídeo");
      }
      const eng = (out.videoEngine as VideoGenEngine) ?? DEFAULT_VIDEO_GEN_ENGINE;
      activeVideoEngineRef.current = eng;
      setLastRenderSceneImageUrls(out.sceneImageUrls ?? null);
      setRenderId(out.render.id);
    } catch (e) {
      if (isAbortError(e)) {
        window.alert(
          "O pedido demorou mais de 55 minutos e foi interrompido no browser. A API pode ainda estar a processar — reduz cenas com IA (VIDEO_GEN_MAX_AI_SCENES no servidor) ou tenta outra vez.",
        );
      } else {
        const msg = e instanceof Error ? e.message : "Erro ao iniciar render";
        window.alert(msg);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setStarting(false);
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] min-h-[760px] mb-40">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left — News */}
        <div className="col-span-12 lg:col-span-3 h-full">
          <div className="glass-card h-full flex flex-col">
            <div className="p-4 border-b border-dashboard-border flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Fonte
                </div>
                <div className="mt-1 font-semibold text-zinc-100 truncate">
                  Notícias NFL (Supabase)
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur flex items-center justify-center text-zinc-300">
                <Film className="h-4 w-4" />
              </div>
            </div>
            <div className="p-4 pt-3 space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="video-duration"
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500"
                >
                  Duração total do vídeo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_QUICK.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={starting}
                      onClick={() => setTotalDurationSeconds(s)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors",
                        totalDurationSeconds === s
                          ? "border-brand-primary bg-brand-primary/15 text-zinc-100"
                          : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20",
                        starting && "opacity-50 pointer-events-none",
                      )}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="video-duration-num" className="text-xs text-zinc-500 shrink-0">
                    Ou
                  </label>
                  <input
                    id="video-duration-num"
                    type="number"
                    min={10}
                    max={180}
                    step={1}
                    value={totalDurationSeconds}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      setTotalDurationSeconds(Math.min(180, Math.max(10, Math.round(v))));
                    }}
                    disabled={starting}
                    className="w-full max-w-[100px] rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  />
                  <span className="text-xs text-zinc-500">s (10–180)</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Motor de render:{" "}
                  <span className="font-medium text-zinc-300">{DEFAULT_ENGINE_LABEL}</span>
                  <span className="text-zinc-600"> — variável </span>
                  <span className="font-mono text-[10px] text-zinc-500">VITE_VIDEO_GEN_ENGINE</span>
                </p>
                <p className="text-[11px] text-zinc-600 leading-snug">
                  O áudio e as legendas geram-se com mais texto quando o total é maior (ex.: 60s), para
                  reduzir silêncio vazio; o tempo final ainda é ajustado a este valor.
                </p>
              </div>

              <details className="rounded-lg border border-white/10 bg-zinc-900/40 px-3 py-2">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-zinc-400 select-none">
                  Imagens por cena (opcional)
                </summary>
                <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
                  Cola um URL HTTPS por cena (ex.: Cloudinary, CDN). Deixa vazio para gerar com IA
                  nas cenas em falta. Para &quot;editar&quot; um vídeo já feito, renderiza de novo com
                  estas URLs — o motor ativo (Creatomate ou JSON2Video) cria um job novo.
                </p>
                <div className="mt-3 space-y-2">
                  {SCENE_IMAGE_LABELS.map((label, i) => (
                    <div key={label}>
                      <label
                        className="block text-[10px] font-medium text-zinc-500 mb-1"
                        htmlFor={`scene-img-${i}`}
                      >
                        {label}
                      </label>
                      <input
                        id={`scene-img-${i}`}
                        type="url"
                        inputMode="url"
                        placeholder="https://…"
                        disabled={starting}
                        value={sceneImageFields[i]}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSceneImageFields((prev) => {
                            const next = [...prev] as string[];
                            next[i] = v;
                            return next as [string, string, string, string, string];
                          });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                    </div>
                  ))}
                </div>
              </details>

              <button
                type="button"
                onClick={() => void handleStartRender()}
                disabled={!canStart}
                className={cn(
                  "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  "bg-gradient-to-r from-brand-accent via-brand-primary to-brand-secondary text-white",
                  "shadow-[0_12px_36px_-18px_rgba(225,48,108,0.65)]",
                  "hover:brightness-110 active:scale-[0.99]",
                  (!canStart) &&
                    "opacity-50 cursor-not-allowed hover:brightness-100",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Film className="h-4 w-4" />
                  )}
                  Renderizar com {DEFAULT_ENGINE_LABEL}
                </span>
              </button>
              {starting && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/95 leading-relaxed">
                  A gerar imagens (DALL-E), narração e vídeo no servidor —{" "}
                  <strong className="text-amber-50">pode levar 5–25 minutos</strong>.
                  Não feches a página; o botão volta a ficar disponível quando terminar.
                </div>
              )}
              <div className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Fluxo único: a API gera tudo e só no fim devolve o MP4 (pedido longo).
              </div>
            </div>

            <div className="px-4 pb-4 min-h-0 flex-1">
              <NewsSelectPanel
                selectedId={selectedArticle?.dataSourceIdentifier ?? null}
                onSelect={setSelectedArticle}
              />
            </div>
          </div>
        </div>

        {/* Center/Right — Status */}
        <div className="col-span-12 lg:col-span-9 h-full min-h-0">
          <div className="glass-card h-full flex flex-col min-h-0">
            <div className="p-4 border-b border-dashboard-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Creatomate
                </div>
                <div className="mt-1 font-semibold text-zinc-100 truncate">
                  Render final (MP4)
                </div>
              </div>
              <div className="flex items-center gap-2">
                {polling || starting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : videoUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : renderId ? (
                  <Film className="h-4 w-4 text-brand-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-zinc-500" />
                )}
                <span className="text-xs text-zinc-400 tabular-nums">
                  {renderId ? `Status: ${statusLabel}` : "Selecione uma notícia e renderize"}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-4">
              {renderId && (
                <div className="text-xs text-zinc-500">
                  <span className="text-zinc-400">Render ID:</span>{" "}
                  <span className="font-mono">{renderId}</span>
                </div>
              )}

              {lastRenderSceneImageUrls && lastRenderSceneImageUrls.length === 5 && (
                <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-300">
                    URLs das 5 cenas (este render)
                  </summary>
                  <ol className="mt-3 list-decimal pl-5 space-y-2 text-[11px] text-zinc-400 break-all">
                    {lastRenderSceneImageUrls.map((u, i) => (
                      <li key={`${i}-${u.slice(0, 24)}`}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary/90 hover:underline"
                        >
                          {u}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {(errorMsg || clientError) && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {String(errorMsg || clientError)}
                </div>
              )}

              {snapshotUrl && !videoUrl && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-500 mb-2">
                    Pré-visualização (pode ser snapshot enquanto o MP4 renderiza)
                  </div>
                  <img
                    src={snapshotUrl}
                    alt=""
                    className="w-full max-w-[520px] rounded-lg border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {videoUrl ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm font-semibold text-emerald-100">
                      Render concluído (MP4)
                    </div>
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 text-xs font-bold hover:bg-emerald-500/25"
                    >
                      Abrir MP4 <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="text-xs text-emerald-100/80 break-all font-mono">
                    {videoUrl}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
                  {selectedArticle ? (
                    <div className="space-y-2">
                      <div className="text-zinc-200 font-semibold">
                        {selectedArticle.headline}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {selectedArticle.description || "Sem descrição"}
                      </div>
                      <div className="text-xs text-zinc-600">
                        Clique em <strong>Renderizar no Creatomate</strong> para iniciar.
                      </div>
                    </div>
                  ) : (
                    "Selecione uma notícia na coluna da esquerda."
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
