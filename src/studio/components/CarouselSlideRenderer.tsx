/**
 * Renderização de um slide do carrossel conforme o Guia de Estilos CSS.
 * Suporta cores dinâmicas (config) e 9 templates: Editorial, Brutalist, Breaking,
 * Magazine, Social, Stats, Retro, Cyber, Bento.
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

    // ——— EDITORIAL: elegante, minimalista, tipografia serifada (guia §3)
    if (templateId === "editorial") {
      return (
        <div
          ref={ref}
          className={cn(base, "font-serif")}
          style={{
            backgroundColor: config.primaryColor,
            color: config.textColor,
          }}
          id={id}
        >
          <div className="absolute inset-0 z-0 opacity-20 grayscale ">
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-12">
            {slide.type === "title" && (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60">
                  {slide.subtitle}
                </p>
                <h1
                  className={cn(
                    "font-bold leading-[0.9] tracking-tighter uppercase italic",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
              </>
            )}
            {slide.type === "content" && (
              <>
                <h2
                  className={cn(
                    "font-bold uppercase tracking-tight",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "max-w-[80%] font-medium leading-relaxed opacity-80 drop-shadow-md",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </>
            )}
            {slide.type === "image" && (
              <>
                <div className="flex-1" />
                <h2
                  className={cn(
                    "font-bold italic drop-shadow-md",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 max-w-[90%] font-medium leading-relaxed opacity-85 drop-shadow-md",
                      tx.content,
                      tx.lineClamp,
                    )}
                  >
                    {slide.content}
                  </p>
                )}
              </>
            )}
            {slide.type === "cta" && (
              <div className="flex flex-col items-center justify-center text-center">
                <Share2 className="mb-4 h-14 w-14 opacity-60" />
                <h2 className={cn("font-bold uppercase", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 opacity-80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— BRUTALIST: cru, industrial (guia §3) — borda secondaryColor, badge bg-current
    if (templateId === "brutalist") {
      return (
        <div
          ref={ref}
          className={cn(base, "border-[12px] font-mono")}
          style={{
            backgroundColor: config.primaryColor,
            color: config.textColor,
            borderColor: config.secondaryColor ?? config.textColor,
          }}
          id={id}
        >
          <div className="absolute inset-0 z-0 opacity-25">
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            {slide.type === "title" && (
              <>
                <div className="bg-current self-start px-4 py-2 mb-8 text-xs font-black uppercase">
                  {slide.subtitle}
                </div>
                <h1
                  className={cn(
                    "font-black leading-[0.8] tracking-tighter uppercase",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
              </>
            )}
            {slide.type === "content" && (
              <>
                <div className="bg-current self-start px-4 py-2 mb-4 text-xs font-black uppercase">
                  {slide.title}
                </div>
                <div className="border-t-4 border-current pt-4">
                  <p className={cn(tx.content, tx.lineClamp)}>
                    {slide.content}
                  </p>
                </div>
              </>
            )}
            {slide.type === "image" && (
              <div>
                <h2 className={cn("font-black italic", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-3 border-t-4 border-current pt-3",
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
                <h1 className={cn("font-black uppercase", tx.titleMain)}>
                  {slide.title}
                </h1>
                <p className={cn("mt-2 opacity-80", tx.content)}>
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

    // ——— MAGAZINE: capa de revista premium (guia §3)
    if (templateId === "magazine") {
      return (
        <div
          ref={ref}
          className={cn(base)}
          style={{
            backgroundColor: config.primaryColor,
            color: config.textColor,
          }}
          id={id}
        >
          <div className="absolute inset-0 z-0 p-4">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full rounded-2xl object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={overlayStyle}
              />
            )}
            {(slide.type === "title" || slide.type === "image") && (
              <div className="absolute inset-x-4 bottom-4 p-6 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent">
                <h2
                  className={cn(
                    "font-bold text-white leading-tight",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h2>
                {slide.type === "image" && slide.content && (
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
            <div className="text-4xl font-black tracking-tighter leading-none opacity-90">
              NFL
            </div>
            {slide.type === "title" && (
              <p className="text-sm font-bold uppercase tracking-widest opacity-60">
                {slide.subtitle}
              </p>
            )}
            {slide.type === "content" && (
              <div>
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 opacity-80", tx.content, tx.lineClamp)}>
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "cta" && (
              <div className="text-center">
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 opacity-70", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
            <div className="border-t border-current/10 pt-4 text-[10px] opacity-50">
              Edição {new Date().toLocaleDateString("pt-BR")} · NFL BLOG BRASIL
            </div>
          </div>
        </div>
      );
    }

    // ——— SOCIAL: estilo Instagram/post moderno (guia §3)
    if (templateId === "social") {
      return (
        <div
          ref={ref}
          className={cn(base, "bg-gradient-to-br from-transparent to-black/10")}
          style={{ color: config.textColor }}
          id={id}
        >
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-90"
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
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-current flex items-center justify-center opacity-80" />
              <span className="text-sm font-bold">NFL Brasil</span>
            </div>
            {slide.type === "title" && (
              <h1
                className={cn(
                  "font-black leading-tight drop-shadow-lg",
                  tx.titleMain,
                )}
              >
                {slide.title}
              </h1>
            )}
            {slide.type === "content" && (
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                <h2 className={cn("font-black", tx.titleSecondary)}>
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
              <div className="space-y-3">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2
                    className={cn(
                      "font-black drop-shadow-md",
                      tx.titleSecondary,
                    )}
                  >
                    {slide.title}
                  </h2>
                  {slide.content && (
                    <p
                      className={cn(
                        "mt-1 text-white/90 drop-shadow-md",
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
                <Share2 className="mb-2 h-12 w-12 opacity-90" />
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("opacity-80", tx.content)}>{slide.content}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— STATS: focado em números (guia §3)
    if (templateId === "stats") {
      return (
        <div
          ref={ref}
          className={cn(base)}
          style={{
            backgroundColor: config.primaryColor,
            color: config.textColor,
          }}
          id={id}
        >
          <div className="absolute inset-0 z-0 opacity-10">
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <header className="border-b-2 border-current pb-4 text-xl font-black uppercase">
              {slide.type === "title" ? slide.subtitle : "NFL"}
            </header>
            {slide.type === "title" && (
              <h1 className={cn("font-black leading-tight", tx.titleMain)}>
                {slide.title}
              </h1>
            )}
            {slide.type === "content" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                  <div className="text-4xl font-black">
                    {slide.title?.slice(0, 2) ?? "—"}
                  </div>
                  <div
                    className={cn("font-bold uppercase opacity-70", tx.content)}
                  >
                    {slide.title}
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                  <div
                    className={cn(
                      "text-4xl font-black",
                      tx.lineClamp || "line-clamp-1",
                    )}
                  >
                    {slide.content?.slice(0, 30) ?? "—"}
                  </div>
                  <div
                    className={cn("font-bold uppercase opacity-70", tx.content)}
                  >
                    Destaque
                  </div>
                </div>
              </div>
            )}
            {slide.type === "image" && (
              <div>
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 leading-relaxed opacity-90",
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
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 opacity-80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— RETRO: jornal clássico 1920 (guia §3) — cores fixas, colunas, capitular
    if (templateId === "retro") {
      const firstChar = slide.content?.trim().charAt(0) ?? "";
      return (
        <div
          ref={ref}
          className={cn(base, "bg-[#F4EBD0] text-[#2C2C2C] font-serif")}
          id={id}
        >
          <div className="absolute inset-0 z-0 opacity-20">
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <header className="border-b-4 border-[#2C2C2C] pb-4 mb-6 text-2xl font-black uppercase">
              NFL Gazette
            </header>
            {slide.type === "title" && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#2C2C2C]/70">
                  {slide.subtitle}
                </p>
                <h1
                  className={cn("mt-2 font-black leading-tight", tx.titleMain)}
                >
                  {slide.title}
                </h1>
              </div>
            )}
            {slide.type === "content" && (
              <div
                className={cn(
                  "columns-2 gap-4 text-justify leading-relaxed",
                  tx.content,
                )}
              >
                <h2 className={cn("mb-2 font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                {firstChar && (
                  <span className="text-4xl font-black float-left mr-2 leading-[0.8]">
                    {firstChar}
                  </span>
                )}
                <p className={cn(tx.content, tx.lineClamp)}>{slide.content}</p>
              </div>
            )}
            {slide.type === "image" && (
              <div>
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 leading-relaxed text-[#2C2C2C]/90",
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
                <h2 className={cn("font-black", tx.titleSecondary)}>
                  {slide.title}
                </h2>
                <p className={cn("mt-2 text-[#2C2C2C]/80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— CYBER: futurista, neon (guia §3 + §4 animate-scan)
    if (templateId === "cyber") {
      return (
        <div
          ref={ref}
          className={cn(base, "bg-black text-[#00FF00] font-mono")}
          id={id}
        >
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-20"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
            {showOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={overlayStyle}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00FF00]/5 to-transparent animate-scan" />
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <div className="border-l-8 border-[#00FF00] pl-4 text-[10px] font-bold uppercase tracking-widest text-[#00FF00]/80">
              SYSTEM.NFL
            </div>
            {slide.type === "title" && (
              <div className="border-l-8 border-[#00FF00] pl-4">
                <p className="text-xs text-[#00FF00]/60">{slide.subtitle}</p>
                <h1
                  className={cn(
                    "mt-2 font-black leading-[0.8] uppercase tracking-tighter skew-x-[-10deg]",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
              </div>
            )}
            {slide.type === "content" && (
              <div className="border-l-8 border-[#00FF00] pl-4">
                <h2
                  className={cn(
                    "font-black uppercase text-[#00FF00]/90",
                    tx.content,
                  )}
                >
                  {slide.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 leading-relaxed text-[#00FF00]/80",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              </div>
            )}
            {slide.type === "image" && (
              <div className="border-l-8 border-[#00FF00] pl-4">
                <h1
                  className={cn(
                    "font-black uppercase leading-[0.8] tracking-tighter skew-x-[-10deg]",
                    tx.titleSecondary,
                  )}
                >
                  {slide.title}
                </h1>
                {slide.content && (
                  <p
                    className={cn(
                      "mt-2 leading-relaxed text-[#00FF00]/85",
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
              <div className="border-l-8 border-[#00FF00] pl-4 text-center">
                <h1
                  className={cn(
                    "font-black uppercase leading-[0.8] tracking-tighter skew-x-[-10deg]",
                    tx.titleMain,
                  )}
                >
                  {slide.title}
                </h1>
                <p className={cn("mt-2 text-[#00FF00]/80", tx.content)}>
                  {slide.content}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ——— BENTO: grid modular (guia §3)
    if (templateId === "bento") {
      return (
        <div
          ref={ref}
          className={cn(base)}
          style={{
            backgroundColor: config.primaryColor,
            color: config.textColor,
          }}
          id={id}
        >
          <div className="absolute inset-0 z-0 opacity-10">
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-center p-8">
            <div className="grid grid-cols-2 grid-rows-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-6 border border-white/10 flex flex-col justify-center">
                <h2
                  className={cn(
                    "font-bold leading-tight uppercase italic",
                    tx.titleSecondary,
                  )}
                >
                  {slide.type === "title"
                    ? slide.title
                    : (slide.title ?? "NFL")}
                </h2>
              </div>
              <div className="bg-white/10 rounded-2xl p-6 border border-white/10 flex flex-col justify-center">
                <p className={cn("opacity-90", tx.content, tx.lineClamp)}>
                  {slide.subtitle ?? slide.content ?? "—"}
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-6 border border-white/10 col-span-2">
                <p
                  className={cn(
                    "leading-relaxed opacity-80",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content ?? slide.title ?? ""}
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
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">
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
                  "font-black leading-[0.9] tracking-tight uppercase drop-shadow-2xl",
                  tx.titleMain,
                )}
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
                >
                  {slide.content}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ——— TEAM_HEADLINE: faixa horizontal nas cores do time com headline forte + texto
    if (templateId === "team_headline") {
      return (
        <div ref={ref} className={cn(base, "bg-black text-white")} id={id}>
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "h-full w-full object-cover opacity-40",
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
          </div>
          <div className="relative z-10 flex flex-1 flex-col justify-between p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {showTeamLogo && teamLogo && (
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-black/60 border border-white/40">
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
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                    {slide.subtitle}
                  </span>
                  <span className="text-xs font-semibold text-white/70">
                    NFL Studio Brasil
                  </span>
                </div>
              </div>
              <div
                className="h-8 rounded-full px-4 flex items-center text-[11px] font-bold uppercase tracking-widest"
                style={{
                  backgroundColor: config.primaryColor,
                  color: config.textColor,
                }}
              >
                Destaque
              </div>
            </div>
            <div className="rounded-3xl p-6 bg-black/75 border border-white/10 shadow-2xl">
              <h1
                className={cn(
                  "font-black leading-tight tracking-tight uppercase",
                  tx.titleSecondary,
                )}
              >
                {slide.title}
              </h1>
              {slide.content && (
                <p
                  className={cn(
                    "mt-3 text-sm text-white/85 leading-relaxed",
                    tx.content,
                    tx.lineClamp,
                  )}
                >
                  {slide.content}
                </p>
              )}
            </div>
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
