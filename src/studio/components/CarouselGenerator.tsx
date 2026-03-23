import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  Share2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Zap,
  Layout,
  Image as ImageIcon,
  Loader2,
  Send,
  Search,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import { cn } from "../lib/utils";
import type { Article } from "../services/newsService";
import { articleToNewsData } from "../lib/carousel-news";
import type {
  CarouselDataGuia,
  CarouselSlideConfig,
  CarouselSlideItem,
  CarouselTextOptions,
  CarouselTextSize,
  CarouselVisualTemplateId,
} from "../types/carousel";
import {
  buildSlidesFromGuiaContent,
  buildSlidesFromPlayersList,
  generateSlidesFromArticle,
  sliceSlidesToCount,
  SLIDE_COUNT_OPTIONS,
  type SlideCountOption,
} from "../lib/carousel-slides";
import {
  generateGuiaSlidesContent,
  generatePlayersListContent,
  generateImagePrompt,
  generateSlideImage,
} from "../services/openaiCarousel";
import {
  getInstagramConfig,
  hasInstagramConfig,
} from "../lib/instagram-settings";
import { publishCarouselToInstagram } from "../lib/instagram-publish";
import {
  uploadImageToCloudinary,
  uploadRemoteImageUrlToCloudinary,
  hasCloudinaryConfig,
} from "../lib/cloudinary-upload";
import {
  searchGoogleImages,
  type GoogleImageHit,
} from "../services/googleImageSearch";
import { markArticleInstagramPublished } from "../services/newsService";
import { hasOpenAIKey } from "../lib/openai-rewrite-caption";
import { formatDateTime } from "../lib/utils";
import { fetchEspnArticleContent } from "../lib/espn-content";
import { SlideRendererGuia } from "./CarouselSlideRenderer";

/** Carrossel em 4:5 para Instagram (1080×1350). */
const INSTAGRAM_CAROUSEL_WIDTH = 1080;
const INSTAGRAM_CAROUSEL_HEIGHT = 1350; // 1080 * 5/4

/** Largura do preview na UI (px). Export PNG continua 1080px (`pixelRatio = 1080 / este valor`). */
const CAROUSEL_PREVIEW_CSS_WIDTH = 520;
/** Largura do slide “off-screen” usado na captura para publicar (metade do 1080px físico). */
const CAROUSEL_EXPORT_LAYER_CSS_WIDTH = 540;

/** Templates visuais do guia: cada um com cores, tipografia e elementos próprios. */
const VISUAL_TEMPLATES: {
  id: CarouselVisualTemplateId;
  name: string;
  description: string;
}[] = [
  {
    id: "editorial",
    name: "Editorial",
    description: "Revista NFL: contraste alto, faixa do time, gradiente escuro",
  },
  {
    id: "brutalist",
    name: "Brutalist",
    description: "Endzone: tarjas, moldura forte, estética stadium",
  },
  {
    id: "breaking",
    name: "Breaking News",
    description: "Estilo TV, gradientes, tarja vermelha",
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "Capa ESPN/SI: moldura, data e manchete forte",
  },
  {
    id: "social",
    name: "Social",
    description: "Feed dark mode + @nflstudio.br",
  },
  {
    id: "stats",
    name: "Stats",
    description: "Stat line / placar, blocos de destaque",
  },
  {
    id: "retro",
    name: "Retro",
    description: "Extra esportivo vintage, vermelho NFL",
  },
  {
    id: "cyber",
    name: "Cyber",
    description: "HUD de transmissão (navy + vermelho)",
  },
  {
    id: "bento",
    name: "Bento",
    description: "Grid com foto grande + cards de texto",
  },
  {
    id: "team_hero",
    name: "Hero do time",
    description: "Foco total na foto + logo e cores do time",
  },
  {
    id: "team_headline",
    name: "Headline do time",
    description: "Lower third broadcast + faixa nas cores do time",
  },
  {
    id: "players_list",
    name: "Top jogadores",
    description: "Lista de destaques/jogadores com foto de fundo",
  },
];

/** Narrativa fixa do guia: 6 slots (Capa, Fato, 3 imagens, CTA). */
const FIXED_SLIDE_LABELS = ["Capa", "Fato", "Img", "Img", "Img", "CTA"];

const PREVIEW_PLACEHOLDER = "https://picsum.photos/seed/nfl/400/400";

/** Gera os 6 slides de preview (mesma narrativa do carrossel) para exibir no seletor de template. */
function buildPreviewSlides(images: string[]): CarouselSlideItem[] {
  const imgs = images.length > 0 ? images : [PREVIEW_PLACEHOLDER];
  return [
    {
      id: 1,
      type: "title",
      title: "Manchete da notícia",
      subtitle: "NFL BREAKING",
      image: imgs[0 % imgs.length],
    },
    {
      id: 2,
      type: "content",
      title: "O que você precisa saber",
      content:
        "Resumo da notícia em poucas linhas para o fã acompanhar o que importa.",
      image: imgs[1 % imgs.length],
    },
    {
      id: 3,
      type: "image",
      title: "Destaque 1",
      content: "Contexto e dado principal.",
      image: imgs[2 % imgs.length],
    },
    {
      id: 4,
      type: "image",
      title: "Destaque 2",
      content: "Outro ângulo da notícia.",
      image: imgs[3 % imgs.length],
    },
    {
      id: 5,
      type: "image",
      title: "Destaque 3",
      content: "Mais um fato relevante.",
      image: imgs[4 % imgs.length],
    },
    {
      id: 6,
      type: "cta",
      title: "Fique por dentro",
      content: "Siga para mais atualizações da NFL.",
      image: imgs[5 % imgs.length],
    },
  ];
}

const PREVIEW_CELL_SIZE = 150;
const PREVIEW_SLIDE_SIZE = 400;
const PREVIEW_SCALE = PREVIEW_CELL_SIZE / PREVIEW_SLIDE_SIZE;

