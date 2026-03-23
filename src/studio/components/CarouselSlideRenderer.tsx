/**
 * Renderização de um slide do carrossel (guia visual).
 * Templates com identidade NFL (cores navy/vermelho, broadcast, revista esportiva).
 * Breaking, team_hero e players_list mantêm layouts dedicados.
 */

import React, { useState, useEffect } from "react";
import { Share2 } from "lucide-react";
import { cn } from "../lib/utils";
import type {
  CarouselSlideConfig,
  CarouselSlideItem,
  CarouselTextOptions,
  CarouselVisualTemplateId,
} from "../types/carousel";

const PLACEHOLDER_IMAGE = "https://picsum.photos/seed/nfl/1080/1080";

const DEFAULT_CONFIG: CarouselSlideConfig = {
  primaryColor: "#ffffff",
  textColor: "#000000",
  secondaryColor: "#000000",
  imageOverlayOpacity: 0.4,
};

function isValidImageSrc(src: string | undefined): boolean {
  if (!src || !src.trim()) return false;
  const s = src.trim();
  return (
    s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")
  );
}

/** Classes de título (capa), título secundário, conteúdo e line-clamp a partir de textOptions. */
function getTextClasses(opts: CarouselTextOptions | undefined) {
  const ts = opts?.titleSize ?? "medium";
  const cs = opts?.contentSize ?? "medium";
  const maxLines = opts?.descriptionMaxLines ?? 5;
  return {
    titleMain: cn(
      ts === "small" && "text-2xl sm:text-3xl",
      ts === "medium" && "text-4xl sm:text-5xl",
      ts === "large" && "text-5xl sm:text-6xl",
    ),
    titleSecondary: cn(
      ts === "small" && "text-base sm:text-lg",
      ts === "medium" && "text-xl sm:text-2xl",
      ts === "large" && "text-2xl sm:text-3xl",
    ),
    content: cn(
      cs === "small" && "text-xs sm:text-sm",
      cs === "medium" && "text-sm sm:text-base",
      cs === "large" && "text-base sm:text-lg",
    ),
    lineClamp:
      maxLines === "unlimited"
        ? ""
        : maxLines <= 3
          ? "line-clamp-3"
          : maxLines <= 5
            ? "line-clamp-5"
            : maxLines <= 8
              ? "line-clamp-[8]"
              : "line-clamp-[12]",
  };
}

/** Proporção do slide (1:1 quadrado ou 4:5 para feed Instagram). */
export type CarouselAspectRatio = "1:1" | "4:5";

export type ImagePosition = "top" | "center" | "bottom";

export const SlideRendererGuia = React.forwardRef<
  HTMLDivElement,
  {
    slide: CarouselSlideItem;
    templateId: CarouselVisualTemplateId;
    config?: CarouselSlideConfig;
    textOptions?: CarouselTextOptions;
    /** Posição vertical da imagem de fundo (top / center / bottom). */
    imagePosition?: ImagePosition;
    /** Deslocamento horizontal da imagem (-40 a +40). */
    imageHorizontalOffset?: number;
    /** Proporção do slide. 4:5 = 1080×1350 para Instagram. */
    aspectRatio?: CarouselAspectRatio;
    forcePlaceholderImage?: boolean;
    teamLogo?: string | null;
  }
