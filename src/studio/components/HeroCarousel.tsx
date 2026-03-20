import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Instagram,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { formatDate, formatDateTime } from "../lib/utils";
import { cn } from "../lib/utils";
import { getOptimizedHeroImageUrl } from "../lib/hero-image-url";
import type { Article } from "../services/newsService";

const FALLBACK_IMAGE = "https://picsum.photos/seed/nfl/1920/1080";

function getImageUrl(article: Article | undefined): string {
  return article?.images?.[0]?.url || FALLBACK_IMAGE;
}

/** URL otimizada para o hero (Supabase: resize+quality; outras: inalterado). */
function getHeroImageUrl(article: Article | undefined): string {
  const raw = getImageUrl(article);
  return getOptimizedHeroImageUrl(raw);
}

/** Pré-carrega uma URL no cache do navegador (prioridade alta para exibição rápida). */
function preloadImage(url: string): void {
  if (!url) return;
  const img = new Image();
  img.fetchPriority = "high";
  img.src = url;
}

const PRELOAD_LINK_ID = "hero-carousel-preload";

/** Injeta <link rel="preload"> no head para a imagem atual (carregamento mais rápido). */
function usePreloadHeroImage(url: string) {
  useEffect(() => {
    if (!url) return;
    const existing = document.getElementById(PRELOAD_LINK_ID);
    if (existing?.getAttribute("href") === url) return;
    existing?.remove();
    const link = document.createElement("link");
    link.id = PRELOAD_LINK_ID;
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
    return () => {
      document.getElementById(PRELOAD_LINK_ID)?.remove();
    };
  }, [url]);
}

interface HeroCarouselProps {
  articles: Article[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onGeneratePost: (article: Article) => void;
  onGenerateCarousel?: (article: Article) => void;
}

export function HeroCarousel({
  articles,
  currentIndex,
  onPrev,
  onNext,
  onGeneratePost,
  onGenerateCarousel,
}: HeroCarouselProps) {
  const featured = articles.slice(0, 5);
  const current = featured[currentIndex];
  const currentImageUrl = getHeroImageUrl(current);
  const currentImageUrlRaw = getImageUrl(current);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadingUrlRef = useRef<string>("");

  usePreloadHeroImage(currentImageUrl);

  const displayImageUrl = useFallbackUrl ? currentImageUrlRaw : currentImageUrl;

  // Ao trocar de slide: reset e marcar qual URL estamos carregando (evita race no onLoad)
  useEffect(() => {
    setImageLoaded(false);
    setUseFallbackUrl(false);
    loadingUrlRef.current = displayImageUrl;
  }, [currentIndex, displayImageUrl]);

  // Uma única img persistente: se já estiver em cache, complete fica true na mesma rodada
  const setRefAndCheckComplete = useCallback((el: HTMLImageElement | null) => {
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = el;
    if (el?.complete && el.src) setImageLoaded(true);
  }, []);

  // Quando a URL da imagem muda, checar logo em seguida se já está em cache (evita flash)
  useEffect(() => {
    if (!displayImageUrl) return;
    const check = () => {
      const img = imgRef.current;
      if (
        img?.complete &&
        img.src &&
        (img.src || "").includes(displayImageUrl)
      ) {
        setImageLoaded(true);
      }
    };
    const t = requestAnimationFrame(() => {
      check();
      requestAnimationFrame(check);
    });
    return () => cancelAnimationFrame(t);
  }, [displayImageUrl]);

  // Pré-carrega todas as imagens do hero (URL otimizada) na primeira carga
  useEffect(() => {
    featured.forEach((article) => preloadImage(getHeroImageUrl(article)));
  }, [featured]);

  // Pré-carrega vizinhos para troca instantânea ao navegar
  useEffect(() => {
    const prev = currentIndex - 1;
    const next = currentIndex + 1;
    if (prev >= 0) preloadImage(getHeroImageUrl(featured[prev]));
    if (next < featured.length) preloadImage(getHeroImageUrl(featured[next]));
  }, [currentIndex, featured]);

  return (
    <section
      className="relative h-[600px] rounded-3xl overflow-hidden group"
      aria-label="Carrossel de notícias em destaque"
    >
      <div className="absolute inset-0">
        {/* Placeholder até a imagem carregar — evita “flash” em branco */}
        <div
          className={cn(
            "absolute inset-0 bg-zinc-900 transition-opacity duration-200",
            imageLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          aria-hidden
        >
          <div className="absolute inset-0 bg-zinc-800/80 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2
              className="w-12 h-12 text-white/30 animate-spin"
              aria-hidden
            />
          </div>
        </div>

        <img
          ref={setRefAndCheckComplete}
          src={displayImageUrl}
          alt=""
          onLoad={() => {
            if (
              imgRef.current?.src &&
              loadingUrlRef.current &&
              imgRef.current.src.includes(loadingUrlRef.current)
            ) {
              setImageLoaded(true);
            }
          }}
          onError={() => {
            if (!useFallbackUrl && currentImageUrlRaw !== currentImageUrl) {
              setUseFallbackUrl(true);
            }
          }}
          className={cn(
            "absolute inset-0 w-full h-full object-cover object-top select-none",
            "transition-opacity duration-200 ease-out",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          referrerPolicy="no-referrer"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-transparent pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-end">
        <motion.div
          key={`content-${currentIndex}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="max-w-3xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <span className="bg-nfl-red text-white px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest animate-glow">
              Breaking
            </span>
            <span className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Calendar size={14} /> {formatDateTime(current?.published ?? "")}
            </span>
          </div>
          <h1 className="text-5xl md:text-5xl font-black uppercase italic leading-[0.9] tracking-tighter drop-shadow-2xl [word-spacing:0.2em]">
            {current?.headline}
          </h1>
          <p className="text-lg text-white/80 font-medium line-clamp-2 max-w-2xl">
            {current?.description}
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              type="button"
              onClick={() => current && onGeneratePost(current)}
              className="cursor-pointer bg-white text-black px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <Instagram size={20} />
              Gerar Post
            </button>
            {onGenerateCarousel && current && (
              <button
                type="button"
                onClick={() => onGenerateCarousel(current)}
                className="cursor-pointer bg-nfl-blue text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <LayoutGrid size={20} />
                Gerar carrossel
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (current?.sourceUrl) {
                  window.open(
                    current.sourceUrl,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }
              }}
              className="cursor-pointer glass-panel text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Notícia Original <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 right-8 flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Slide anterior"
          className="cursor-pointer p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Próximo slide"
          className="cursor-pointer p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronRight size={24} className="text-white" />
        </button>
      </div>

      <div className="absolute top-8 left-8 flex gap-2" aria-hidden>
        {featured.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 transition-all duration-500 rounded-full",
              currentIndex === i ? "w-12 bg-nfl-red" : "w-4 bg-white/20",
              !imageLoaded && currentIndex === i && "animate-pulse",
            )}
          />
        ))}
      </div>

      {/* Indicador sutil de carregamento no canto */}
      <AnimatePresence>
        {!imageLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-8 right-8 flex items-center gap-2 text-white/50 text-xs font-medium"
            aria-live="polite"
          >
            <Loader2 size={14} className="animate-spin shrink-0" />
            Carregando imagem…
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