/** Preview do carrossel como no Instagram: 6 mini-slides renderizados com o mesmo componente do post. */
function TemplatePreview({
  templateId,
  images,
  config,
  teamLogo,
}: {
  templateId: CarouselVisualTemplateId;
  images: string[];
  config?: CarouselSlideConfig;
  teamLogo?: string | null;
}) {
  const previewSlides = React.useMemo(
    () => buildPreviewSlides(images),
    [images],
  );
  return (
    <div className="mt-2 overflow-hidden rounded-lg border-2 border-white/20 bg-black/40 p-1">
      <div className="flex gap-0.5">
        {previewSlides.map((slide) => (
          <div
            key={slide.id}
            className="relative shrink-0 overflow-hidden rounded-sm"
            style={{
              width: PREVIEW_CELL_SIZE,
              height: PREVIEW_CELL_SIZE,
            }}
          >
            <div
              className="origin-top-left"
              style={{
                width: PREVIEW_SLIDE_SIZE,
                height: PREVIEW_SLIDE_SIZE,
                transform: `scale(${PREVIEW_SCALE})`,
              }}
            >
              <SlideRendererGuia
                slide={slide}
                templateId={templateId}
                config={config}
                teamLogo={teamLogo}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CarouselGeneratorProps {
  article: Article;
  onClose: () => void;
}

export function CarouselGenerator({
  article,
  onClose,
}: CarouselGeneratorProps) {
  const [carousel, setCarousel] = useState<CarouselDataGuia | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<{
    index: number;
    url: string;
  } | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** Ref do slide visível (usado para publicar: capturamos um slide por vez). */
  const visibleSlideRef = useRef<HTMLDivElement | null>(null);
  /** Durante captura (publicar/download), o slide usa só placeholder para evitar erro de img não carregada no toPng. */
  const [captureForExport, setCaptureForExport] = useState(false);
  const [showTeamLogo, setShowTeamLogo] = useState(true);

  /** Biblioteca: SerpAPI (Google Imagens) → Cloudinary → URL do slide. */
  const [playerLibName, setPlayerLibName] = useState("");
  const [playerLibTeam, setPlayerLibTeam] = useState(
    () => article.team?.abbreviation?.trim() ?? "",
  );
  const [playerLibResults, setPlayerLibResults] = useState<GoogleImageHit[]>(
    [],
  );
  const [playerLibLoading, setPlayerLibLoading] = useState(false);
  const [playerLibErr, setPlayerLibErr] = useState<string | null>(null);
  const [playerLibApplyingId, setPlayerLibApplyingId] = useState<string | null>(
    null,
  );

  /** URL ESPN para "Buscar conteúdo" (imagens da notícia). */
  const [espnUrlInput, setEspnUrlInput] = useState(
    article.sourceUrl?.trim() ?? "",
  );
  /** Imagens retornadas ao buscar conteúdo ESPN (como no PostGenerator). */
  const [fetchedContentImageUrls, setFetchedContentImageUrls] = useState<
    string[]
  >([]);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [fetchContentMessage, setFetchContentMessage] = useState<string | null>(
    null,
  );
  /** Template visual selecionado (editorial, brutalist, breaking, etc.). */
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<CarouselVisualTemplateId>("breaking");
  /** Opções de texto: tamanho do título, da descrição e limite de linhas. */
  const [textOptions, setTextOptions] = useState<CarouselTextOptions>({
    titleSize: "medium",
    contentSize: "medium",
    descriptionMaxLines: "unlimited",
  });
  /** Opacidade do overlay escuro sobre a imagem de fundo (0–1). */
  const [imageOverlayOpacity, setImageOverlayOpacity] = useState(0.4);
  /** Quantidade de slides desejada ao gerar o carrossel (para templates do guia). */
  const [desiredSlideCount, setDesiredSlideCount] =
    useState<SlideCountOption>(6);

  const baseNews = articleToNewsData(article);
  /** Config dos slides: cores do time + opacidade do overlay. */
  const slideConfig: CarouselSlideConfig = {
    primaryColor: article.team?.primaryColor ?? "#ffffff",
    textColor: article.team?.primaryColor ? "#ffffff" : "#000000",
    secondaryColor: article.team?.secondaryColor ?? "#000000",
    imageOverlayOpacity,
  };
  /** NewsData com imagens da notícia: se buscou conteúdo ESPN, usa fetchedContentImageUrls; senão usa baseNews.images. */
  const news: typeof baseNews =
    fetchedContentImageUrls.length > 0
      ? { ...baseNews, images: fetchedContentImageUrls }
      : baseNews;

  /**
   * OpenAI (guia) hoje gera 6 slots fixos.
   * Para permitir 7/8, inserimos slides extras do tipo "image" antes do CTA
   * usando fatias diferentes da descrição (para evitar repetição literal).
   */
  const extendGuideSlidesToCount = (
    slides: CarouselSlideItem[],
    count: SlideCountOption,
    guideImageUrls: string[],
  ): CarouselSlideItem[] => {
    if (slides.length >= count) return slides;
    if (slides.length < 3) return slides;

    const needed = count - slides.length;
    const ctaSlide = slides[slides.length - 1];
    const beforeCta = slides.slice(0, -1);
    const imageSlides = beforeCta.filter((s) => s.type === "image");
    const imagePool =
      guideImageUrls.length > 0
        ? guideImageUrls
        : imageSlides.map((s) => s.image ?? "").filter(Boolean);

    const fallbackImage = imageSlides[0]?.image ?? beforeCta[0]?.image ?? null;
    const description = news.description ?? "";
    const headline = news.headline ?? "";

    const extras: CarouselSlideItem[] = [];
    for (let k = 0; k < needed; k++) {
      const src =
        imageSlides[k % Math.max(1, imageSlides.length)] ?? beforeCta[0];
      const start = (k + 3) * 130;
      const end = (k + 4) * 130;
      const extraContent = description
        ? description.slice(start, end).trim()
        : src.content;

      const extraTitleBase = src.title || headline || "Ponto chave";
      const extraTitle = `${extraTitleBase} — extra ${k + 1}`;

      const extraImage =
        imagePool.length > 0
          ? imagePool[k % imagePool.length]
          : (src.image ?? fallbackImage ?? "");

      extras.push({
        ...src,
        id: -1, // será re-ID no final
        type: "image",
        title: extraTitle,
        content: extraContent || src.content,
        image: extraImage || src.image,
      });
    }

    const combined = [...beforeCta, ...extras, ctaSlide];
    return combined.map((s, idx) => ({ ...s, id: idx + 1 }));
  };

  useEffect(() => {
    setEspnUrlInput(article.sourceUrl?.trim() ?? "");
    setFetchedContentImageUrls([]);
    setFetchContentMessage(null);
  }, [article.sourceUrl, article.dataSourceIdentifier]);

  // Ajustar defaults de texto ao mudar o template visual (antes de gerar/carregar carrossel)
  useEffect(() => {
    setTextOptions((prev) => {
      const base: CarouselTextOptions = { ...prev };
      switch (selectedTemplateId) {
        case "breaking":
        case "team_hero":
        case "team_headline":
          return {
            ...base,
            titleSize: "large",
            contentSize: "medium",
            descriptionMaxLines: base.descriptionMaxLines ?? 5,
          };
        case "editorial":
        case "magazine":
          return {
            ...base,
            titleSize: "medium",
            contentSize: "large",
            descriptionMaxLines:
              typeof base.descriptionMaxLines === "number"
                ? Math.max(base.descriptionMaxLines, 8)
                : 8,
          };
        case "stats":
          return {
            ...base,
            titleSize: "medium",
            contentSize: "small",
            descriptionMaxLines: 5,
          };
        default:
          return base;
      }
    });
  }, [selectedTemplateId]);

  // Log para debug: verificar dados do time do artigo ao abrir/gerar carrossel
  useEffect(() => {
    if (!carousel) return;
    console.log("[CarouselGenerator] artigo / time (fonte do logo)", {
      dataSourceIdentifier: article.dataSourceIdentifier,
      team: article.team ?? null,
      teamLogo: article.team?.logo ?? null,
      teamName: article.team?.name ?? null,
    });
  }, [carousel, article.dataSourceIdentifier, article.team]);

  /** Ao abrir para notícia com sourceUrl, buscar conteúdo ESPN automaticamente (como no PostGenerator). */
  useEffect(() => {
    const url = (article.sourceUrl ?? "").trim();
    if (!url || fetchedContentImageUrls.length > 0) return;
    let cancelled = false;
    setIsFetchingContent(true);
    fetchEspnArticleContent(url)
      .then((result) => {
        if (!cancelled && result.imageUrls?.length) {
          setFetchedContentImageUrls(result.imageUrls);
          setFetchContentMessage(
            `Carrossel (${result.imageUrls.length} imagens) carregado.`,
          );
          setTimeout(() => setFetchContentMessage(null), 4000);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchContentMessage(null);
      })
      .finally(() => {
        if (!cancelled) setIsFetchingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [article.sourceUrl, article.dataSourceIdentifier]);

  const fetchContentFromEspn = async () => {
    const url = espnUrlInput.trim();
    if (!url) {
      setFetchContentMessage("Cole a URL da notícia ESPN.");
      setTimeout(() => setFetchContentMessage(null), 4000);
      return;
    }
    setIsFetchingContent(true);
    setFetchContentMessage(null);
    try {
      const result = await fetchEspnArticleContent(url);
      setFetchedContentImageUrls(result.imageUrls ?? []);
      setFetchContentMessage(
        result.imageUrls?.length
          ? `Conteúdo carregado: ${result.imageUrls.length} imagem(ns) da notícia.`
          : "Conteúdo carregado (nenhuma imagem encontrada).",
      );
      setTimeout(() => setFetchContentMessage(null), 4000);
    } catch (e) {
      setFetchContentMessage(
        e instanceof Error ? e.message : "Falha ao buscar conteúdo.",
      );
      setTimeout(() => setFetchContentMessage(null), 5000);
    } finally {
      setIsFetchingContent(false);
    }
  };

  const handleGenerate = async () => {
    const articleWithImages =
      fetchedContentImageUrls.length > 0
        ? {
            ...article,
            images: fetchedContentImageUrls.map((url) => ({ url })),
          }
        : article;
    const imageUrls =
      articleWithImages.images?.map((img) => img.url).filter(Boolean) ?? [];

    setError(null);
    setLoading(true);

    try {
      if (
        hasOpenAIKey() &&
        (selectedTemplateId === "players_list" ||
          selectedTemplateId === "team_hero")
      ) {
        console.log(
          "[CarouselGenerator] players_list/team_hero flow. news.content length:",
          news.content?.length ?? 0,
          "| news.description length:",
          news.description?.length ?? 0,
          "| images:",
          imageUrls.length,
        );
        const data = await generatePlayersListContent(news);
        console.log(
          "[CarouselGenerator] players_list/team_hero IA result:",
          data.slides.length,
          "slides",
          data.slides.map((s) => `${s.type}: ${s.title.slice(0, 30)}`),
        );
        const slides = buildSlidesFromPlayersList(data, imageUrls);
        console.log(
          "[CarouselGenerator] players_list/team_hero final slides:",
          slides.length,
        );
        setCarousel({
          slides,
          caption: data.caption,
          hashtags: data.hashtags,
          templateId: selectedTemplateId,
        });
      } else if (hasOpenAIKey()) {
        const guia = await generateGuiaSlidesContent(news);
        const slidesFull = buildSlidesFromGuiaContent(guia, imageUrls);
        let slides = sliceSlidesToCount(slidesFull, desiredSlideCount);
        if (desiredSlideCount > slides.length) {
          slides = extendGuideSlidesToCount(
            slides,
            desiredSlideCount,
            imageUrls,
          );
        }
        setCarousel({
          slides,
          caption: guia.caption,
          hashtags: guia.hashtags,
          templateId: selectedTemplateId,
        });
      } else {
        const slides = generateSlidesFromArticle(
          articleWithImages,
          desiredSlideCount,
        );
        const caption =
          [article.headline, article.description]
            .filter(Boolean)
            .join("\n\n")
            .slice(0, 2200) || "NFL — Fique por dentro.";
        const hashtags = ["#NFL", "#NFLBrasil", "#NFLNews"];
        setCarousel({
          slides,
          caption,
          hashtags,
          templateId: selectedTemplateId,
        });
      }
      setCurrentSlideIndex(0);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#013369", "#d50a0a", "#ffffff"],
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Falha ao gerar carrossel.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateImageUrl = (index: number, newUrl: string) => {
    if (!carousel) return;
    const newSlides = [...carousel.slides];
    newSlides[index] = {
      ...newSlides[index],
      image: newUrl.trim() || undefined,
    };
    setCarousel({ ...carousel, slides: newSlides });
    setEditingImageUrl(null);
  };

  useEffect(() => {
    setPlayerLibResults([]);
    setPlayerLibErr(null);
  }, [currentSlideIndex]);

  const runPlayerLibSearch = async () => {
    const name = playerLibName.trim();
    if (name.length < 2) {
      setPlayerLibErr("Digite pelo menos 2 letras do nome.");
      return;
    }
    setPlayerLibLoading(true);
    setPlayerLibErr(null);
    try {
      const team = playerLibTeam.trim();
      const query = [name, team, "NFL"].filter(Boolean).join(" ");
      const list = await searchGoogleImages(query, 10);
      setPlayerLibResults(list);
      if (list.length === 0) {
        setPlayerLibErr(
          "Nenhuma imagem encontrada. Tente outro nome, sigla do time (ex.: CHI) ou termos mais específicos.",
        );
      }
    } catch (e) {
      setPlayerLibErr(
        e instanceof Error ? e.message : "Falha ao buscar imagens (SerpAPI).",
      );
      setPlayerLibResults([]);
    } finally {
      setPlayerLibLoading(false);
    }
  };

  const applyPlayerLibImage = async (c: GoogleImageHit) => {
    if (!hasCloudinaryConfig()) {
      setError(
        "Configure Cloudinary (VITE_CLOUDINARY_*) para importar a foto do jogador.",
      );
      return;
    }
    setPlayerLibApplyingId(c.id);
    setError(null);
    try {
      const url = await uploadRemoteImageUrlToCloudinary(c.imageUrl, {
        fallbackUrl:
          c.thumbnailUrl && c.thumbnailUrl !== c.imageUrl
            ? c.thumbnailUrl
            : undefined,
      });
      handleUpdateImageUrl(currentSlideIndex, url);
      setPlayerLibErr(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Falha ao enviar imagem para Cloudinary.",
      );
    } finally {
      setPlayerLibApplyingId(null);
    }
  };

  const removeCarouselSlide = (index: number) => {
    if (!carousel || carousel.slides.length <= 2) return;
    const newSlides = carousel.slides
      .filter((_, i) => i !== index)
      .map((s, i) => ({
        ...s,
        id: i + 1,
      }));
    setCarousel({ ...carousel, slides: newSlides });
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    } else if (currentSlideIndex >= index && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleDownloadAll = async () => {
    if (!carousel) return;
    setExporting(true);
    setCaptureForExport(true);
    const previousIndex = currentSlideIndex;
    try {
      for (let i = 0; i < carousel.slides.length; i++) {
        setCurrentSlideIndex(i);
        await new Promise((r) => setTimeout(r, 350));
        const node = visibleSlideRef.current;
        if (node) {
          const dataUrl = await toPng(node, {
            quality: 1,
            pixelRatio: INSTAGRAM_CAROUSEL_WIDTH / CAROUSEL_PREVIEW_CSS_WIDTH,
          });
          const link = document.createElement("a");
          link.download = `nfl-carousel-slide-${i + 1}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
      setCurrentSlideIndex(previousIndex);
    } catch (e) {
      console.error(e);
      setCurrentSlideIndex(previousIndex);
    } finally {
      setCaptureForExport(false);
      setExporting(false);
    }
  };

  const handleCopyCaption = () => {
    if (!carousel) return;
    const fullText = `${carousel.caption}\n\n${carousel.hashtags.join(" ")}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateTexts = async () => {
    if (!hasOpenAIKey()) return;
    try {
      setLoading(true);
      setError(null);
      const imageUrls =
        article.images?.map((img) => img.url).filter(Boolean) ?? [];

      let slides: import("../types/carousel").CarouselSlideItem[];
      let caption: string;
      let hashtags: string[];

      if (
        selectedTemplateId === "players_list" ||
        selectedTemplateId === "team_hero"
      ) {
        const data = await generatePlayersListContent(news);
        slides = buildSlidesFromPlayersList(data, imageUrls);
        caption = data.caption;
        hashtags = data.hashtags;
      } else {
        const guia = await generateGuiaSlidesContent(news);
        const slidesFull = buildSlidesFromGuiaContent(guia, imageUrls);
        slides = sliceSlidesToCount(slidesFull, desiredSlideCount);
        if (desiredSlideCount > slides.length) {
          slides = extendGuideSlidesToCount(
            slides,
            desiredSlideCount,
            imageUrls,
          );
        }
        caption = guia.caption;
        hashtags = guia.hashtags;
      }

      setCarousel((prev) =>
        prev
          ? { ...prev, slides, caption, hashtags }
          : { slides, caption, hashtags, templateId: selectedTemplateId },
      );
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : "Falha ao regenerar textos do carrossel.",
      );
    } finally {
      setLoading(false);
    }
  };

  const regenerateImage = async (index: number) => {
    if (!carousel || !hasOpenAIKey()) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = await generateImagePrompt(
        news,
        carousel.slides[index].title ?? "",
      );
      const newImage = await generateSlideImage(prompt);
      const newSlides = [...carousel.slides];
      newSlides[index] = { ...newSlides[index], image: newImage };
      setCarousel({ ...carousel, slides: newSlides });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Falha ao regenerar imagem.");
    } finally {
      setLoading(false);
    }
  };

  /** Publicar carrossel no Instagram: PNG 1080×1350 (4:5) → Cloudinary → API Meta. */
  const handlePublishToInstagram = async () => {
    if (!carousel) return;
    const config = getInstagramConfig();
    if (!config.accessToken?.trim() || !config.accountId?.trim()) {
      setPublishMessage({
        type: "error",
        text: "Configure o Instagram em Perfil > Instagram.",
      });
      setTimeout(() => setPublishMessage(null), 5000);
      return;
    }
    if (!hasCloudinaryConfig()) {
      setPublishMessage({
        type: "error",
        text: "Cloudinary não configurada. Defina VITE_CLOUDINARY_CLOUD_NAME_STUDIO e VITE_CLOUDINARY_UPLOAD_PRESET_STUDIO (ou VITE_CLOUDINARY_* sem sufixo) no .env.",
      });
      setTimeout(() => setPublishMessage(null), 5000);
      return;
    }
    setPublishing(true);
    setPublishMessage(null);
    const previousIndex = currentSlideIndex;
    try {
      const uploadedUrls: string[] = [];
      const pixelRatio =
        INSTAGRAM_CAROUSEL_WIDTH / CAROUSEL_EXPORT_LAYER_CSS_WIDTH;
      for (let i = 0; i < carousel.slides.length; i++) {
        setCurrentSlideIndex(i);
        await new Promise((r) => setTimeout(r, 450));
        // Captura usando o ref do slide "oculto" correspondente ao índice,
        // evitando exportar o mesmo slide várias vezes.
        const node = slideRefs.current[i] ?? visibleSlideRef.current;
        if (!node) {
          throw new Error(
            `Slide ${i + 1} não disponível para exportar. Tente novamente.`,
          );
        }
        const dataUrl = await toPng(node, {
          quality: 1,
          pixelRatio,
        });
        const url = await uploadImageToCloudinary(dataUrl);
        uploadedUrls.push(url);
      }
      setCurrentSlideIndex(previousIndex);
      if (uploadedUrls.length < 2) {
        throw new Error("Carrossel precisa de pelo menos 2 imagens.");
      }
      const rawCaption = `${carousel.caption}\n\n${carousel.hashtags.join(" ")}`;
      const caption =
        rawCaption.length > 2200
          ? rawCaption.slice(0, 2197) + "..."
          : rawCaption;
      await publishCarouselToInstagram({
        imageUrls: uploadedUrls,
        caption,
        accessToken: config.accessToken,
        accountId: config.accountId,
      });
      setPublishMessage({
        type: "success",
        text: "Carrossel publicado no Feed!",
      });
      setTimeout(() => setPublishMessage(null), 5000);
      await markArticleInstagramPublished(article.dataSourceIdentifier);
      setTimeout(onClose, 1500);
    } catch (e) {
      console.error("[CarouselGenerator] publish error", e);
      setCurrentSlideIndex(previousIndex);
      let msg: string;
      if (e instanceof Error) {
        msg = e.message;
      } else if (
        e &&
        typeof e === "object" &&
        "type" in e &&
        (e as Event).type === "error"
      ) {
        msg =
          "Uma imagem do slide não carregou. Verifique as URLs das imagens ou gere o carrossel novamente.";
      } else {
        msg = String(e) || "Erro ao publicar no Instagram.";
      }
      setPublishMessage({ type: "error", text: msg });
      setTimeout(() => setPublishMessage(null), 5000);
    } finally {
      setCaptureForExport(false);
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex h-full max-h-[96vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-nfl-red" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Gerar <span className="text-nfl-red">carrossel</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-nfl-red px-6 py-2.5 font-bold text-white transition-colors hover:bg-nfl-red/90 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <Zap size={20} />
              )}
              {loading ? "Gerando…" : "Gerar carrossel"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main content */}
          <div className="flex flex-1 flex-col gap-6 overflow-auto p-6 lg:flex-row">
            {/* Left: generate button + preview */}
            <div className="flex flex-col gap-6 lg:flex-1">
              {!carousel && (
                <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-8">
                  <p className="text-center text-white/70">
                    Gere um carrossel para Instagram a partir desta notícia.
                  </p>

                  {/* Buscar conteúdo ESPN (imagens da notícia) — igual ao PostGenerator */}
                  <div className="space-y-2">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest block">
                      Buscar conteúdo ESPN
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={espnUrlInput}
                        onChange={(e) => setEspnUrlInput(e.target.value)}
                        placeholder="Cole a URL da notícia ESPN"
                        className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:border-nfl-red outline-none"
                      />
                      <button
                        type="button"
                        onClick={fetchContentFromEspn}
                        disabled={isFetchingContent}
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/20 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {isFetchingContent ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          "Buscar"
                        )}
                      </button>
                    </div>
                    {fetchContentMessage && (
                      <p
                        className={cn(
                          "text-xs",
                          fetchContentMessage.startsWith("Conteúdo")
                            ? "text-emerald-400/90"
                            : "text-amber-400/90",
                        )}
                      >
                        {fetchContentMessage}
                      </p>
                    )}
                    {fetchedContentImageUrls.length >= 2 && (
                      <p className="text-emerald-400/90 text-xs font-medium">
                        Carrossel ({fetchedContentImageUrls.length} imagens)
                      </p>
                    )}
                    {fetchedContentImageUrls.length >= 2 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {fetchedContentImageUrls.map((url, i) => (
                          <div
                            key={`${url}-${i}`}
                            className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-white/20 bg-black/40"
                          >
                            <img
                              src={url}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Seletor de template visual */}
                  <div className="space-y-2">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest block">
                      Estilo do carrossel
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                      {VISUAL_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={cn(
                            "flex flex-col items-start rounded-xl border p-3 text-left transition-colors",
                            selectedTemplateId === t.id
                              ? "border-nfl-red bg-nfl-red/20 text-white"
                              : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10",
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-bold text-sm">
                            <Layout size={14} />
                            {t.name}
                          </span>
                          <span className="mt-1 text-[11px] leading-tight text-white/60">
                            {t.description}
                          </span>
                          <TemplatePreview
                            templateId={t.id}
                            images={news.images}
                            config={slideConfig}
                            teamLogo={
                              showTeamLogo
                                ? (article.team?.logo ?? undefined)
                                : undefined
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seletor de quantidade de slides */}
                  <div className="space-y-2">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest block">
                      Número de slides
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SLIDE_COUNT_OPTIONS.map((n) => {
                        const disabled =
                          selectedTemplateId === "players_list" ||
                          selectedTemplateId === "team_hero";
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setDesiredSlideCount(n)}
                            disabled={disabled}
                            className={cn(
                              "rounded-xl border p-3 text-left transition-colors font-bold text-sm",
                              selectedTemplateId === "players_list" ||
                                selectedTemplateId === "team_hero"
                                ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                                : desiredSlideCount === n
                                  ? "border-nfl-red bg-nfl-red/20 text-white"
                                  : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10",
                            )}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-white/50">
                      Ajusta somente os estilos do guia (Capa/Fato/imagens/CTA).
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={showTeamLogo}
                      onChange={(e) => setShowTeamLogo(e.target.checked)}
                      className="rounded border-white/30 bg-black/40 text-nfl-red accent-nfl-red"
                    />
                    <span className="text-white/75 text-sm font-medium">
                      Mostrar logo do time no carrossel
                    </span>
                  </label>

                  {error && (
                    <p className="rounded-lg bg-nfl-red/20 px-4 py-2 text-sm text-nfl-red">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-nfl-red px-6 py-3 font-bold text-white transition-colors hover:bg-nfl-red/90 disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <Zap size={20} />
                    )}
                    {loading ? "Gerando…" : "Gerar carrossel"}
                  </button>
                </div>
              )}

              {carousel && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Preview</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
                        }
                        className="rounded-full border border-white/10 p-2 text-white transition-colors hover:bg-white/5"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="px-2 text-sm text-white/60">
                        {currentSlideIndex + 1} / {carousel.slides.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentSlideIndex((prev) =>
                            Math.min(carousel.slides.length - 1, prev + 1),
                          )
                        }
                        className="rounded-full border border-white/10 p-2 text-white transition-colors hover:bg-white/5"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="group relative mx-auto aspect-4/5 w-full shrink-0 overflow-hidden rounded-lg"
                    style={{ maxWidth: CAROUSEL_PREVIEW_CSS_WIDTH }}
                  >
                    {/*
                      Slides só para export (toPng): empilhados em coluna fora do ecrã.
                      Uma fila horizontal com muitos slides invadia o preview; coluna mantém
                      largura ~540px e -9999px basta para esconder todos.
                    */}
                    <div
                      className="pointer-events-none absolute top-0 -left-[9999px] z-0 flex w-max flex-col gap-0"
                      aria-hidden
                    >
                      {carousel.slides.map((s, i) => (
                        <div
                          key={`export-${s.id}`}
                          className="shrink-0"
                          style={{
                            width: CAROUSEL_EXPORT_LAYER_CSS_WIDTH,
                            height: Math.round(
                              (CAROUSEL_EXPORT_LAYER_CSS_WIDTH * 5) / 4,
                            ),
                          }}
                        >
                          <SlideRendererGuia
                            slide={s}
                            templateId={carousel.templateId}
                            config={slideConfig}
                            textOptions={textOptions}
                            aspectRatio="4:5"
                            teamLogo={
                              showTeamLogo
                                ? (article.team?.logo ?? undefined)
                                : undefined
                            }
                            ref={(el) => {
                              slideRefs.current[i] = el;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Slide visível (por cima da camada de export) */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlideIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="relative z-10 w-full"
                      >
                        <SlideRendererGuia
                          slide={carousel.slides[currentSlideIndex]}
                          templateId={carousel.templateId}
                          config={slideConfig}
                          textOptions={textOptions}
                          aspectRatio="4:5"
                          teamLogo={
                            showTeamLogo
                              ? (article.team?.logo ?? undefined)
                              : undefined
                          }
                          ref={visibleSlideRef}
                          forcePlaceholderImage={captureForExport}
                        />
                      </motion.div>
                    </AnimatePresence>

                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingImageUrl({
                            index: currentSlideIndex,
                            url: carousel.slides[currentSlideIndex].image ?? "",
                          })
                        }
                        className="rounded-full border border-white/20 bg-black/50 p-3 backdrop-blur-md transition-colors hover:bg-nfl-red"
                        title="Editar URL da imagem"
                      >
                        <ImageIcon size={20} className="text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => regenerateImage(currentSlideIndex)}
                        disabled={loading}
                        className="rounded-full border border-white/20 bg-black/50 p-3 backdrop-blur-md transition-colors hover:bg-nfl-blue disabled:opacity-50"
                        title="Regenerar imagem com IA"
                      >
                        <RefreshCw
                          size={20}
                          className={
                            loading ? "animate-spin text-white" : "text-white"
                          }
                        />
                      </button>
                    </div>

                    <AnimatePresence>
                      {editingImageUrl && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-20 left-4 right-4 z-20 rounded-xl border border-white/20 bg-[#0a0a0a]/95 p-4 shadow-2xl backdrop-blur-xl"
                        >
                          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">
                            URL da imagem
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-nfl-red"
                              placeholder="https://..."
                              value={editingImageUrl.url}
                              onChange={(e) =>
                                setEditingImageUrl({
                                  ...editingImageUrl,
                                  url: e.target.value,
                                })
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleUpdateImageUrl(
                                  editingImageUrl.index,
                                  editingImageUrl.url,
                                )
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateImageUrl(
                                  editingImageUrl.index,
                                  editingImageUrl.url,
                                )
                              }
                              className="rounded-lg bg-nfl-red px-4 py-2 text-sm font-bold text-white"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingImageUrl(null)}
                              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {error && (
                    <p className="rounded-lg bg-nfl-red/20 px-4 py-2 text-sm text-nfl-red">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-center gap-4">
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={exporting}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                    >
                      {exporting ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : (
                        <Download size={20} />
                      )}
                      {exporting ? "Exportando…" : "Download todos PNG"}
                    </button>
                    {!hasInstagramConfig() && (
                      <p className="text-amber-400/90 text-xs bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2.5">
                        Configure em Perfil &gt; Instagram (token + ID da
                        conta).
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handlePublishToInstagram}
                      disabled={publishing || !hasInstagramConfig()}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-colors",
                        hasInstagramConfig()
                          ? "bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                          : "bg-white/10 text-white/40 cursor-not-allowed",
                      )}
                    >
                      {publishing ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                      {publishing ? "Publicando…" : "Publicar no Instagram"}
                    </button>
                  </div>

                  {/* URL + preview da imagem de cada slide (abaixo de Exportar / Publicar) */}
                  <div
                    className="w-full space-y-3 self-center"
                    style={{ maxWidth: CAROUSEL_PREVIEW_CSS_WIDTH }}
                  >
                    {(() => {
                      const cur = carousel.slides[currentSlideIndex];
                      if (!cur) return null;
                      const thumb = cur.image?.trim() ?? "";
                      return (
                        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase text-white/50">
                              Slide {currentSlideIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeCarouselSlide(currentSlideIndex)
                              }
                              disabled={carousel.slides.length <= 2}
                              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <X size={10} /> Remover
                            </button>
                          </div>
                          <div className="overflow-hidden rounded-xl border border-white/15 bg-black/50">
                            {/* <div className="relative aspect-4/5 w-full max-h-[min(70vh,560px)] min-h-[220px]">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="h-full w-full object-cover object-center"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex h-full min-h-[220px] w-full items-center justify-center text-sm text-white/30">
                                  Sem imagem — pesquisa abaixo ou cola URL
                                </div>
                              )}
                            </div> */}
                          </div>
                          <input
                            type="url"
                            value={cur.image ?? ""}
                            onChange={(e) =>
                              handleUpdateImageUrl(
                                currentSlideIndex,
                                e.target.value,
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-nfl-red"
                          />

                          <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                              <User size={12} className="shrink-0" />
                              Google Imagens (SerpAPI)
                            </div>
                            <p className="text-[10px] leading-snug text-white/40">
                              Pesquisa imagens na web via SerpAPI (chave no
                              servidor: SERPAPI_API_KEY). Envia para Cloudinary
                              e preenche o campo acima. Time opcional ajuda a
                              refinar (sigla: CHI, GB…).
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                              <div className="min-w-0 flex-1">
                                <label className="mb-0.5 block text-[9px] font-bold uppercase text-white/35">
                                  Nome do jogador
                                </label>
                                <input
                                  type="text"
                                  value={playerLibName}
                                  onChange={(e) =>
                                    setPlayerLibName(e.target.value)
                                  }
                                  placeholder="Ex.: Coby Bryant"
                                  className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-nfl-red"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void runPlayerLibSearch();
                                    }
                                  }}
                                />
                              </div>
                              <div className="w-full sm:w-28">
                                <label className="mb-0.5 block text-[9px] font-bold uppercase text-white/35">
                                  Time (opcional)
                                </label>
                                <input
                                  type="text"
                                  value={playerLibTeam}
                                  onChange={(e) =>
                                    setPlayerLibTeam(e.target.value)
                                  }
                                  placeholder="CHI"
                                  className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-nfl-red"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => void runPlayerLibSearch()}
                                disabled={playerLibLoading}
                                className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-nfl-blue/90 px-3 py-2 text-[11px] font-bold text-white hover:bg-nfl-blue disabled:opacity-50"
                              >
                                {playerLibLoading ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Search size={14} />
                                )}
                                Buscar
                              </button>
                            </div>
                            {playerLibErr && (
                              <p className="text-[11px] text-amber-400/90">
                                {playerLibErr}
                              </p>
                            )}
                            {!hasCloudinaryConfig() && (
                              <p className="text-[10px] text-amber-400/80">
                                Configure Cloudinary para importar a foto
                                (upload da URL da imagem).
                              </p>
                            )}
                            {playerLibResults.length > 0 && (
                              <div className="grid max-h-[min(55vh,520px)] grid-cols-1 gap-3 overflow-y-auto overflow-x-hidden pr-1 sm:grid-cols-2">
                                {playerLibResults.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => void applyPlayerLibImage(c)}
                                    disabled={
                                      playerLibApplyingId !== null ||
                                      !hasCloudinaryConfig()
                                    }
                                    className="group flex flex-col overflow-hidden rounded-xl border border-white/15 bg-black/50 text-left transition-colors hover:border-nfl-red hover:bg-white/[0.07] disabled:opacity-50"
                                  >
                                    <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-black/70">
                                      <img
                                        src={c.thumbnailUrl || c.imageUrl}
                                        alt=""
                                        className="h-full w-full object-cover object-center transition-transform group-hover:scale-[1.02]"
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                      />
                                      {playerLibApplyingId === c.id ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                          <Loader2
                                            size={28}
                                            className="animate-spin text-white"
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-2.5">
                                      <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white/95">
                                        {c.title}
                                      </span>
                                      {c.displayLink ? (
                                        <span className="line-clamp-1 text-[10px] text-white/40">
                                          {c.displayLink}
                                        </span>
                                      ) : null}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Right: source + caption + slides list */}
            <div className="flex w-full flex-col gap-6 lg:w-[400px] lg:shrink-0">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-nfl-red">
                  Fonte
                </div>
                <h4 className="text-lg font-bold leading-tight text-white">
                  {article.headline}
                </h4>
                <p className="mt-2 line-clamp-3 text-sm text-white/50">
                  {article.description}
                </p>
                <div className="mt-4 flex gap-4 border-t border-white/5 pt-4 text-xs">
                  <div>
                    <div className="uppercase text-white/40">Autor</div>
                    <div className="font-bold text-white">
                      {article.byline ?? "NFL Studio Brasil"}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase text-white/40">Data</div>
                    <div className="font-bold text-white">
                      {article.published
                        ? formatDateTime(article.published)
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
                  Logo do time
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTeamLogo}
                    onChange={(e) => setShowTeamLogo(e.target.checked)}
                    className="rounded border-white/30 bg-black/40 text-nfl-red accent-nfl-red"
                  />
                  <span className="text-white/75 text-sm">
                    Mostrar logo do time nos slides
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
                  Overlay da imagem
                </div>
                <p className="mb-2 text-[11px] text-white/50">
                  Opacidade do escurecimento sobre a foto de fundo (deixa o
                  texto mais legível).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(imageOverlayOpacity * 100)}
                    onChange={(e) =>
                      setImageOverlayOpacity(
                        Math.round(Number(e.target.value)) / 100,
                      )
                    }
                    className="flex-1 accent-nfl-red"
                  />
                  <span className="w-10 text-right text-sm font-bold tabular-nums text-white/80">
                    {Math.round(imageOverlayOpacity * 100)}%
                  </span>
                </div>
              </div>

              {carousel && (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
                      Tamanho do texto
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-white/50">
                          Título
                        </label>
                        <select
                          value={textOptions.titleSize ?? "medium"}
                          onChange={(e) =>
                            setTextOptions((o) => ({
                              ...o,
                              titleSize: e.target.value as CarouselTextSize,
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-nfl-red outline-none"
                        >
                          <option value="small">Pequeno</option>
                          <option value="medium">Médio</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-white/50">
                          Descrição
                        </label>
                        <select
                          value={textOptions.contentSize ?? "medium"}
                          onChange={(e) =>
                            setTextOptions((o) => ({
                              ...o,
                              contentSize: e.target.value as CarouselTextSize,
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-nfl-red outline-none"
                        >
                          <option value="small">Pequeno</option>
                          <option value="medium">Médio</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-white/50">
                          Linhas da descrição
                        </label>
                        <select
                          value={
                            textOptions.descriptionMaxLines === "unlimited"
                              ? "unlimited"
                              : String(textOptions.descriptionMaxLines ?? 5)
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setTextOptions((o) => ({
                              ...o,
                              descriptionMaxLines:
                                v === "unlimited"
                                  ? "unlimited"
                                  : Math.min(15, Math.max(3, parseInt(v, 10))),
                            }));
                          }}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-nfl-red outline-none"
                        >
                          <option value="3">3 linhas</option>
                          <option value="5">5 linhas</option>
                          <option value="8">8 linhas</option>
                          <option value="12">12 linhas</option>
                          <option value="unlimited">Sem limite</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-nfl-blue">
                        <Share2 size={14} />
                        Legenda
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCopyCaption}
                          className="flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-nfl-red"
                        >
                          {copied ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                          {copied ? "Copiado" : "Copiar"}
                        </button>
                        {hasOpenAIKey() && (
                          <button
                            type="button"
                            onClick={handleRegenerateTexts}
                            disabled={loading}
                            className="text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-nfl-blue disabled:opacity-40"
                          >
                            {loading ? "Gerando…" : "Regenerar textos"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-40 overflow-auto rounded-xl bg-black/40 p-3 text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                      {carousel.caption}
                      {"\n\n"}
                      <span className="text-nfl-blue">
                        {carousel.hashtags.join(" ")}
                      </span>
                    </div>
                  </div>

                  {/* <div className="space-y-2">
                    <div className="px-2 text-xs font-bold uppercase tracking-wider text-white/40">
                      Slides
                    </div>
                    {carousel.slides.map((slide, idx) => (
                      <div
                        key={slide.id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-all",
                          currentSlideIndex === idx
                            ? "border-nfl-blue bg-nfl-blue/20"
                            : "border-white/10 bg-white/5",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setCurrentSlideIndex(idx)}
                          className="flex flex-1 min-w-0 items-center gap-4 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/40 text-sm font-bold text-white">
                            {slide.id}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold uppercase text-white/40">
                              {slide.type}
                            </div>
                            <div className="truncate text-sm font-bold text-white">
                              {slide.title}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCarouselSlide(idx)}
                          disabled={carousel.slides.length <= 2}
                          title="Remover slide"
                          className="shrink-0 p-1.5 rounded-lg text-white/40 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div> */}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast de publicação (igual ao PostGenerator) */}
      <AnimatePresence>
        {publishMessage && (
          <motion.div
            key="publish-toast"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 right-6 z-100 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg ring-1 text-sm font-medium",
              publishMessage.type === "success"
                ? "bg-emerald-600/95 text-white ring-emerald-500/50"
                : "bg-red-600/95 text-white ring-red-500/50",
            )}
          >
            {publishMessage.type === "success" ? (
              <Check size={16} className="shrink-0" />
            ) : (
              <X size={16} className="shrink-0" />
            )}
            <span>{publishMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