>(
  (
    {
      slide,
      templateId,
      config: configProp,
      textOptions,
      imagePosition = "center",
      imageHorizontalOffset = 0,
      aspectRatio = "1:1",
      forcePlaceholderImage = false,
      teamLogo,
    },
    ref,
  ) => {
    const config = { ...DEFAULT_CONFIG, ...configProp };
    const tx = getTextClasses(textOptions);
    const bgUrl =
      slide.type === "image" || slide.image ? slide.image : PLACEHOLDER_IMAGE;
    const intendedUrl = isValidImageSrc(bgUrl)
      ? bgUrl!.trim()
      : PLACEHOLDER_IMAGE;
    const [imgError, setImgError] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const imageUrl =
      forcePlaceholderImage || imgError ? PLACEHOLDER_IMAGE : intendedUrl;
    useEffect(() => setImgError(false), [slide.id, intendedUrl]);
    useEffect(() => setLogoError(false), [teamLogo]);
    const showTeamLogo = isValidImageSrc(teamLogo ?? undefined) && !logoError;

    const imagePositionClass =
      imagePosition === "top"
        ? "object-top"
        : imagePosition === "bottom"
          ? "object-bottom"
          : "object-center";
    const imageObjectPositionStyle: React.CSSProperties = {
      objectPosition: `${50 + imageHorizontalOffset}% ${
        imagePosition === "top"
          ? "0%"
          : imagePosition === "bottom"
            ? "100%"
            : "50%"
      }`,
    };

    const base = cn(
      "relative flex w-full flex-col overflow-hidden",
      aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-square",
    );
    const id = `slide-${slide.id}`;
    /** Opacidade do overlay escuro sobre a imagem (0–1); em 0 não renderizamos overlay nem gradientes fixos. */
    const overlayOpacity = Math.max(
      0,
      Math.min(1, config?.imageOverlayOpacity ?? 0.4),
    );
    const showOverlay = overlayOpacity > 0;
    const overlayStyle: React.CSSProperties = showOverlay
      ? { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }
      : {};

    // ——— EDITORIAL: estilo revista esportiva NFL — contraste alto, faixa navy, sem “cinza editorial”
    if (templateId === "editorial") {
      const stripe = config.secondaryColor || "#013369";
      return (
        <div
          ref={ref}
          className={cn(base, "bg-[#0b1120] font-sans text-white")}
          id={id}
        >
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className={cn("h-full w-full object-cover", imagePositionClass)}
              style={imageObjectPositionStyle}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/75 to-[#0b1120]/30" />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-multiply"
                style={overlayStyle}
              />
            )}
          </div>
          <div
            className="absolute left-0 top-0 z-[1] h-full w-1.5"
            style={{ backgroundColor: stripe }}
          />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-8 sm:p-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="inline-flex items-center gap-2">
                  <span className="rounded-sm bg-[#D50A0A] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    NFL
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/60">
                    {slide.subtitle ?? "News"}
                  </span>
                </div>
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/25 bg-black/50">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain p-1"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>

            {slide.type === "title" && (
              <div className="mt-auto max-w-[95%]">
                <h1
                  className={cn(
                    "font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-lg",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
                <div
                  className="mt-4 h-1 w-16 rounded-full"
                  style={{ backgroundColor: stripe }}
                />
              </div>
            )}
            {slide.type === "content" && (
              <div className="mt-auto rounded-2xl border border-white/10 bg-black/55 p-5 backdrop-blur-md">
                <h2
                  className={cn(
                    "font-black uppercase tracking-wide text-[#D50A0A]",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "mt-3 font-medium leading-relaxed text-white/90",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div className="mt-auto max-w-[95%]">
                <h2
                  className={cn(
                    "font-black uppercase leading-tight tracking-tight text-white drop-shadow-md",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-3 max-w-[92%] border-l-2 border-[#D50A0A]/80 pl-4 font-medium leading-relaxed text-white/85",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-black/40">
                  <Share2 className="h-7 w-7 text-[#D50A0A]" />
                </div>
                <h2
                  className={cn(
                    "font-black uppercase tracking-tight text-white",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                <p className={cn("mt-2 text-white/75", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— BRUTALIST: “endzone” NFL — alto contraste, tarjas diagonais, sem borda pesada genérica
    if (templateId === "brutalist") {
      const accent = config.primaryColor || "#D50A0A";
      const frame = config.secondaryColor || "#ffffff";
      return (
        <div
          ref={ref}
          className={cn(base, "border-[6px] bg-[#0f172a] font-sans text-white")}
          style={{ borderColor: frame }}
          id={id}
        >
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-55"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#0f172a]/90 to-black/95" />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none opacity-80"
                style={overlayStyle}
              />
            )}
          </div>
          <div
            className="absolute -right-8 top-1/4 z-[1] h-40 w-[140%] -rotate-6 opacity-90"
            style={{ backgroundColor: accent }}
          />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="font-mono text-[10px] font-bold uppercase leading-tight tracking-widest text-white/90">
                <div className="bg-black px-2 py-1 text-white">
                  NFL · {slide.subtitle ?? "WIRE"}
                </div>
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-11 w-11 shrink-0 border-2 border-white bg-black">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>

            {slide.type === "title" && (
              <div className="mt-auto">
                <h1
                  className={cn(
                    "font-black uppercase leading-[0.85] tracking-tighter text-white",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-white" />
                  <span className="font-mono text-[10px] font-bold uppercase text-white/70">
                    Game day
                  </span>
                </div>
              </div>
            )}
            {slide.type === "content" && (
              <div className="mt-auto border-l-4 border-white bg-black/70 p-4 pl-5">
                <h2
                  className={cn(
                    "font-black uppercase tracking-wide text-white",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn("mt-2 text-white/90", tx.content, tx.lineClamp)}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div className="mt-auto">
                <h2
                  className={cn(
                    "font-black uppercase leading-tight text-white",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-3 font-mono text-[11px] font-bold uppercase leading-relaxed text-white/80",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="flex flex-col items-center text-center">
                <h1
                  className={cn(
                    "font-black uppercase leading-[0.9] tracking-tight",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
                <p className={cn("mt-3 max-w-[90%] text-white/80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— BREAKING NEWS: urgente, telejornal (guia §3)
    if (templateId === "breaking") {
      return (
        <div ref={ref} className={cn(base, "bg-[#0a0a0a] text-white")} id={id}>
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
            {showOverlay && (
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            )}
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <div className="flex items-start justify-between">
              <div className="skew-x-[-10deg] bg-[#D50A0A] px-3 py-1 text-sm font-black italic text-white">
                BREAKING
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-14 w-14 overflow-hidden rounded-full -mt-3">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>
            {slide.type === "title" && (
              <h1
                className={cn(
                  "font-black leading-[0.9] uppercase italic tracking-tighter drop-shadow-2xl",
                  tx.titleMain,
                )}
              >
                {slide.title}
              </h1>
            )}
            {slide.type === "content" && (
              <div className="bg-black/40 p-4 backdrop-blur-sm border-l-4 border-[#D50A0A]">
                <h2
                  className={cn(
                    "font-black uppercase tracking-widest text-white/60",
                    tx.content,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 leading-relaxed text-white/90",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div>
                <h2
                  className={cn(
                    "font-black italic drop-shadow-2xl",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 leading-relaxed text-white/90 drop-shadow-lg",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="flex flex-col items-center text-center">
                <Share2 className="mb-4 h-16 w-16 text-[#D50A0A]" />
                <h2 className={cn("font-black italic", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 text-white/80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— MAGAZINE: capa SI / ESPN — moldura, masthead, foto full-bleed com gradiente
    if (templateId === "magazine") {
      const mast = config.secondaryColor || "#013369";
      return (
        <div ref={ref} className={cn(base, "bg-[#050505] text-white")} id={id}>
          <div className="absolute inset-3 z-0 overflow-hidden rounded-xl border border-white/15">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className="inline-block px-3 py-1 text-[11px] font-black uppercase tracking-[0.35em]"
                  style={{ backgroundColor: mast, color: "#fff" }}
                >
                  NFL Brasil
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-white/60">
                  {new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-11 w-11 shrink-0 rounded-full border border-white/30 bg-black/60 p-1">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>

            <div className="mt-auto">
              {slide.type === "title" && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D50A0A]">
                    {slide.subtitle ?? "Cover story"}
                  </p>
                  <h1
                    className={cn(
                      "mt-2 font-black uppercase leading-[0.95] tracking-tight text-white",
                      tx.titleMain,
                    )}
                  >
                    {slide.title}
                  </h1>
                </>
              )}
              {slide.type === "content" && (
                <div className="rounded-xl border border-white/10 bg-black/65 p-4 backdrop-blur-sm">
                  <h2
                    className={cn(
                      "font-black uppercase tracking-wide text-white",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </h2>
                  <p
                    className={cn(
                      "mt-2 leading-relaxed text-white/88",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                </div>
              )}
              {slide.type === "image" && (
                <div>
                  <h2
                    className={cn(
                      "font-black uppercase leading-tight text-white drop-shadow-lg",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </h2>
                  {slide.content && (
                    <p
                      className={cn(
                        "mt-2 text-white/90",
                        tx.content,
                        tx.lineClamp,
                      )}
                    >
                      {slide.content}
                    </p>
                  )}
                </div>
              )}
              {slide.type === "cta" && (
                <div className="text-center">
                  <Share2 className="mx-auto mb-3 h-10 w-10 text-[#D50A0A]" />
                  <h2
                    className={cn(
                      "font-black uppercase tracking-tight",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </h2>
                  <p className={cn("mt-2 text-white/75", tx.content)}>
                    {slide.content}
                  </p>
                </div>
              )}
              <p className="mt-4 border-t border-white/15 pt-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/45">
                NFL Studio Brasil · análise & destaques
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ——— SOCIAL: feed Instagram dark mode + identidade NFL
    if (templateId === "social") {
      const ring = config.primaryColor || "#D50A0A";
      return (
        <div ref={ref} className={cn(base, "bg-[#0a0a0a] text-white")} id={id}>
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-black/50 p-0.5"
                style={{ borderColor: ring }}
              >
                {showTeamLogo && teamLogo ? (
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full rounded-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="text-[10px] font-black text-white">NFL</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">nflstudio.br</div>
                <div className="truncate text-[11px] text-white/50">
                  {slide.subtitle ?? "Atualização · NFL"}
                </div>
              </div>
              <div className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                Seguir
              </div>
            </div>

            {slide.type === "title" && (
              <h1
                className={cn(
                  "font-black leading-[1.05] tracking-tight text-white drop-shadow-lg",
                  tx.titleMain,
                )}
              >
                {slide.title}
              </h1>
            )}
            {slide.type === "content" && (
              <div className="rounded-2xl border border-white/10 bg-black/55 p-5 backdrop-blur-md">
                <h2 className={cn("font-black text-white", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 leading-relaxed text-white/90",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div className="mt-auto space-y-3">
                <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                  <img
                    src={imageUrl}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2
                    className={cn(
                      "font-black text-white drop-shadow-md",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </h2>
                  {slide.content && (
                    <p
                      className={cn(
                        "mt-1 text-white/88",
                        tx.content,
                        tx.lineClamp,
                      )}
                    >
                      {slide.content}
                    </p>
                  )}
                </div>
              </div>
            )}
            {slide.type === "cta" && (
              <div className="flex flex-col items-center text-center">
                <Share2 className="mb-2 h-11 w-11 text-[#D50A0A]" />
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 text-white/80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/45">
              <span>♥ Curtir</span>
              <span>Comentar</span>
              <span>Enviar</span>
            </div>
          </div>
        </div>
      );
    }

    // ——— STATS: placar / “stat line” NFL
    if (templateId === "stats") {
      const line = config.secondaryColor || "#013369";
      return (
        <div ref={ref} className={cn(base, "bg-[#020617] text-white")} id={id}>
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-35"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a]/95 to-[#020617]" />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none opacity-70"
                style={overlayStyle}
              />
            )}
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-7">
            <header className="flex items-center justify-between gap-3 border-b-2 border-white/15 pb-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-10 rounded-full"
                  style={{ backgroundColor: config.primaryColor || "#D50A0A" }}
                />
                <span className="text-[11px] font-black uppercase tracking-[0.35em] text-white/70">
                  Stat line
                </span>
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-10 w-10 rounded-md border border-white/20 bg-black/50 p-0.5">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </header>

            {slide.type === "title" && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D50A0A]">
                  {slide.subtitle ?? "NFL"}
                </p>
                <h1
                  className={cn(
                    "mt-2 font-black uppercase leading-tight tracking-tight",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
              </div>
            )}
            {slide.type === "content" && (
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: line, backgroundColor: `${line}22` }}
                >
                  <div className="font-mono text-[10px] font-bold uppercase text-white/50">
                    Contexto
                  </div>
                  <div
                    className={cn(
                      "mt-1 font-black uppercase leading-none text-white",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="font-mono text-[10px] font-bold uppercase text-white/50">
                    Números
                  </div>
                  <div
                    className={cn(
                      "mt-1 line-clamp-4 font-black leading-snug text-[#D50A0A]",
                      tx.content,
                    )}
                  >
                    {slide.content}
                  </div>
                </div>
              </div>
            )}
            {slide.type === "image" && (
              <div>
                <h2 className={cn("font-black uppercase", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-3 leading-relaxed text-white/88",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="text-center">
                <h2 className={cn("font-black uppercase", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 text-white/75", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— RETRO: extra esportivo vintage (papel + vermelho NFL, sem “jornal genérico”)
    if (templateId === "retro") {
      const firstChar = slide.content?.trim().charAt(0) ?? "";
      return (
        <div
          ref={ref}
          className={cn(base, "bg-[#EDE4D3] text-[#1a1a1a]")}
          id={id}
        >
          <div className="absolute inset-0 z-0 opacity-25">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover grayscale"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-7 font-serif">
            <header className="border-y-4 border-[#8B0000] py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#8B0000]">
                  Extra · NFL
                </span>
                {showTeamLogo && teamLogo && (
                  <div className="h-9 w-9 border-2 border-[#1a1a1a] bg-white/80 p-0.5">
                    <img
                      src={teamLogo}
                      alt=""
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                )}
              </div>
              <div className="mt-2 text-center text-2xl font-black uppercase leading-none tracking-tight">
                Sports Page
              </div>
            </header>

            {slide.type === "title" && (
              <div>
                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-[#5c5c5c]">
                  {slide.subtitle}
                </p>
                <h1
                  className={cn(
                    "mt-3 text-center font-black uppercase leading-tight",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
              </div>
            )}
            {slide.type === "content" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <h2
                  className={cn(
                    "text-center font-black uppercase",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                <div
                  className={cn(
                    "columns-2 gap-4 text-justify leading-snug",
                    tx.content,
                  )}
                >
                  {firstChar && (
                    <span className="float-left mr-2 text-5xl font-black leading-[0.85] text-[#8B0000]">
                      {firstChar}
                    </span>
                  )}
                  <p className={cn(tx.content, tx.lineClamp)}>
                    {slide.content}
                  </p>
                </div>
              </div>
            )}
            {slide.type === "image" && (
              <div>
                <h2 className={cn("font-black uppercase", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 leading-relaxed",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="text-center">
                <h2 className={cn("font-black uppercase", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2", tx.content)}>{slide.content}</p>
              </div>
            )}
            <footer className="border-t-2 border-[#1a1a1a]/20 pt-2 text-center text-[9px] font-bold uppercase tracking-widest text-[#666]">
              NFL Studio Brasil — edição especial
            </footer>
          </div>
        </div>
      );
    }

    // ——— CYBER: gráficos de transmissão NFL (HUD navy + vermelho, sem “matrix verde”)
    if (templateId === "cyber") {
      return (
        <div
          ref={ref}
          className={cn(base, "bg-[#020617] font-sans text-white")}
          id={id}
        >
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-35"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[#013369]/40 via-transparent to-[#020617]" />
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)] opacity-40" />
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="border border-cyan-400/40 bg-black/60 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                Live · NFL
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-10 w-10 rounded border border-cyan-400/50 bg-black/70 p-0.5">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>

            {slide.type === "title" && (
              <div className="border-l-4 border-[#D50A0A] bg-black/55 pl-4 py-3 backdrop-blur-sm">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300/90">
                  {slide.subtitle ?? "Broadcast"}
                </p>
                <h1
                  className={cn(
                    "mt-1 font-black uppercase leading-[0.9] tracking-tight text-white",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
              </div>
            )}
            {slide.type === "content" && (
              <div className="border border-white/10 bg-black/60 p-4 font-mono">
                <h2
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-widest text-[#D50A0A]",
                    tx.content,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 leading-relaxed text-white/88",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div className="border-l-4 border-cyan-400/70 pl-4">
                <h1
                  className={cn(
                    "font-black uppercase leading-tight tracking-tight text-white",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h1>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 font-mono text-[11px] leading-relaxed text-cyan-200/85",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D50A0A] bg-black/50">
                  <Share2 className="h-6 w-6 text-[#D50A0A]" />
                </div>
                <h1
                  className={cn(
                    "font-black uppercase tracking-tight text-white",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
                <p className={cn("mt-2 text-white/78", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— BENTO: cards modulares estilo dashboard NFL (foto + blocos de texto)
    if (templateId === "bento") {
      const accent = config.primaryColor || "#D50A0A";
      return (
        <div ref={ref} className={cn(base, "bg-[#0f172a] text-white")} id={id}>
          <div className="absolute inset-0 z-0 opacity-30">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
            <div className="absolute inset-0 bg-[#0f172a]/85" />
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/80">
                NFL ·{" "}
                <span style={{ color: accent }}>
                  {slide.subtitle ?? "Grid"}
                </span>
              </span>
              {showTeamLogo && teamLogo && (
                <div className="h-9 w-9 rounded-lg border border-white/15 bg-black/40 p-0.5">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
              <div
                className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
                style={{ gridRow: "span 2" }}
              >
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                    {slide.type === "title" ? "Capa" : "Imagem"}
                  </p>
                  <p className="line-clamp-3 text-xs font-black leading-tight text-white">
                    {slide.title}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/5 p-3">
                <h2
                  className={cn(
                    "font-black uppercase leading-tight tracking-tight",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-black/35 p-3">
                <p
                  className={cn(
                    "text-[11px] font-medium leading-snug text-white/85",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content ?? slide.subtitle ?? "Destaque da rodada."}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ——— TEAM_HERO: hero fullscreen com foto grande + logo do time e título curto
    if (templateId === "team_hero") {
      return (
        <div
          ref={ref}
          className={cn(base)}
          style={{
            backgroundColor: "#000000",
            color: "#ffffff",
          }}
          id={id}
        >
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className={cn("h-full w-full object-cover", imagePositionClass)}
              style={imageObjectPositionStyle}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
            {showOverlay && (
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            )}
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60"
                  style={{
                    textShadow:
                      "0 1px 2px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.7)",
                  }}
                >
                  {slide.subtitle}
                </p>
                <div className="h-1 w-10 rounded-full bg-white/60" />
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/60 bg-black/40">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-col gap-3 max-w-[80%]">
              <h1
                className={cn(
                  "font-black leading-[0.9] tracking-tight uppercase",
                  tx.titleMain,
                )}
                style={{
                  textShadow:
                    "0 1px 2px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.92), 0 4px 28px rgba(0,0,0,0.88), 0 0 48px rgba(0,0,0,0.55)",
                }}
              >
                {slide.title}
              </h1>
              {slide.content && (
                <p
                  className={cn(
                    "text-sm text-white/85 leading-relaxed max-w-[90%]",
                    tx.content,
                    tx.lineClamp,
                  )}
                  style={{
                    textShadow:
                      "0 1px 3px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.75)",
                  }}
                >
                  {slide.content}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ——— TEAM_HEADLINE: faixa “lower third” + cores do time (broadcast NFL)
    if (templateId === "team_headline") {
      return (
        <div ref={ref} className={cn(base, "bg-black text-white")} id={id}>
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "h-full w-full object-cover opacity-45",
                imagePositionClass,
              )}
              style={imageObjectPositionStyle}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {showTeamLogo && teamLogo && (
                  <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white/35 bg-black/60">
                    <img
                      src={teamLogo}
                      alt=""
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
                    {slide.subtitle ?? "NFL"}
                  </span>
                  <span className="text-xs font-semibold text-white/80">
                    NFL Studio Brasil
                  </span>
                </div>
              </div>
              <div
                className="h-8 rounded-full px-4 flex items-center text-[10px] font-black uppercase tracking-[0.2em] shadow-lg"
                style={{
                  backgroundColor: config.primaryColor,
                  color: config.textColor,
                }}
              >
                {slide.type === "cta" ? "CTA" : "Destaque"}
              </div>
            </div>

            {slide.type === "title" && (
              <div className="mt-auto overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: config.primaryColor }}
                />
                <div className="bg-black/80 px-5 py-5 backdrop-blur-md">
                  <h1
                    className={cn(
                      "font-black uppercase leading-[0.95] tracking-tight text-white",
                      tx.titleMain,
                    )}
                  >
                    {slide.title}
                  </h1>
                </div>
              </div>
            )}
            {slide.type === "content" && (
              <div className="mt-auto rounded-2xl border border-white/10 bg-black/78 p-5 backdrop-blur-md">
                <h2
                  className={cn(
                    "font-black uppercase tracking-wide text-[#D50A0A]",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed text-white/88",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div className="mt-auto rounded-2xl border border-white/10 bg-black/78 p-5 backdrop-blur-md">
                <h2
                  className={cn(
                    "font-black uppercase leading-tight text-white",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 text-sm text-white/85",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </div>
            )}
            {slide.type === "cta" && (
              <div className="mt-auto flex flex-col items-center text-center">
                <Share2 className="mb-3 h-10 w-10 text-[#D50A0A]" />
                <div className="w-full rounded-2xl border border-white/10 bg-black/78 px-5 py-4 backdrop-blur-md">
                  <h2
                    className={cn(
                      "font-black uppercase tracking-tight",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </h2>
                  {slide.content && (
                    <p className={cn("mt-2 text-white/80", tx.content)}>
                      {slide.content}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— PLAYERS_LIST: 1 slide por jogador/destaque (capa, jogadores individuais, CTA)
    if (templateId === "players_list") {
      const isPlayerSlide = slide.type === "image";
      const playerNumber = isPlayerSlide ? slide.id - 1 : null;

      return (
        <div ref={ref} className={cn(base, "bg-black text-white")} id={id}>
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "h-full w-full object-cover",
                isPlayerSlide ? "opacity-50" : "opacity-30",
                imagePositionClass,
              )}
              style={imageObjectPositionStyle}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
            {showOverlay && (
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/20" />
            )}
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            {/* Header: logo + subtitle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                {slide.subtitle && (
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">
                    {slide.subtitle}
                  </span>
                )}
                {!isPlayerSlide && (
                  <div className="h-1 w-12 rounded-full bg-white/40 mt-1" />
                )}
              </div>
              {showTeamLogo && teamLogo && (
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white/50 bg-black/40">
                  <img
                    src={teamLogo}
                    alt=""
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="mt-auto flex flex-col gap-3">
              {isPlayerSlide && playerNumber != null && (
                <span
                  className="text-7xl font-black leading-none tracking-tighter opacity-25 select-none"
                  style={{ color: config.primaryColor }}
                >
                  {String(playerNumber).padStart(2, "0")}
                </span>
              )}
              <h1
                className={cn(
                  "font-black leading-[0.9] tracking-tight uppercase drop-shadow-2xl",
                  isPlayerSlide ? tx.titleMain : tx.titleSecondary,
                )}
              >
                {slide.title}
              </h1>
              {isPlayerSlide && slide.subtitle && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-1 w-6 rounded-full"
                    style={{ backgroundColor: config.primaryColor }}
                  />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                    {slide.subtitle}
                  </span>
                </div>
              )}
              {slide.content && (
                <div className="mt-2 rounded-2xl bg-black/70 border border-white/10 p-5 shadow-2xl">
                  <p
                    className={cn(
                      "text-sm text-white/85 leading-relaxed",
                      tx.content,
                    )}
                  >
                    {slide.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn(base, "bg-[#0a0a0a] text-white")} id={id}>
        <div className="relative z-10 flex flex-1 items-center justify-center p-8">
          <h1 className="text-2xl font-bold">{slide.title}</h1>
        </div>
      </div>
    );
  },
);
SlideRendererGuia.displayName = "SlideRendererGuia";
