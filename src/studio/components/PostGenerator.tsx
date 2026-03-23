import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Instagram,
  X,
  Type as TypeIcon,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  ArrowUp,
  Zap,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Italic,
  CaseUpper,
  RotateCcw,
  Send,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Bug,
} from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { ImArrowRight } from "react-icons/im";
import { AiOutlineArrowRight } from "react-icons/ai";

import {
  Article,
  markArticleInstagramPublished,
} from "../services/newsService";
import { cn } from "../lib/utils";
import { getTeamBrand, type TeamBrand } from "../lib/teamColors";
import { ALL_NFL_TEAMS } from "../lib/nfl-teams";
import { TeamBranding } from "./TeamBranding";

import {
  getInstagramConfig,
  hasInstagramConfig,
} from "../lib/instagram-settings";
import {
  publishImageToInstagram,
  publishStoryImageToInstagram,
  publishCarouselToInstagram,
  publishReelToInstagram,
} from "../lib/instagram-publish";
import {
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
  hasCloudinaryConfig,
} from "../lib/cloudinary-upload";
import { fetchEspnArticleContent } from "../lib/espn-content";
import {
  rewriteContentAsCaption,
  hasOpenAIKey,
} from "../lib/openai-rewrite-caption";
import {
  generateEpicNewsImageWithReplicate,
  hasReplicateToken,
  type NewsVisualCategory,
  type ReplicateAspectRatio,
} from "../lib/replicate-epic-image";
import type { EspnGame } from "../services/espnScoreboard";
import { getFirstHalfScore } from "../services/espnScoreboard";
import {
  fetchGameSummary,
  type EspnGameSummary,
} from "../services/espnGameSummary";
import type { EspnStandings } from "../services/espnStandings";
import type { ScheduleWeek } from "../services/espnSchedule";
import type { EditorData } from "../types/editorData";
import { fetchGameRecap } from "../services/espnRecap";
import { fetchGamePredictor } from "../services/espnPredictor";
import type { GameRecap } from "../services/espnRecap";
import type { GamePredictor } from "../services/espnPredictor";
import { useHideTeamLogo } from "../context/HideLogoContext";
import { HiArrowLongRight } from "react-icons/hi2";

interface PostGeneratorProps {
  article: Article;
  onClose: () => void;
  /** Quando aberto pela página "Criar post" (jogo ESPN), habilita templates Matchup, 1º tempo, Líderes. */
  gameData?: EspnGame;
  /** Tabela de classificação (AFC/NFC) para templates de standings. */
  standingsData?: EspnStandings | null;
  /** Jogos da semana para template grid. */
  scheduleData?: ScheduleWeek | null;
  /** Dados da DataPage ou TeamsPage (news, leaders, injuries, draft, etc.). */
  editorData?: EditorData | null;
}

type PostStyle =
  | "BREAKING"
  | "RELEASED"
  | "RUMORS"
  | "TRADED"
  | "TRADED_CARD"
  | "QUOTE"
  | "SPLIT_TRADE"
  | "SPLIT_RELEASE"
  | "BIG_BOTTOM"
  | "TOP_HEADLINE"
  | "CHOP_STYLE"
  | "MINIMAL"
  | "TICKER"
  | "HERO"
  | "CARD"
  | "BANNER"
  | "SPOTLIGHT"
  | "NEON"
  | "EDITORIAL"
  | "VINTAGE"
  | "WAVE"
  | "SIGNING_CARD"
  | "WELCOME_POSTER"
  | "BOLD_CONTRACT"
  | "CUTOUT_HERO"
  | "SIDE_STRIPE"
  | "CENTER_BADGE"
  | "DUAL_PANEL"
  | "RIBBON_HEADLINE"
  | "STACKED_NEWS"
  | "GRID_HERO"
  | "MATCHUP"
  | "HALFTIME"
  | "LEADERS"
  | "SCOREBOARD"
  | "QUARTERS"
  | "STATS"
  | "GAME_CARD"
  | "BOX_SCORE"
  | "STATS_DETAILED"
  | "ROSTER"
  | "WIN_PROBABILITY"
  | "DRIVES"
  | "STANDINGS_AFC_NFC"
  | "STANDINGS_DIVISION"
  | "RACE_PLAYOFFS"
  | "SCHEDULE_WEEK_GRID"
  | "NEWS_CAROUSEL"
  | "NEWS_TOP5"
  | "SEASON_LEADERS"
  | "INJURIES_REPORT"
  | "DRAFT_ROUND"
  | "ODDS_LINE"
  | "GAME_RECAP"
  | "QBR_WEEK"
  | "NEXT_GAME_TEAM"
  | "PREDICTOR"
  | "TRANSACTIONS"
  | "FUTURES"
  | "TALENT_PICKS";
type PostFormat = "1:1" | "4:5" | "9:16";
type FontOption = "font-sans" | "font-display" | "font-mono" | "font-serif";

/** Dimensões oficiais Instagram Stories: 1080×1920 (9:16). Evita corte em diferentes celulares. */
const INSTAGRAM_STORIES_WIDTH = 1080;
const INSTAGRAM_STORIES_HEIGHT = 1920;

/** Dimensões de base para posts de Feed (usadas no template e nos itens do carrossel). */
const INSTAGRAM_FEED_WIDTH = 1080;
function getFeedDimensionsForFormat(format: PostFormat): {
  width: number;
  height: number;
} {
  switch (format) {
    case "1:1":
      return { width: INSTAGRAM_FEED_WIDTH, height: INSTAGRAM_FEED_WIDTH };
    case "4:5":
      return {
        width: INSTAGRAM_FEED_WIDTH,
        height: Math.round((INSTAGRAM_FEED_WIDTH * 5) / 4),
      };
    case "9:16":
    default:
      return {
        width: INSTAGRAM_FEED_WIDTH,
        height: Math.round((INSTAGRAM_FEED_WIDTH * 16) / 9),
      };
  }
}

/**
 * Redimensiona um data URL de imagem para exatamente width×height.
 * - mode "fit": mantém tudo visível (pode ter faixas).
 * - mode "cover": preenche tudo e corta o excesso (igual ao object-fit: cover).
 */
function resizeImageDataUrlTo(
  dataUrl: string,
  width: number,
  height: number,
  mimeType: "image/jpeg" = "image/jpeg",
  quality = 0.92,
  mode: "fit" | "cover" = "fit",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2d não disponível"));
        return;
      }
      const scale =
        mode === "cover"
          ? Math.max(width / img.width, height / img.height)
          : Math.min(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, x, y, w, h);
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = () =>
      reject(new Error("Falha ao carregar imagem para redimensionar"));
    img.src = dataUrl;
  });
}
type ImagePosition = "top" | "center" | "bottom";

function getInitialStyle(
  gameData?: EspnGame | null,
  standingsData?: EspnStandings | null,
  scheduleData?: ScheduleWeek | null,
  editorData?: EditorData | null,
): PostStyle {
  if (gameData) return "MATCHUP";
  if (standingsData) return "STANDINGS_AFC_NFC";
  if (scheduleData) return "SCHEDULE_WEEK_GRID";
  if (editorData) {
    switch (editorData.type) {
      case "espn_news":
        return "NEWS_CAROUSEL";
      case "season_leaders":
        return "SEASON_LEADERS";
      case "injuries":
        return "INJURIES_REPORT";
      case "draft":
        return "DRAFT_ROUND";
      case "qbr_week":
        return "QBR_WEEK";
      case "transactions":
        return "TRANSACTIONS";
      case "futures":
        return "FUTURES";
      case "talent_picks":
        return "TALENT_PICKS";
      case "next_game":
        return "NEXT_GAME_TEAM";
      default:
        return "BREAKING";
    }
  }
  return "BREAKING";
}

export const PostGenerator: React.FC<PostGeneratorProps> = ({
  article,
  onClose,
  gameData,
  standingsData,
  scheduleData,
  editorData,
}) => {
  const [activeStyle, setActiveStyle] = useState<PostStyle>(() =>
    getInitialStyle(gameData, standingsData, scheduleData, editorData),
  );
  const [activeFormat, setActiveFormat] = useState<PostFormat>("1:1");
  const [headline, setHeadline] = useState(article.headline);
  const [subtext, setSubtext] = useState(
    article.description
      ? article.description.slice(0, 500) +
          (article.description.length > 500 ? "..." : "")
      : "Sem descrição",
  );
  const baseTeamBrand = getTeamBrand(article);
  const [selectedTeamForOriginal, setSelectedTeamForOriginal] =
    useState<TeamBrand | null>(null);
  const teamBrand = selectedTeamForOriginal ?? baseTeamBrand;
  const [accentColor, setAccentColor] = useState(teamBrand.primary);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Instagram: destino, legenda e publicação
  type PublishDestination = "feed" | "stories" | "reels";
  const [publishDestination, setPublishDestination] =
    useState<PublishDestination>("feed");
  const [captionForInstagram, setCaptionForInstagram] = useState("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  // Conteúdo completo da notícia (buscar conteúdo ESPN) — só para Feed
  const [fullArticleContent, setFullArticleContent] = useState("");
  /** URLs de imagens retornadas ao "Buscar conteúdo" (ESPN). Usado para publicar como carrossel. */
  const [fetchedContentImageUrls, setFetchedContentImageUrls] = useState<
    string[]
  >([]);
  const [publishAsCarousel, setPublishAsCarousel] = useState(false);
  /** Índice do slide exibido no preview do carrossel (área central). */
  const [carouselPreviewIndex, setCarouselPreviewIndex] = useState(0);
  /** Data URL da 1ª imagem (para captura do carrossel sem tainting por cross-origin). */
  const [carouselCaptureImageDataUrl, setCarouselCaptureImageDataUrl] =
    useState<string | null>(null);
  /** Ref opcional para capturar diretamente o preview visível do template (slide 1 do carrossel). */
  const carouselTemplatePreviewRef = useRef<HTMLDivElement | null>(null);
  /** Dados de debug da captura do template para investigar imagem preta no carrossel. */
  const [debugTemplateDataUrl, setDebugTemplateDataUrl] = useState<
    string | null
  >(null);
  const [debugTemplateImageUrl, setDebugTemplateImageUrl] = useState<
    string | null
  >(null);
  const [espnUrlInput, setEspnUrlInput] = useState(
    article.sourceUrl?.trim() ?? "",
  );
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [publishMessage, setPublishMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /** URL da imagem gerada pelo Replicate (nano-banana-2); substitui a foto de fundo dos templates. */
  const [replicateHeroImageUrl, setReplicateHeroImageUrl] = useState<
    string | null
  >(null);
  const [isGeneratingEpicImage, setIsGeneratingEpicImage] = useState(false);
  const [epicImageCategory, setEpicImageCategory] =
    useState<NewsVisualCategory | null>(null);
  const [isGeneratingEpicVariations, setIsGeneratingEpicVariations] =
    useState(false);
  const [epicVariationUrls, setEpicVariationUrls] = useState<string[]>([]);

  const [gameSummaryData, setGameSummaryData] =
    useState<EspnGameSummary | null>(null);
  const [gameSummaryLoading, setGameSummaryLoading] = useState(false);
  const [recapData, setRecapData] = useState<GameRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [predictorData, setPredictorData] = useState<GamePredictor | null>(
    null,
  );
  const [predictorLoading, setPredictorLoading] = useState(false);
  const SUMMARY_STYLES: PostStyle[] = [
    "BOX_SCORE",
    "STATS_DETAILED",
    "ROSTER",
    "WIN_PROBABILITY",
    "DRIVES",
  ];

  // Text Controls
  const [headlineSize, setHeadlineSize] = useState(48);
  const [headlineFont, setHeadlineFont] = useState<FontOption>("font-display");
  const [headlineAlign, setHeadlineAlign] = useState<
    "left" | "center" | "right"
  >("left");
  const [headlineItalic, setHeadlineItalic] = useState(true);
  const [headlineUppercase, setHeadlineUppercase] = useState(true);
  const [headlineLetterSpacing, setHeadlineLetterSpacing] = useState(0);
  const [headlineWordSpacing, setHeadlineWordSpacing] = useState(4);
  const [subtextSize, setSubtextSize] = useState(16);

  // BOLD_CONTRACT: texto da tag e nome do time
  const [contractLabel, setContractLabel] = useState("CONTRACT");
  const [contractTeamLabel, setContractTeamLabel] = useState(
    baseTeamBrand.name.toUpperCase(),
  );

  type RightPanelTab = "design" | "instagram";
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("design");

  const { hideTeamLogo, setHideTeamLogo } = useHideTeamLogo();

  // Badge Controls
  const [badgeText, setBadgeText] = useState("BREAKING");
  const [badgeSize, setBadgeSize] = useState(36);
  const [badgeSkew, setBadgeSkew] = useState(-10);

  // CHOP_STYLE: nome do jogador dispensado
  const [releasedPlayerName, setReleasedPlayerName] = useState("");

  // RUMORS: texto vertical da faixa lateral
  const [rumorsLabel, setRumorsLabel] = useState("RUMORS");

  // TOP_HEADLINE: linhas customizáveis do título
  const [topHeadlinePrimary, setTopHeadlinePrimary] =
    useState("THE RUNNING BACK");
  const [topHeadlineSecondary, setTopHeadlineSecondary] = useState("WE NEED");

  // Margem do texto para as bordas do post (px)
  const [textMargin, setTextMargin] = useState(32);

  // Time original â†’ time contratante: null = time do artigo; selecionado = time contratante (logo/nome/cores nos templates).
  const [selectedTeamForLogo, setSelectedTeamForLogo] =
    useState<TeamBrand | null>(null);

  // Escala do logo do time nos templates (50% a 150%, 100 = tamanho padrão)
  const [teamLogoScale, setTeamLogoScale] = useState(100);

  // Posição da imagem de fundo (topo / centro / base) e ajuste horizontal
  const [imagePosition, setImagePosition] = useState<ImagePosition>("center");
  /** Deslocamento horizontal da imagem em relação ao centro, em pontos percentuais (-40 = mais à esquerda, +40 = mais à direita). */
  const [imageHorizontalOffset, setImageHorizontalOffset] = useState(0);
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

  const postRef = useRef<HTMLDivElement>(null);

  const formats = {
    "1:1": "aspect-square w-[500px]",
    "4:5": "aspect-[4/5] w-[400px]",
    "9:16": "aspect-[9/16] w-[300px]",
  };

  // Sincronizar URL original quando trocar de artigo (ex.: listagem Supabase com source_url)
  useEffect(() => {
    setEspnUrlInput(article.sourceUrl?.trim() ?? "");
  }, [article.dataSourceIdentifier, article.sourceUrl]);

  // Ao abrir o gerador para uma notícia com sourceUrl, buscar automaticamente o conteúdo da ESPN
  useEffect(() => {
    if (!article.sourceUrl) return;
    const url = article.sourceUrl.trim();
    if (!url) return;
    // Evita refetch se já carregamos conteúdo para a mesma URL
    if (fullArticleContent.trim().length > 0 && espnUrlInput.trim() === url)
      return;
    setEspnUrlInput(url);
    // Chama a mesma função usada pelo botão "Buscar"
    fetchContentFromEspn();
  }, [
    article.dataSourceIdentifier,
    article.sourceUrl,
    fullArticleContent,
    espnUrlInput,
  ]);

  // Resetar slide do preview do carrossel quando a lista de imagens mudar
  useEffect(() => {
    setCarouselPreviewIndex(0);
  }, [fetchedContentImageUrls.length]);

  const removeCarouselImage = (index: number) => {
    const nextUrls = fetchedContentImageUrls.filter((_, i) => i !== index);
    setFetchedContentImageUrls(nextUrls);
    if (nextUrls.length <= 1) setCarouselPreviewIndex(0);
    else if (index < carouselPreviewIndex)
      setCarouselPreviewIndex((i) => i - 1);
    else if (index === carouselPreviewIndex)
      setCarouselPreviewIndex(
        Math.min(carouselPreviewIndex, nextUrls.length - 1),
      );
  };

  // Ao escolher Stories, o preview passa para 9:16 (1080×1920) para refletir o que será publicado
  useEffect(() => {
    if (publishDestination === "stories") {
      if (activeFormat !== "9:16") setActiveFormat("9:16");
    } else if (publishDestination === "reels") {
      // Reels agora será exportado em 4:5 (1080×1350)
      if (activeFormat !== "4:5") setActiveFormat("4:5");
    } else if (publishDestination === "feed" && activeFormat === "9:16") {
      setActiveFormat("4:5");
    }
  }, [publishDestination, activeFormat]);

  // Reels não suporta carrossel (apenas vídeo único)
  useEffect(() => {
    if (publishDestination === "reels" && publishAsCarousel) {
      setPublishAsCarousel(false);
    }
  }, [publishDestination, publishAsCarousel]);

  async function createStillVideoFromImageDataUrl(params: {
    imageDataUrl: string;
    width: number;
    height: number;
    durationMs?: number;
    fps?: number;
  }): Promise<Blob> {
    const { imageDataUrl, width, height, durationMs = 5000, fps = 30 } = params;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2d não disponível (Reels).");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageDataUrl;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Falha ao carregar imagem do post."));
    });

    const drawFrame = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    };
    drawFrame();

    // Normalmente sai em WebM no browser; servimos MP4 via Cloudinary (f_mp4).
    const mimeCandidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    if (!mimeType) {
      throw new Error(
        "Seu navegador não suporta gravação de vídeo (MediaRecorder). Use Chrome/Edge.",
      );
    }

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(250);

    const startedAt = performance.now();
    await new Promise<void>((res) => {
      const tick = () => {
        drawFrame();
        const elapsed = performance.now() - startedAt;
        if (elapsed >= durationMs) {
          res();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await new Promise<void>((res) => {
      recorder.onstop = () => res();
      recorder.stop();
    });

    return new Blob(chunks, { type: mimeType });
  }

  function clampInstagramCaption(
    input: string,
    opts?: { maxLen?: number },
  ): string {
    const maxLen = opts?.maxLen ?? 2200;
    const s = (input ?? "").trim();
    if (!s) return "";
    // Normaliza whitespace para economizar caracteres e evitar quebras estranhas.
    const normalized = s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
    if (normalized.length <= maxLen) return normalized;
    const clipped = normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd();
    return clipped ? `${clipped}…` : "";
  }

  useEffect(() => {
    if (!gameData) {
      setGameSummaryData(null);
      return;
    }
    if (!SUMMARY_STYLES.includes(activeStyle) && activeStyle !== "ODDS_LINE")
      return;
    if (gameSummaryData?.eventId === gameData.id) return;
    setGameSummaryLoading(true);
    setGameSummaryData(null);
    fetchGameSummary(gameData.id)
      .then(setGameSummaryData)
      .catch((e) => {
        console.error("[editor-post] Game Summary fetch failed", e);
      })
      .finally(() => setGameSummaryLoading(false));
  }, [gameData?.id, activeStyle, gameSummaryData?.eventId]);

  useEffect(() => {
    if (!gameData || activeStyle !== "GAME_RECAP") return;
    if (recapData?.gameId === gameData.id) return;
    setRecapLoading(true);
    setRecapData(null);
    fetchGameRecap(gameData.id)
      .then(setRecapData)
      .catch(() => setRecapData(null))
      .finally(() => setRecapLoading(false));
  }, [gameData?.id, activeStyle, recapData?.gameId]);

  useEffect(() => {
    if (!gameData || activeStyle !== "PREDICTOR") return;
    if (predictorData?.eventId === gameData.id) return;
    setPredictorLoading(true);
    setPredictorData(null);
    fetchGamePredictor(gameData.id)
      .then(setPredictorData)
      .catch(() => setPredictorData(null))
      .finally(() => setPredictorLoading(false));
  }, [gameData?.id, activeStyle, predictorData?.eventId]);

  // Log: o que veio do endpoint (listagem) para este artigo
  useEffect(() => {
    console.log("[editor-post] PostGenerator artigo recebido:", {
      id: article.dataSourceIdentifier,
      headline: article.headline?.slice(0, 50),
      sourceUrl: article.sourceUrl,
      hasTeam: !!article.team,
      descriptionLength: article.description?.length ?? 0,
    });
  }, [
    article.dataSourceIdentifier,
    article.headline,
    article.sourceUrl,
    article.team,
    article.description,
  ]);

  // Reset to template defaults when style changes
  useEffect(() => {
    switch (activeStyle) {
      case "BREAKING":
        setHeadlineSize(48);
        setHeadlineFont("font-display");
        setHeadlineAlign("left");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("BREAKING");
        setBadgeSize(36);
        setBadgeSkew(-10);
        break;
      case "TRADED":
      case "SPLIT_TRADE":
        setHeadlineSize(40);
        setHeadlineFont("font-display");
        setHeadlineAlign("left");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("TROCADO");
        setBadgeSize(50);
        setBadgeSkew(-5);
        break;
      case "RELEASED":
      case "SPLIT_RELEASE":
      case "CHOP_STYLE":
        setHeadlineSize(80);
        setHeadlineFont("font-display");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("DISPENSADO");
        setBadgeSize(60);
        setBadgeSkew(0);
        break;
      case "QUOTE":
        setHeadlineSize(36);
        setHeadlineFont("font-serif");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(false);
        break;
      case "RUMORS":
        setHeadlineSize(32);
        setHeadlineFont("font-display");
        setHeadlineAlign("left");
        setHeadlineItalic(false);
        setHeadlineUppercase(true);
        setRumorsLabel("RUMORS");
        break;
      case "TOP_HEADLINE":
        setTopHeadlinePrimary("THE RUNNING BACK");
        setTopHeadlineSecondary("WE NEED");
        break;
      case "MINIMAL":
        setHeadlineSize(28);
        setHeadlineFont("font-serif");
        setHeadlineAlign("center");
        setHeadlineItalic(false);
        setHeadlineUppercase(false);
        break;
      case "TICKER":
        setHeadlineSize(36);
        setHeadlineFont("font-mono");
        setHeadlineAlign("left");
        setHeadlineItalic(false);
        setHeadlineUppercase(true);
        setBadgeText("LIVE");
        setBadgeSize(24);
        setBadgeSkew(0);
        break;
      case "HERO":
        setHeadlineSize(56);
        setHeadlineFont("font-display");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("NOW");
        setBadgeSize(28);
        setBadgeSkew(-8);
        break;
      case "CARD":
        setHeadlineSize(28);
        setHeadlineFont("font-serif");
        setHeadlineAlign("left");
        setHeadlineItalic(false);
        setHeadlineUppercase(false);
        setBadgeText("NFL");
        setBadgeSize(20);
        setBadgeSkew(0);
        break;
      case "BANNER":
        setHeadlineSize(42);
        setHeadlineFont("font-display");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("NEWS");
        setBadgeSize(24);
        setBadgeSkew(-6);
        break;
      case "SPOTLIGHT":
        setHeadlineSize(44);
        setHeadlineFont("font-display");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("AGORA");
        setBadgeSize(22);
        setBadgeSkew(0);
        break;
      case "NEON":
        setHeadlineSize(38);
        setHeadlineFont("font-mono");
        setHeadlineAlign("center");
        setHeadlineItalic(false);
        setHeadlineUppercase(true);
        setBadgeText("LIVE");
        setBadgeSize(18);
        setBadgeSkew(-5);
        break;
      case "EDITORIAL":
        setHeadlineSize(32);
        setHeadlineFont("font-serif");
        setHeadlineAlign("left");
        setHeadlineItalic(false);
        setHeadlineUppercase(false);
        setBadgeText("NFL");
        setBadgeSize(14);
        setBadgeSkew(0);
        break;
      case "VINTAGE":
        setHeadlineSize(28);
        setHeadlineFont("font-serif");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(false);
        setBadgeText("EXTRA");
        setBadgeSize(20);
        setBadgeSkew(0);
        break;

      case "WAVE":
        setHeadlineSize(40);
        setHeadlineFont("font-display");
        setHeadlineAlign("center");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
        setBadgeText("AGORA");
        setBadgeSize(24);
        setBadgeSkew(0);
        break;
      default:
        setHeadlineSize(40);
        setHeadlineFont("font-display");
        setHeadlineAlign("left");
        setHeadlineItalic(true);
        setHeadlineUppercase(true);
    }
  }, [activeStyle]);

  const exportPost = async (type: "png" | "jpg") => {
    if (!postRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl =
        type === "png"
          ? await toPng(postRef.current, { quality: 1.0, pixelRatio: 2 })
          : await toJpeg(postRef.current, { quality: 1.0, pixelRatio: 2 });

      const link = document.createElement("a");
      link.download = `nfl-post-${Date.now()}.${type}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const copyCaption = () => {
    const caption = `NFL NEWS\n\n${headline}\n\n${subtext}\n\nConfira os detalhes dessa notícia no nosso site!\n\n#NFL #Football #NFLNews #Touchdown #FootballFans`;
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** Converte URL de imagem em data URL para evitar tainting do canvas (cross-origin). Retorna null se falhar. */
  const fetchImageAsDataUrl = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      fetch(url, { mode: "cors" })
        .then((r) =>
          r.ok ? r.blob() : Promise.reject(new Error(r.statusText)),
        )
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        })
        .catch(() => resolve(null));
    });
  };

  const fetchContentFromEspn = async () => {
    const url = espnUrlInput.trim();
    if (!url) {
      setPublishMessage({
        type: "error",
        text: "Cole a URL da notícia ESPN (ex.: .../id/12345678/...).",
      });
      setTimeout(() => setPublishMessage(null), 4000);
      return;
    }
    setIsFetchingContent(true);
    setPublishMessage(null);
    try {
      console.log("[editor-post] Buscando conteúdo ESPN, URL:", url);
      const result = await fetchEspnArticleContent(url);
      console.log("[editor-post] ESPN conteúdo recebido:", {
        headlineLength: result.headline?.length,
        descriptionLength: result.description?.length,
        contentMarkdownLength: result.contentMarkdown?.length,
      });
      const rawContent = result.contentMarkdown || result.description || "";
      setFullArticleContent(rawContent);
      // Pré-preenche a legenda com o conteúdo bruto da ESPN (usuário pode editar depois).
      if (!captionForInstagram.trim()) {
        setCaptionForInstagram(rawContent);
      }
      setFetchedContentImageUrls(result.imageUrls ?? []);
      setPublishAsCarousel(false);
      setPublishMessage({
        type: "success",
        text: `Conteúdo carregado (${(result.contentMarkdown || result.description).length} caracteres${result.imageUrls?.length ? `, ${result.imageUrls.length} imagem(ns)` : ""}). Use "Reescrever com IA" ou publique como carrossel.`,
      });
      setTimeout(() => setPublishMessage(null), 4000);
    } catch (e) {
      setPublishMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Falha ao buscar conteúdo.",
      });
      setTimeout(() => setPublishMessage(null), 5000);
    } finally {
      setIsFetchingContent(false);
    }
  };

  const generateCaptionWithAI = async () => {
    if (!hasOpenAIKey()) {
      setPublishMessage({
        type: "error",
        text: "Chave OpenAI não encontrada. No .env da raiz use OPENAI_API_KEY= (já usada pela API) ou VITE_OPENAI_API_KEY_STUDIO= e reinicie o Vite.",
      });
      setTimeout(() => setPublishMessage(null), 5000);
      return;
    }
    const content =
      fullArticleContent.trim().length > 0
        ? fullArticleContent
        : subtext || article.description || "";
    if (!content.trim()) {
      setPublishMessage({
        type: "error",
        text: 'Não há conteúdo para reescrever. Use "Buscar conteúdo" ou preencha a descrição.',
      });
      setTimeout(() => setPublishMessage(null), 4000);
      return;
    }
    setIsGeneratingCaption(true);
    setPublishMessage(null);
    try {
      const caption = await rewriteContentAsCaption({
        title: headline || "Sem título",
        content,
        sourceUrl: espnUrlInput.trim() || article.sourceUrl || undefined,
      });
      setCaptionForInstagram(caption);
      setPublishMessage({ type: "success", text: "Legenda gerada com IA." });
      setTimeout(() => setPublishMessage(null), 3000);
      console.log("[editor-post] OpenAI legenda gerada:", {
        length: caption.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar legenda.";
      setPublishMessage({ type: "error", text: msg });
      console.error("[editor-post] OpenAI rewrite caption:", e);
      setTimeout(() => setPublishMessage(null), 5000);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const mirrorCarouselImageToCloudinary = async (
    rawUrl: string,
    index: number,
  ): Promise<string | null> => {
    try {
      console.log(
        "[editor-post] publishToInstagram: espelhando imagem de carrossel na Cloudinary...",
        {
          index,
          rawUrlPreview: rawUrl?.slice(0, 120),
        },
      );
      const response = await fetch(rawUrl);
      if (!response.ok) {
        console.error(
          "[editor-post] publishToInstagram: fetch da imagem de carrossel falhou",
          {
            index,
            status: response.status,
          },
        );
        return null;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const { width, height } = getFeedDimensionsForFormat(activeFormat);
      const resizedDataUrl = await resizeImageDataUrlTo(
        objectUrl,
        width,
        height,
        "image/jpeg",
        0.9,
        "cover",
      );

      URL.revokeObjectURL(objectUrl);

      const uploadedUrl = await uploadImageToCloudinaryWithSizeFallback(
        resizedDataUrl,
        { width, height },
      );
      return uploadedUrl;
    } catch (err) {
      console.error(
        "[editor-post] publishToInstagram: erro ao espelhar imagem de carrossel na Cloudinary",
        {
          index,
          rawUrlPreview: rawUrl?.slice(0, 120),
          error: err instanceof Error ? err.message : String(err),
        },
      );
      return null;
    }
  };

  /**
   * Esconde temporariamente a UI do carrossel (setas/dots) dentro de um node
   * para que não apareça na captura via html-to-image.
   * Retorna uma função de restore para voltar ao estado anterior.
   */
  const hideCarouselUiForCapture = (root: HTMLElement | null) => {
    if (!root) return () => {};
    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-carousel-ui]"),
    );
    const previousStyles = elements.map((el) => el.getAttribute("style"));
    elements.forEach((el) => {
      el.style.opacity = "0";
    });
    return () => {
      elements.forEach((el, idx) => {
        const prev = previousStyles[idx];
        if (prev === null) el.removeAttribute("style");
        else el.setAttribute("style", prev);
      });
    };
  };

  /**
   * Aguarda todas as imagens dentro do node estarem carregadas (complete) e
   * mais alguns frames para o browser pintar. Evita captura preta com html-to-image.
   */
  const waitForNodeImagesReady = (
    node: HTMLElement | null,
    timeoutMs = 8000,
  ): Promise<void> => {
    if (!node) return Promise.resolve();
    const imgs = Array.from(node.querySelectorAll<HTMLImageElement>("img"));
    if (imgs.length === 0) {
      return new Promise<void>((r) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        ),
      );
    }
    const start = Date.now();
    return new Promise<void>((resolve) => {
      const check = () => {
        const allComplete = imgs.every(
          (img) => img.complete && img.naturalWidth > 0,
        );
        if (allComplete) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return;
        }
        if (Date.now() - start > timeoutMs) {
          console.warn(
            "[editor-post] waitForNodeImagesReady: timeout; capturando mesmo assim.",
            {
              total: imgs.length,
              incomplete: imgs.filter((i) => !i.complete).length,
            },
          );
          requestAnimationFrame(() =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };

  /**
   * Prepara o template para captura em modo carrossel:
   * - Garante que o slide do template (índice 0) está ativo para o ref estar ligado;
   * - Converte a primeira imagem remota em data URL (com fallback via proxy CORS);
   * - Garante que o node que será capturado (preview visível em carrossel) tenha imagens carregadas.
   *
   * Importante para evitar canvas tainted / imagem preta no primeiro slide.
   */
  const prepareCarouselTemplateForCapture = async (
    useCarouselNow: boolean,
  ): Promise<void> => {
    const slide0Source =
      replicateHeroImageUrl?.trim() || fetchedContentImageUrls[0] || "";
    console.log("[editor-post] prepareCarouselTemplateForCapture: início", {
      useCarouselNow,
      hasFirstImage: !!fetchedContentImageUrls[0],
      usingEpicOverride: Boolean(replicateHeroImageUrl?.trim()),
      firstImagePreview: slide0Source.slice(0, 200),
    });

    if (!useCarouselNow || !fetchedContentImageUrls[0]) {
      console.log(
        "[editor-post] prepareCarouselTemplateForCapture: não é carrossel ou não há primeira imagem, nada a fazer.",
      );
      return;
    }

    // Garantir que o slide do template (0) está ativo para carouselTemplatePreviewRef estar ligado ao nó correto.
    flushSync(() => setCarouselPreviewIndex(0));
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );

    let dataUrl = await fetchImageAsDataUrl(slide0Source);
    if (!dataUrl) {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(
        slide0Source,
      )}`;
      console.log(
        "[editor-post] prepareCarouselTemplateForCapture: tentativa via proxy CORS",
        { proxyUrlPreview: proxyUrl.slice(0, 200) },
      );
      dataUrl = await fetchImageAsDataUrl(proxyUrl);
      if (dataUrl) {
        console.log(
          "[editor-post] prepareCarouselTemplateForCapture: primeira imagem obtida via proxy CORS.",
          { dataUrlLength: dataUrl.length },
        );
      }
    }

    if (dataUrl) {
      flushSync(() => setCarouselCaptureImageDataUrl(dataUrl));
      console.log(
        "[editor-post] prepareCarouselTemplateForCapture: state atualizado com data URL da primeira imagem.",
        {
          dataUrlLength: dataUrl.length,
          sample: dataUrl.slice(0, 80),
        },
      );
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      // Esperar imagens no NÓ QUE SERÁ CAPTURADO (preview em carrossel), não no postRef oculto.
      const captureNode =
        useCarouselNow && carouselTemplatePreviewRef.current
          ? carouselTemplatePreviewRef.current
          : postRef.current;
      if (captureNode) {
        console.log(
          "[editor-post] prepareCarouselTemplateForCapture: aguardando imagens no nó de captura…",
          {
            useCarouselNow,
            imgCount: captureNode.querySelectorAll("img").length,
          },
        );
        await waitForNodeImagesReady(captureNode);
      }
    } else {
      console.warn(
        "[editor-post] prepareCarouselTemplateForCapture: primeira imagem NÃO pôde ser convertida (CORS?). toJpeg pode gerar preto no template.",
      );
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
    }
  };

  const isCloudinaryFileSizeTooLargeError = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : String(err);
    const s = msg.toLowerCase();
    return (
      s.includes("file size too large") ||
      (s.includes("too large") && s.includes("maximum")) ||
      s.includes("maximum is") ||
      s.includes("exceeds")
    );
  };

  const uploadImageToCloudinaryWithSizeFallback = async (
    dataUrl: string,
    dims: { width: number; height: number },
  ): Promise<string> => {
    try {
      return await uploadImageToCloudinary(dataUrl);
    } catch (err) {
      if (!isCloudinaryFileSizeTooLargeError(err)) throw err;

      console.warn("[editor-post] Cloudinary: arquivo grande; reencodeando.", {
        originalChars: dataUrl?.length ?? 0,
        target: dims,
        error: err instanceof Error ? err.message : String(err),
      });

      // Tenta re-encodar com qualidade mais baixa até passar no limite do Cloudinary.
      const fallbackQualities = [0.82, 0.7];
      let current = dataUrl;
      for (const q of fallbackQualities) {
        current = await resizeImageDataUrlTo(
          current,
          dims.width,
          dims.height,
          "image/jpeg",
          q,
          "cover",
        );
        try {
          return await uploadImageToCloudinary(current);
        } catch (e2) {
          if (!isCloudinaryFileSizeTooLargeError(e2)) throw e2;
        }
      }

      // Se ainda falhar, mantém o erro original.
      throw err;
    }
  };

  const publishToInstagram = async () => {
    console.log("[editor-post] publishToInstagram: início", {
      destination: publishDestination,
      hasPostRef: !!postRef.current,
    });
    if (!postRef.current) {
      console.error("[editor-post] publishToInstagram: postRef.current é null");
      return;
    }
    const config = getInstagramConfig();
    if (!config.accessToken?.trim() || !config.accountId?.trim()) {
      console.warn(
        "[editor-post] publishToInstagram: Instagram não configurado",
        {
          hasToken: !!config.accessToken?.trim(),
          hasAccountId: !!config.accountId?.trim(),
        },
      );
      setPublishMessage({
        type: "error",
        text: "Configure Instagram em Perfil > Instagram.",
      });
      return;
    }
    const useCarousel =
      publishDestination === "feed" &&
      publishAsCarousel &&
      fetchedContentImageUrls.length >= 2 &&
      fetchedContentImageUrls.length <= 10;
    if (!hasCloudinaryConfig()) {
      console.warn(
        "[editor-post] publishToInstagram: Cloudinary não configurada",
      );
      setPublishMessage({
        type: "error",
        text: "Cloudinary não configurada. Defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env.",
      });
      return;
    }
    setIsPublishing(true);
    setPublishMessage(null);
    try {
      const isStories = publishDestination === "stories";
      const isReels = publishDestination === "reels";
      const useCarouselNow =
        publishDestination === "feed" &&
        publishAsCarousel &&
        fetchedContentImageUrls.length >= 2 &&
        fetchedContentImageUrls.length <= 10;
      if (isReels && useCarouselNow) {
        throw new Error("Reels não suporta carrossel. Desmarque a opção.");
      }
      await prepareCarouselTemplateForCapture(useCarouselNow);
      const pixelRatio = isStories || isReels ? 4 : 2;
      console.log("[editor-post] publishToInstagram: gerando JPEG do post...", {
        destination: publishDestination,
        pixelRatio,
        useCarousel: useCarouselNow,
      });
      // Em carrossel, capturar sempre o preview visível (slide 0); nunca o postRef oculto.
      let node: HTMLDivElement | null =
        useCarouselNow && carouselTemplatePreviewRef.current
          ? carouselTemplatePreviewRef.current
          : postRef.current;
      if (useCarouselNow && !carouselTemplatePreviewRef.current) {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        node = carouselTemplatePreviewRef.current ?? postRef.current;
      }
      if (useCarouselNow && node) {
        console.log(
          "[editor-post] publishToInstagram: ajustando classes para captura em carrossel",
          {
            beforeClassName: node.className,
            boundingClientRect: node.getBoundingClientRect(),
          },
        );
        node.classList.remove("opacity-0", "-z-10");
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        const rectAfter = node.getBoundingClientRect();
        const computed = window.getComputedStyle(node);
        console.log(
          "[editor-post] publishToInstagram: após ajuste de classes para captura",
          {
            opacity: computed.opacity,
            zIndex: computed.zIndex,
            display: computed.display,
            visibility: computed.visibility,
            boundingClientRectAfter: rectAfter,
          },
        );
      }
      // Garantir que o node tenha width/height > 0 para evitar JPEG preto
      let restoreStyle: string | null = null;
      const captureRectBefore = node!.getBoundingClientRect();
      console.log(
        "[editor-post] publishToInstagram: boundingClientRect antes do toJpeg",
        captureRectBefore,
      );
      if (captureRectBefore.width < 10 || captureRectBefore.height < 10) {
        const { width, height } = getFeedDimensionsForFormat(activeFormat);
        restoreStyle = node!.getAttribute("style");
        node!.style.width = `${width}px`;
        node!.style.height = `${height}px`;
        console.warn(
          "[editor-post] publishToInstagram: width/height muito pequenos; ajustando tamanho inline para captura.",
          {
            targetWidth: width,
            targetHeight: height,
          },
        );
      }
      const captureRectForToJpeg = node!.getBoundingClientRect();
      console.log(
        "[editor-post] publishToInstagram: boundingClientRect usado no toJpeg",
        captureRectForToJpeg,
      );

      // Garantir que todas as imagens do nó estão pintadas antes do toJpeg (evita preto).
      await waitForNodeImagesReady(node!);

      // Esconde UI do carrossel (setas/dots) só durante a captura
      const restoreCarouselUi = hideCarouselUiForCapture(node!);

      let dataUrl = await toJpeg(node!, {
        quality: 0.92,
        pixelRatio,
      });
      restoreCarouselUi();
      if (restoreStyle !== null) {
        node!.setAttribute("style", restoreStyle);
      } else {
        node!.removeAttribute("style");
      }
      console.log("[editor-post] publishToInstagram: toJpeg concluído", {
        dataUrlLength: dataUrl?.length ?? 0,
        dataUrlSample: dataUrl?.slice(0, 80),
      });
      if (useCarouselNow && node) {
        node.classList.add("opacity-0", "-z-10");
      }
      if (isStories) {
        console.log(
          "[editor-post] publishToInstagram: redimensionando para Stories 1080×1920...",
        );
        dataUrl = await resizeImageDataUrlTo(
          dataUrl,
          INSTAGRAM_STORIES_WIDTH,
          INSTAGRAM_STORIES_HEIGHT,
          "image/jpeg",
          0.92,
          "fit",
        );
      }
      console.log(
        "[editor-post] publishToInstagram: JPEG gerado, tamanho data URL ~",
        dataUrl?.length ?? 0,
        "chars",
      );

      let imageUrl: string | null = null;
      if (!isReels) {
        console.log(
          "[editor-post] publishToInstagram: enviando para Cloudinary (template)...",
        );
        const targetDims = isStories
          ? { width: INSTAGRAM_STORIES_WIDTH, height: INSTAGRAM_STORIES_HEIGHT }
          : getFeedDimensionsForFormat(activeFormat);
        imageUrl = await uploadImageToCloudinaryWithSizeFallback(
          dataUrl,
          targetDims,
        );
        console.log(
          "[editor-post] publishToInstagram: Cloudinary OK, imageUrl:",
          {
            preview: imageUrl?.slice(0, 80) + "...",
          },
        );
      }

      if (useCarousel) {
        if (!imageUrl) {
          throw new Error(
            "Não foi possível gerar a URL do template para o carrossel.",
          );
        }
        const extraOriginalUrls = fetchedContentImageUrls.slice(1, 10);
        const mirroredExtra: string[] = [];
        for (let i = 0; i < extraOriginalUrls.length; i++) {
          const uploadedUrl = await mirrorCarouselImageToCloudinary(
            extraOriginalUrls[i],
            i + 2,
          );
          if (uploadedUrl) {
            mirroredExtra.push(uploadedUrl);
          }
        }
        const carouselImages = [imageUrl, ...mirroredExtra];
        if (carouselImages.length < 2) {
          throw new Error(
            "Carrossel precisa de pelo menos 2 imagens válidas (template + mais 1). Tente buscar o conteúdo novamente ou desmarque a opção de carrossel.",
          );
        }
        console.log(
          "[editor-post] publishToInstagram: publicando carrossel no Feed (primeira imagem com template)...",
          {
            imageCount: carouselImages.length,
            captionLength: (captionForInstagram || headline)?.length,
          },
        );
        await publishCarouselToInstagram({
          imageUrls: carouselImages,
          caption: captionForInstagram || headline,
          accessToken: config.accessToken,
          accountId: config.accountId,
        });
        console.log(
          "[editor-post] publishToInstagram: Carrossel publicado com sucesso",
        );
      } else if (publishDestination === "feed") {
        console.log("[editor-post] publishToInstagram: publicando no Feed...", {
          captionLength: (captionForInstagram || headline)?.length,
        });
        await publishImageToInstagram({
          imageUrl: imageUrl!,
          caption: captionForInstagram || headline,
          accessToken: config.accessToken,
          accountId: config.accountId,
        });
        console.log(
          "[editor-post] publishToInstagram: Feed publicado com sucesso",
        );
      } else if (isReels) {
        const { width, height } = getFeedDimensionsForFormat("4:5");
        console.log(
          "[editor-post] publishToInstagram: criando vídeo (Reels)...",
          {
            width,
            height,
          },
        );
        const videoBlob = await createStillVideoFromImageDataUrl({
          imageDataUrl: dataUrl,
          width,
          height,
          durationMs: 5000,
          fps: 30,
        });

        console.log(
          "[editor-post] publishToInstagram: enviando vídeo para Cloudinary (Reels)...",
          {
            size: videoBlob.size,
            type: videoBlob.type,
          },
        );
        const videoUpload = await uploadVideoToCloudinary(videoBlob, {
          fileName: "reels.webm",
        });

        const mp4Url = (() => {
          const withTransform = videoUpload.secureUrl.replace(
            "/upload/",
            "/upload/f_mp4/",
          );
          if (/\.(webm|ogg|mov|mkv)$/i.test(withTransform)) {
            return withTransform.replace(/\.(webm|ogg|mov|mkv)$/i, ".mp4");
          }
          return withTransform.endsWith(".mp4")
            ? withTransform
            : `${withTransform}.mp4`;
        })();

        console.log("[editor-post] publishToInstagram: publicando Reels...", {
          mp4UrlPreview: mp4Url.slice(0, 120),
          captionLength: clampInstagramCaption(captionForInstagram || headline)
            .length,
        });
        await publishReelToInstagram({
          videoUrl: mp4Url,
          caption: clampInstagramCaption(captionForInstagram || headline),
          accessToken: config.accessToken,
          accountId: config.accountId,
          shareToFeed: true,
        });
        console.log(
          "[editor-post] publishToInstagram: Reels publicado com sucesso",
        );
      } else {
        console.log(
          "[editor-post] publishToInstagram: publicando em Stories...",
        );
        await publishStoryImageToInstagram({
          imageUrl: imageUrl!,
          accessToken: config.accessToken,
          accountId: config.accountId,
        });
        console.log(
          "[editor-post] publishToInstagram: Story publicado com sucesso",
        );
      }
      setPublishMessage({
        type: "success",
        text: useCarousel
          ? "Carrossel publicado no Feed!"
          : publishDestination === "feed"
            ? "Post publicado no Feed!"
            : isReels
              ? "Reels publicado!"
              : "Story publicado!",
      });
      setTimeout(() => setPublishMessage(null), 5000);
      setTimeout(() => window.location.reload(), 2500);
      const marked = await markArticleInstagramPublished(
        article.dataSourceIdentifier,
      );
      if (!marked) {
        console.warn(
          "[editor-post] Não foi possível marcar o artigo como publicado no Instagram no Supabase. A notícia sairá da listagem após aplicar a migration 005 e recarregar.",
        );
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("[editor-post] publishToInstagram: erro", {
        message: err.message,
        name: err.name,
        stack: err.stack,
        cause: err.cause,
      });
      setPublishMessage({
        type: "error",
        text: err.message || "Erro ao publicar no Instagram.",
      });
      setTimeout(() => setPublishMessage(null), 5000);
    } finally {
      setCarouselCaptureImageDataUrl(null);
      setIsPublishing(false);
    }
  };

  /**
   * Botão de debug: executa apenas a parte de captura do template (toJpeg)
   * e upload para a Cloudinary, sem publicar no Instagram.
   *
   * Mostra o resultado tanto em data URL (preview local) quanto a URL gerada
   * na Cloudinary, para investigar o bug da primeira imagem preta no carrossel.
   */
  const debugCaptureCarouselTemplate = async () => {
    console.log("[editor-post][DEBUG] debugCaptureCarouselTemplate: início", {
      destination: publishDestination,
      publishAsCarousel,
      fetchedImagesCount: fetchedContentImageUrls.length,
      hasPostRef: !!postRef.current,
      hasCloudinary: hasCloudinaryConfig(),
    });

    if (!hasCloudinaryConfig()) {
      console.warn(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: Cloudinary não configurada.",
      );
      return;
    }

    const useCarouselNow =
      publishDestination === "feed" &&
      publishAsCarousel &&
      fetchedContentImageUrls.length >= 2 &&
      fetchedContentImageUrls.length <= 10;

    await prepareCarouselTemplateForCapture(useCarouselNow);

    let node: HTMLDivElement | null =
      useCarouselNow && carouselTemplatePreviewRef.current
        ? carouselTemplatePreviewRef.current
        : postRef.current;
    if (useCarouselNow && !carouselTemplatePreviewRef.current) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      node = carouselTemplatePreviewRef.current ?? postRef.current;
    }
    if (!node) {
      console.error(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: node (postRef.current) sumiu antes do toJpeg.",
      );
      return;
    }

    if (useCarouselNow) {
      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: ajustando classes (removendo opacity-0 / -z-10) para captura.",
        { beforeClassName: node.className },
      );
      node.classList.remove("opacity-0", "-z-10");
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }

    try {
      const pixelRatio = publishDestination === "stories" ? 4 : 2;
      const captureRectBefore = node.getBoundingClientRect();
      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: boundingClientRect antes do toJpeg",
        captureRectBefore,
      );
      let restoreStyle: string | null = null;
      if (captureRectBefore.width < 10 || captureRectBefore.height < 10) {
        const { width, height } = getFeedDimensionsForFormat(activeFormat);
        restoreStyle = node.getAttribute("style");
        node.style.width = `${width}px`;
        node.style.height = `${height}px`;
        console.warn(
          "[editor-post][DEBUG] debugCaptureCarouselTemplate: width/height muito pequenos; ajustando tamanho inline para captura.",
          {
            targetWidth: width,
            targetHeight: height,
          },
        );
      }
      const captureRectForToJpeg = node.getBoundingClientRect();
      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: boundingClientRect usado no toJpeg",
        captureRectForToJpeg,
      );

      // Garantir que todas as imagens do nó estão pintadas antes do toJpeg (evita preto).
      await waitForNodeImagesReady(node);

      const restoreCarouselUi = hideCarouselUiForCapture(node);

      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: chamando toJpeg…",
        { pixelRatio, useCarouselNow },
      );
      const dataUrl = await toJpeg(node, {
        quality: 0.92,
        pixelRatio,
      });
      restoreCarouselUi();
      if (restoreStyle !== null) {
        node.setAttribute("style", restoreStyle);
      } else {
        node.removeAttribute("style");
      }
      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: toJpeg OK.",
        {
          dataUrlLength: dataUrl?.length ?? 0,
          dataUrlSample: dataUrl?.slice(0, 80),
        },
      );
      setDebugTemplateDataUrl(dataUrl);

      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: enviando data URL para Cloudinary (SOMENTE DEBUG, sem publicar no Instagram)…",
      );
      const targetDims =
        publishDestination === "stories"
          ? { width: INSTAGRAM_STORIES_WIDTH, height: INSTAGRAM_STORIES_HEIGHT }
          : getFeedDimensionsForFormat(activeFormat);
      const imageUrl = await uploadImageToCloudinaryWithSizeFallback(
        dataUrl,
        targetDims,
      );
      console.log(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: Cloudinary OK (DEBUG).",
        { imageUrlPreview: imageUrl?.slice(0, 200) },
      );
      setDebugTemplateImageUrl(imageUrl);
      setPublishMessage({
        type: "success",
        text: "Debug: captura do template enviada para a Cloudinary (sem publicar no Instagram). Veja o console e o preview.",
      });
      setTimeout(() => setPublishMessage(null), 6000);
    } catch (err) {
      console.error(
        "[editor-post][DEBUG] debugCaptureCarouselTemplate: erro na captura ou upload de debug.",
        err,
      );
      setPublishMessage({
        type: "error",
        text: "Debug: erro ao capturar template / enviar para a Cloudinary. Veja o console.",
      });
      setTimeout(() => setPublishMessage(null), 6000);
    }
    // Não reaplicar opacity-0 após o debug: mantém o preview visível para o usuário.
  };

  const replicateAspectForFormat = (f: PostFormat): ReplicateAspectRatio => {
    if (f === "1:1") return "1:1";
    if (f === "4:5") return "4:5";
    return "9:16";
  };

  const resolveSourceImageForEpic = (opts?: {
    preferOriginal?: boolean;
  }): string => {
    const preferOriginal = opts?.preferOriginal ?? false;
    if (preferOriginal) {
      const original =
        article.images?.[0]?.url?.trim() ||
        fetchedContentImageUrls[0]?.trim() ||
        "";
      if (original && !original.includes("picsum.photos")) return original;
    }
    const fromPreview =
      carouselCaptureImageDataUrl?.trim() ||
      replicateHeroImageUrl?.trim() ||
      (publishAsCarousel && fetchedContentImageUrls.length >= 2
        ? fetchedContentImageUrls[0]?.trim()
        : article.images?.[0]?.url?.trim() ||
          fetchedContentImageUrls[0]?.trim()) ||
      "";
    return fromPreview;
  };

  const resolveContentForEpic = (): string =>
    fullArticleContent.trim() || subtext || article.description || headline;

  const generateEpicHeroImage = async () => {
    if (!hasReplicateToken()) {
      setPublishMessage({
        type: "error",
        text: "Defina VITE_REPLICATE_API_TOKEN_STUDIO (ou VITE_REPLICATE_API_TOKEN) no .env e reinicie o Vite.",
      });
      setTimeout(() => setPublishMessage(null), 6000);
      return;
    }
    // Usa a mesma lógica de imagem exibida no preview.
    const source = resolveSourceImageForEpic();

    const isProbablyPlaceholder =
      source.startsWith("http") && source.includes("picsum.photos");

    if (!source || isProbablyPlaceholder) {
      setPublishMessage({
        type: "error",
        text: "Precisa de uma imagem real para basear a geração (foto do artigo ou primeira imagem após Buscar conteúdo ESPN).",
      });
      setTimeout(() => setPublishMessage(null), 6000);
      return;
    }
    const contentForPrompt = resolveContentForEpic();
    setIsGeneratingEpicImage(true);
    setPublishMessage(null);
    try {
      const { outputUrl, category } = await generateEpicNewsImageWithReplicate({
        sourceImageUrl: source,
        headline,
        content: contentForPrompt,
        aspectRatio: replicateAspectForFormat(activeFormat),
        resolution: "1K",
      });
      setReplicateHeroImageUrl(outputUrl);
      setEpicImageCategory(category);
      setPublishMessage({
        type: "success",
        text: `Imagem épica gerada (Replicate · ${category}).`,
      });
      setTimeout(() => setPublishMessage(null), 5000);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Falha ao gerar imagem no Replicate.";
      setPublishMessage({ type: "error", text: msg });
      setTimeout(() => setPublishMessage(null), 8000);
      console.error("[editor-post] Replicate epic image:", e);
    } finally {
      setIsGeneratingEpicImage(false);
    }
  };

  const generateEpicImageVariations = async (count = 3) => {
    if (!hasReplicateToken()) {
      setPublishMessage({
        type: "error",
        text: "Defina VITE_REPLICATE_API_TOKEN_STUDIO (ou VITE_REPLICATE_API_TOKEN) no .env e reinicie o Vite.",
      });
      setTimeout(() => setPublishMessage(null), 6000);
      return;
    }

    // Para variações, prioriza a imagem original da notícia.
    const baseSource = resolveSourceImageForEpic({ preferOriginal: true });
    const isProbablyPlaceholder =
      baseSource.startsWith("http") && baseSource.includes("picsum.photos");
    if (!baseSource || isProbablyPlaceholder) {
      setPublishMessage({
        type: "error",
        text: "Não encontrei imagem base válida para gerar variações.",
      });
      setTimeout(() => setPublishMessage(null), 6000);
      return;
    }

    const contentForPrompt = resolveContentForEpic();
    const generatedUrls: string[] = [];
    let categoryDetected: NewsVisualCategory | null = null;
    setIsGeneratingEpicVariations(true);
    setPublishMessage(null);

    try {
      for (let i = 0; i < count; i++) {
        setPublishMessage({
          type: "success",
          text: `Gerando variação ${i + 1}/${count} no Replicate...`,
        });
        const { outputUrl, category } =
          await generateEpicNewsImageWithReplicate({
            sourceImageUrl: baseSource,
            headline,
            content: `${contentForPrompt}\n\nVariação visual ${i + 1}: altere composição, luz e ângulo, mantendo identidade real do atleta.`,
            aspectRatio: replicateAspectForFormat(activeFormat),
            resolution: "1K",
          });
        categoryDetected = category;
        generatedUrls.push(outputUrl);
      }

      const uniqueGenerated = Array.from(new Set(generatedUrls));
      setEpicVariationUrls(uniqueGenerated);
      if (categoryDetected) setEpicImageCategory(categoryDetected);
      if (uniqueGenerated[0]) {
        setReplicateHeroImageUrl(uniqueGenerated[0]);
      }

      // Monta carrossel: base + variações (máx 10 imagens).
      const carouselPool = Array.from(
        new Set([baseSource, ...uniqueGenerated]),
      ).slice(0, 10);
      if (carouselPool.length >= 2) {
        setFetchedContentImageUrls(carouselPool);
        setPublishAsCarousel(true);
        setCarouselPreviewIndex(0);
      }

      setPublishMessage({
        type: "success",
        text:
          carouselPool.length >= 2
            ? `Pronto! ${uniqueGenerated.length} variações geradas e carrossel montado.`
            : `${uniqueGenerated.length} variações geradas.`,
      });
      setTimeout(() => setPublishMessage(null), 7000);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Falha ao gerar variações no Replicate.";
      setPublishMessage({ type: "error", text: msg });
      setTimeout(() => setPublishMessage(null), 8000);
      console.error("[editor-post] Replicate epic variations:", e);
    } finally {
      setIsGeneratingEpicVariations(false);
    }
  };

  const renderTemplate = () => {
    // No carrossel: primeira imagem do ESPN no template; se temos data URL (captura), usamos para não taintar o canvas.
    const imageUrl = carouselCaptureImageDataUrl
      ? carouselCaptureImageDataUrl
      : replicateHeroImageUrl
        ? replicateHeroImageUrl
        : publishAsCarousel && fetchedContentImageUrls.length >= 2
          ? fetchedContentImageUrls[0]
          : article.images?.[0]?.url ||
            fetchedContentImageUrls[0] ||
            "https://picsum.photos/seed/nfl/800/800";
    const team = teamBrand;
    const contractingTeam = selectedTeamForLogo;

    const headlineStyles = {
      fontSize: `${headlineSize}px`,
      textAlign: headlineAlign,
      fontStyle: headlineItalic ? "italic" : "normal",
      textTransform: headlineUppercase
        ? "uppercase"
        : ("none" as React.CSSProperties["textTransform"]),
      letterSpacing:
        headlineLetterSpacing !== 0 ? `${headlineLetterSpacing}px` : "normal",
      wordSpacing:
        headlineWordSpacing !== 0 ? `${headlineWordSpacing}px` : "normal",
    };

    const subtextStyles = {
      fontSize: `${subtextSize}px`,
    };

    const badgeStyles = {
      fontSize: `${badgeSize}px`,
      transform: `skewX(${badgeSkew}deg)`,
    };

    const marginPx = textMargin;
    const logoPx = (base: number) => Math.round((base * teamLogoScale) / 100);

    switch (activeStyle) {
      case "BREAKING":
        return (
          <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover opacity-80",
                  imagePositionClass,
                )}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>
            <div
              className="relative mt-auto flex flex-col gap-2"
              style={{ padding: `${marginPx}px` }}
            >
              <div
                className="font-black px-4 py-1 w-fit mb-4"
                style={{
                  ...badgeStyles,
                  backgroundColor: team.secondary,
                  color: team.primary,
                }}
              >
                {badgeText}
              </div>
              <h2
                className={cn(
                  "text-white font-black leading-tight tracking-tighter",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <div
                className="h-1 w-24 mt-4"
                style={{ backgroundColor: team.primary }}
              />
            </div>
            <div
              className="absolute right-0 top-0"
              style={{ top: `${marginPx}px`, right: `${marginPx}px` }}
            >
              <TeamBranding
                team={team}
                style={{ width: logoPx(48), height: logoPx(48) }}
                initialsSize="xs"
              />
            </div>
          </div>
        );
      case "TRADED":
        return (
          <div
            className="relative w-full h-full overflow-hidden flex"
            style={{ backgroundColor: (contractingTeam ?? team).primary }}
          >
            <div className="w-1/2 h-full relative">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, transparent, ${(contractingTeam ?? team).primary})`,
                }}
              />
              {contractingTeam && (
                <div className="absolute top-4 left-4">
                  <TeamBranding
                    team={team}
                    style={{ width: logoPx(48), height: logoPx(48) }}
                    initialsSize="xs"
                  />
                </div>
              )}
            </div>
            <div
              className="w-1/2 h-full flex flex-col justify-center relative"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <div className="text-8xl font-black text-white rotate-90 origin-top-right">
                  TRADED
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-white/60 font-bold uppercase tracking-widest text-xs mb-2">
                  {(contractingTeam ?? team).name}
                </div>
                <div className="text-white font-black text-4xl uppercase mb-6">
                  NEWS
                </div>
                <div className="mb-8 flex items-center justify-center gap-3">
                  {contractingTeam ? (
                    <>
                      <TeamBranding
                        team={team}
                        style={{ width: logoPx(48), height: logoPx(48) }}
                        initialsSize="xs"
                      />
                      <span className="text-white/50 text-xl">â†’</span>
                      <TeamBranding
                        team={contractingTeam}
                        style={{ width: logoPx(64), height: logoPx(64) }}
                      />
                    </>
                  ) : (
                    <TeamBranding
                      team={team}
                      style={{ width: logoPx(64), height: logoPx(64) }}
                    />
                  )}
                </div>
                {/* <div
                  className="p-4 font-black uppercase text-center"
                  style={{
                    ...badgeStyles,
                    backgroundColor: (contractingTeam ?? team).secondary,
                    color: (contractingTeam ?? team).primary,
                  }}
                >
                  {badgeText}
                </div> */}
                <div
                  className={cn(
                    "mt-4 text-white font-bold tracking-tighter",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </div>
              </div>
            </div>
          </div>
        );
      case "TRADED_CARD": {
        // Para este template, usamos o subtext como
        // "Nome do jogador, Posição" e quebramos em duas partes.
        const [playerNameRaw, ...playerRest] = (subtext || "").split(",");
        const playerName = playerNameRaw?.trim();
        const playerPosition = playerRest.join(",").trim();

        return (
          <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
            {/* Foto ocupando o topo */}
            <div className="relative flex-1 min-h-0">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            </div>
            {/* Faixa com logos e setas */}
            <div className="relative z-10 bg-black flex items-center justify-center gap-4 py-3">
              <TeamBranding
                team={team}
                style={{ width: logoPx(40), height: logoPx(40) }}
                initialsSize="xs"
              />
              <span className="flex-shrink-0 text-white/80">
                {/* Chevron/seta estilizada entre os times */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.5 6.5L18.2 12L12.5 17.5"
                    stroke="currentColor"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.55"
                  />
                </svg>
              </span>
              <TeamBranding
                team={contractingTeam ?? team}
                style={{ width: logoPx(40), height: logoPx(40) }}
                initialsSize="xs"
              />
            </div>
            {/* Bloco inferior com TROCADO + nome/posição */}
            <div className="relative z-10 bg-black flex flex-col items-center justify-center px-6 py-6">
              {/* Badge pequeno controlado por badgeSize / badgeSkew */}
              <div
                className="px-3 py-1 rounded-sm mb-3 inline-flex items-center justify-center"
                style={{
                  ...badgeStyles,
                  backgroundColor: "#D50A0A",
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  fontWeight: 900,
                  fontSize: `${badgeSize}px`,
                }}
              >
                {badgeText || "TROCADO"}
              </div>
              {/* Título principal (TROCADO) controlado por Tipografia */}

              {(playerName || playerPosition) && (
                <p
                  className="mt-3 font-bold uppercase text-white/80 text-center"
                  style={subtextStyles}
                >
                  <span className="tracking-[0.25em]">
                    {(playerName || "").toUpperCase()}
                  </span>
                  {playerPosition && (
                    <span className="text-white/70">
                      {playerName ? ", " : ""}
                      {playerPosition.toUpperCase()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        );
      }
      case "RELEASED":
        return (
          <div className="relative w-full h-full bg-black overflow-hidden">
            <img
              src={imageUrl}
              alt=""
              className={cn("w-full h-full object-cover", imagePositionClass)}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div
                className={cn(
                  "mb-6 flex items-center justify-center gap-4",
                  contractingTeam && "gap-6",
                )}
              >
                <TeamBranding
                  team={team}
                  style={{
                    width: logoPx(contractingTeam ? 80 : 96),
                    height: logoPx(contractingTeam ? 80 : 96),
                  }}
                  initialsSize="md"
                />
                {contractingTeam && (
                  <>
                    <div
                      className="relative flex shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      <div className="absolute -inset-1" />
                      <div className="relative flex items-center justify-center ">
                        <span className="inline-flex text-white stroke-[1.5] ">
                          <AiOutlineArrowRight size={44} />
                        </span>
                      </div>
                    </div>
                    <TeamBranding
                      team={contractingTeam}
                      style={{ width: logoPx(80), height: logoPx(80) }}
                      initialsSize="md"
                    />
                  </>
                )}
              </div>
              <h2
                className={cn(
                  "text-white font-black tracking-tighter leading-[0.8] mb-4 drop-shadow-2xl",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {badgeText}
              </h2>
              <div className="bg-white/10 backdrop-blur-sm px-6 py-2 border-y border-white/20">
                <p
                  className="text-white font-bold uppercase tracking-widest"
                  style={subtextStyles}
                >
                  {headline}
                </p>
              </div>
            </div>
          </div>
        );
      case "RUMORS":
        return (
          <div className="relative w-full h-full bg-white overflow-hidden flex">
            <div
              className="w-20 h-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: team.primary }}
            >
              <div className="rotate-[-90deg] whitespace-nowrap text-white font-black text-6xl uppercase tracking-tighter">
                {rumorsLabel}
              </div>
            </div>
            <div className="flex-1 min-w-0 h-full relative flex flex-col">
              {/* Imagem em ~40% do alto para deixar mais espaço à div branca */}
              <div className="h-[40%] min-h-[100px] shrink-0 relative">
                <img
                  src={imageUrl}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover",
                    imagePositionClass,
                  )}
                  referrerPolicy="no-referrer"
                  style={imageObjectPositionStyle}
                />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
              </div>
              {/* Div branca mais para cima: comporta título + descrição inteira */}
              <div
                className="flex-1 min-h-0 flex flex-col justify-start bg-white overflow-visible"
                style={{ padding: `${marginPx}px` }}
              >
                <div className="w-12 h-1 bg-black mb-3 shrink-0" />
                <h3
                  className={cn(
                    "text-black font-black leading-tight mb-2 shrink-0",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h3>
                <p
                  className="text-black/60 font-medium break-words"
                  style={subtextStyles}
                >
                  {subtext}
                </p>
              </div>
            </div>
          </div>
        );
      case "QUOTE":
        return (
          <div
            className="relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center text-center"
            style={{ padding: `${marginPx}px` }}
          >
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover opacity-30 blur-sm",
                  imagePositionClass,
                )}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
            <div className="relative z-10">
              <div className="text-white/20 text-9xl font-serif absolute -top-12 -left-8">
                "
              </div>
              <h2
                className={cn(
                  "text-white font-black leading-tight mb-8 relative z-10",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <div className="flex items-center justify-center gap-4">
                <div className="h-[1px] w-12 bg-white/30" />
                <span className="text-white font-bold uppercase tracking-widest text-sm">
                  {team.name.toUpperCase()} INSIDER
                </span>
                <div className="h-[1px] w-12 bg-white/30" />
              </div>
            </div>
          </div>
        );
      case "SPLIT_TRADE":
        return (
          <div
            className="relative w-full h-full overflow-hidden flex"
            style={{ backgroundColor: (contractingTeam ?? team).primary }}
          >
            <div className="w-[45%] h-full relative">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, transparent, ${(contractingTeam ?? team).primary})`,
                }}
              />
              {contractingTeam && (
                <div className="absolute top-4 left-4">
                  <TeamBranding
                    team={team}
                    style={{ width: logoPx(56), height: logoPx(56) }}
                    initialsSize="xs"
                  />
                </div>
              )}
            </div>
            <div
              className="flex-1 h-full relative flex flex-col"
              style={{
                backgroundColor: (contractingTeam ?? team).primary,
                padding: `${marginPx}px`,
              }}
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="border-l-4 border-white pl-4 mb-8">
                  <div className="text-white/60 font-bold uppercase text-xs tracking-widest">
                    {(contractingTeam ?? team).name}
                  </div>
                  <div className="text-white font-black text-4xl uppercase tracking-tighter">
                    {(contractingTeam ?? team).initials}
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center gap-4">
                  {contractingTeam ? (
                    <>
                      <TeamBranding
                        team={team}
                        style={{ width: logoPx(80), height: logoPx(80) }}
                        variant="rounded"
                        initialsSize="lg"
                      />
                      <span className="text-white/50 text-2xl">â†’</span>
                      <TeamBranding
                        team={contractingTeam}
                        style={{ width: logoPx(128), height: logoPx(128) }}
                        variant="rounded"
                        initialsSize="xl"
                      />
                    </>
                  ) : (
                    <TeamBranding
                      team={team}
                      style={{ width: logoPx(128), height: logoPx(128) }}
                      variant="rounded"
                      initialsSize="xl"
                    />
                  )}
                </div>
                <div className="mt-auto">
                  <div className="flex items-center gap-2 mb-2">
                    {/* <div
                      className="text-black font-black text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: team.secondary }}
                    >
                      DE
                    </div> */}
                    <div
                      className={cn(
                        "text-white font-black uppercase tracking-tighter leading-none",
                        headlineFont,
                      )}
                      style={headlineStyles}
                    >
                      {headline}
                    </div>
                  </div>
                  {/* <div
                    className="p-2 font-black uppercase text-center tracking-tighter leading-none"
                    style={{
                      ...badgeStyles,
                      backgroundColor: (contractingTeam ?? team).secondary,
                      color: (contractingTeam ?? team).primary,
                    }}
                  >
                    {badgeText}
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        );
      case "SPLIT_RELEASE":
        return (
          <div
            className="relative w-full h-full overflow-hidden flex"
            style={{ backgroundColor: (contractingTeam ?? team).primary }}
          >
            <div className="w-1/2 h-full relative">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, transparent, ${(contractingTeam ?? team).primary})`,
                }}
              />
              {contractingTeam && (
                <div className="absolute top-4 left-4">
                  <TeamBranding
                    team={team}
                    style={{ width: logoPx(56), height: logoPx(56) }}
                    initialsSize="xs"
                  />
                </div>
              )}
            </div>
            <div
              className="w-1/2 h-full flex flex-col relative"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="border-l-4 border-white pl-4 mb-0">
                <div className="text-white/60 font-bold uppercase text-xs tracking-widest">
                  {(contractingTeam ?? team).name}
                </div>
                <div className="text-white font-black text-4xl uppercase tracking-tighter">
                  {(contractingTeam ?? team).initials}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center gap-4">
                {contractingTeam ? (
                  <>
                    <TeamBranding
                      team={team}
                      style={{ width: logoPx(96), height: logoPx(96) }}
                      initialsSize="md"
                    />
                    <span className="text-white/50 text-2xl">â†’</span>
                    <TeamBranding
                      team={contractingTeam}
                      style={{ width: logoPx(160), height: logoPx(160) }}
                      initialsSize="lg"
                    />
                  </>
                ) : (
                  <TeamBranding
                    team={team}
                    style={{ width: logoPx(160), height: logoPx(160) }}
                    initialsSize="lg"
                  />
                )}
              </div>
              <div className="mt-auto">
                <div className="flex items-center gap-3 mb-4">
                  {/* <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs"
                    style={{
                      backgroundColor: team.secondary,
                      color: team.primary,
                    }}
                  >
                    QB
                  </div> */}
                  <div
                    className={cn(
                      "text-white font-black uppercase leading-none tracking-tighter",
                      headlineFont,
                    )}
                    style={headlineStyles}
                  >
                    {headline}
                  </div>
                </div>
                <div
                  className="p-4 font-black uppercase text-center tracking-tighter"
                  style={{
                    ...badgeStyles,
                    backgroundColor: (contractingTeam ?? team).secondary,
                    color: (contractingTeam ?? team).primary,
                  }}
                >
                  {badgeText}
                </div>
              </div>
            </div>
          </div>
        );
      case "BIG_BOTTOM":
        return (
          <div className="relative w-full h-full bg-black overflow-hidden">
            <img
              src={imageUrl}
              alt=""
              className={cn("w-full h-full object-cover", imagePositionClass)}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ padding: `${marginPx}px` }}
            >
              <h2
                className={cn(
                  "text-white font-black uppercase leading-[0.85] tracking-tighter drop-shadow-2xl",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <div
                className="h-2 w-full mt-4"
                style={{
                  background: `linear-gradient(to right, ${team.primary}, ${team.secondary}, ${team.primary})`,
                }}
              />
            </div>
            <div className="absolute top-8 right-8">
              <div className="flex items-center justify-center">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(48), height: logoPx(48) }}
                  initialsSize="xs"
                />
              </div>
            </div>
          </div>
        );
      case "TOP_HEADLINE":
        return (
          <div className="relative w-full h-full bg-[#111] overflow-hidden flex flex-col">
            <div className="bg-black" style={{ padding: `${marginPx}px` }}>
              <h2 className="text-white font-black text-4xl uppercase italic leading-none tracking-tighter text-center">
                {topHeadlinePrimary}
                <br />{" "}
                <span className="text-6xl" style={{ color: team.secondary }}>
                  {topHeadlineSecondary}
                </span>
              </h2>
            </div>
            <div className="flex-1 relative">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute top-8 left-8">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(96), height: logoPx(96) }}
                  variant="rounded"
                  initialsSize="lg"
                />
              </div>
              <div className="absolute bottom-12 left-12">
                <ArrowUp
                  className="w-24 h-24 drop-shadow-2xl"
                  style={{ color: team.primary }}
                  strokeWidth={4}
                />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm flex justify-between items-center">
              <span className="text-white/60 font-black text-[10px] uppercase tracking-[0.3em]">
                {team.name.toUpperCase()}
              </span>
              {/* <div className="text-white font-black text-4xl italic">9</div> */}
            </div>
          </div>
        );
      case "CHOP_STYLE":
        return (
          <div
            className="relative w-full h-full overflow-hidden"
            style={{ backgroundColor: team.primary }}
          >
            <div className="absolute inset-0 opacity-80">
              <img
                src={imageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover mix-blend-overlay",
                  imagePositionClass,
                )}
                referrerPolicy="no-referrer"
              />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent, ${team.primary})`,
              }}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div
                className="rounded-3xl flex items-center justify-center mb-6 shadow-2xl rotate-3 overflow-hidden"
                style={{
                  // backgroundColor: team.secondary,
                  width: logoPx(106),
                  height: logoPx(106),
                }}
              >
                {!hideTeamLogo && team.logo ? (
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  !hideTeamLogo && (
                    <span
                      className="font-black text-4xl uppercase tracking-tighter text-white"
                      style={{ color: team.primary }}
                    >
                      {team.initials}
                    </span>
                  )
                )}
              </div>
              {releasedPlayerName.trim() && (
                <div
                  className={cn(
                    "text-white tracking-tight text-center mb-1 drop-shadow-lg",
                    headlineFont,
                  )}
                  style={{ fontSize: "clamp(18px, 4vw, 28px)" }}
                >
                  {releasedPlayerName.trim()}
                </div>
              )}
              <h2
                className={cn(
                  "text-white font-black uppercase tracking-tighter leading-[0.7] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] mb-8",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {badgeText}
              </h2>
              <div className="w-full h-1 bg-white/30 mb-4" />
              <div className="text-white font-black text-xs uppercase tracking-[0.5em] opacity-60">
                {team.name.toUpperCase()}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-black/20 flex items-center justify-center gap-4">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="text-white/20 font-black text-[8px] uppercase"
                >
                  {team.name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        );
      case "MINIMAL":
        return (
          <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 pt-6 pr-6 opacity-90">
              <TeamBranding
                team={team}
                style={{ width: logoPx(40), height: logoPx(40) }}
                initialsSize="xs"
              />
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center text-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div
                className="w-16 h-px mb-6 opacity-30"
                style={{ backgroundColor: team.primary }}
              />
              <h2
                className={cn(
                  "text-black font-medium leading-snug text-balance",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              {subtext && (
                <p
                  className="mt-4 text-black/50 font-normal max-w-md"
                  style={subtextStyles}
                >
                  {subtext}
                </p>
              )}
              <div
                className="w-16 h-px mt-6 opacity-30"
                style={{ backgroundColor: team.primary }}
              />
            </div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 pb-4"
              style={{ paddingLeft: marginPx, paddingRight: marginPx }}
            >
              {team.name}
            </div>
          </div>
        );
      case "TICKER":
        return (
          <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
            <div
              className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/20"
              style={{
                backgroundColor: team.primary,
              }}
            >
              <span
                className="font-black text-white uppercase text-xs tracking-widest px-2 py-1 rounded"
                style={{
                  ...badgeStyles,
                  backgroundColor: team.secondary,
                  color: team.primary,
                }}
              >
                {badgeText}
              </span>
              <span className="text-white/80 font-mono text-[10px] uppercase tracking-wider">
                {team.name}
              </span>
            </div>
            <div className="flex-1 relative min-h-0">
              <img
                src={imageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover opacity-90",
                  imagePositionClass,
                )}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
            </div>
            <div
              className="shrink-0 border-t border-white/20"
              style={{
                padding: `${marginPx}px`,
                backgroundColor: "rgba(0,0,0,0.85)",
              }}
            >
              <h2
                className={cn(
                  "text-white font-bold leading-tight",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <div
                className="mt-2 h-0.5 w-12 rounded-full opacity-80"
                style={{ backgroundColor: team.secondary }}
              />
            </div>
          </div>
        );
      case "HERO":
        return (
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={imageUrl}
              alt=""
              className={cn("w-full h-full object-cover", imagePositionClass)}
              referrerPolicy="no-referrer"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${team.primary}99 0%, transparent 20%, black 100%)`,
              }}
            />
            <div className="absolute top-0 left-0 right-0 flex justify-between items-start pt-4 px-4">
              <div
                className="font-black px-3 py-1.5 rounded-r-lg shadow-lg"
                style={{
                  ...badgeStyles,
                  backgroundColor: team.secondary,
                  color: team.primary,
                }}
              >
                {badgeText}
              </div>
              <TeamBranding
                team={team}
                style={{ width: logoPx(56), height: logoPx(56) }}
                initialsSize="xs"
              />
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end text-center"
              style={{
                padding: `${marginPx}px`,
                paddingBottom: marginPx + 24,
              }}
            >
              <h2
                className={cn(
                  "text-white font-black leading-[0.9] tracking-tighter",
                  headlineFont,
                )}
                style={{
                  ...headlineStyles,
                  textShadow:
                    "0 1px 2px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.92), 0 4px 28px rgba(0,0,0,0.88), 0 0 48px rgba(0,0,0,0.55)",
                }}
              >
                {headline}
              </h2>
              <div
                className="mt-4 h-1 w-24 rounded-full"
                style={{ backgroundColor: team.secondary }}
              />
              <p
                className="text-white/70 text-xs font-bold uppercase tracking-widest mt-3"
                style={{
                  textShadow:
                    "0 1px 3px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.75)",
                }}
              >
                {team.name}
              </p>
            </div>
          </div>
        );
      case "CARD":
        return (
          <div className="relative w-full h-full bg-white overflow-hidden flex flex-col shadow-inner">
            <div className="relative h-[45%] min-h-[120px] shrink-0">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: team.primary }}
              />
              <div className="absolute top-3 left-3">
                <span
                  className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
                  style={{ backgroundColor: team.primary }}
                >
                  {badgeText}
                </span>
              </div>
              <div className="absolute bottom-3 right-3">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(36), height: logoPx(36) }}
                  initialsSize="xs"
                />
              </div>
            </div>
            <div
              className="flex-1 flex flex-col justify-center min-h-0"
              style={{ padding: `${marginPx}px` }}
            >
              <h2
                className={cn(
                  "text-black font-bold leading-snug",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              {subtext && (
                <p
                  className="mt-2 text-black/60 text-sm flex-1"
                  style={subtextStyles}
                >
                  {subtext}
                </p>
              )}
              <div
                className="mt-3 h-0.5 w-16 rounded-full"
                style={{ backgroundColor: team.secondary }}
              />
            </div>
          </div>
        );
      case "BANNER":
        return (
          <div className="relative w-full h-full overflow-hidden flex flex-col">
            <div
              className="shrink-0 flex items-center justify-center gap-2 py-2 px-4"
              style={{ backgroundColor: team.primary }}
            >
              <TeamBranding
                team={team}
                style={{ width: logoPx(32), height: logoPx(32) }}
                initialsSize="xs"
              />
              <span
                className="font-black text-white uppercase text-sm tracking-widest"
                style={badgeStyles}
              >
                {badgeText}
              </span>
            </div>
            <div className="flex-1 relative min-h-0">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col items-center text-center"
                style={{ padding: `${marginPx}px` }}
              >
                <h2
                  className={cn(
                    "text-white font-black leading-tight drop-shadow-lg",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h2>
                <div
                  className="mt-3 h-1 w-20 rounded-full"
                  style={{ backgroundColor: team.secondary }}
                />
              </div>
            </div>
            <div
              className="shrink-0 h-1 w-full"
              style={{
                background: `linear-gradient(to right, ${team.primary}, ${team.secondary}, ${team.primary})`,
              }}
            />
          </div>
        );
      case "SPOTLIGHT":
        return (
          <div className="relative w-full h-full bg-black overflow-hidden">
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "w-full h-full object-cover opacity-40",
                imagePositionClass,
              )}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div
              className="absolute inset-0"
              // style={{
              //   background:
              //     "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 99%, black 100%)",
              // }}
            />
            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <span
                className="font-black px-3 py-1 rounded-full text-white/90 text-xs uppercase tracking-widest"
                style={{
                  ...badgeStyles,
                  backgroundColor: team.primary,
                  color: team.secondary,
                }}
              >
                {badgeText}
              </span>
            </div>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{ padding: `${marginPx}px` }}
            >
              <h2
                className={cn(
                  "text-white font-black leading-[0.95] tracking-tight drop-shadow-[0_0_30px_rgba(0,0,0,0.9)]",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <div
                className="mt-4 h-px w-32 opacity-60"
                style={{ backgroundColor: team.secondary }}
              />
              <p className="mt-3 text-white/70 text-xs font-bold uppercase tracking-widest">
                {team.name}
              </p>
            </div>
            <div className="absolute bottom-4 right-4">
              <TeamBranding
                team={team}
                style={{ width: logoPx(40), height: logoPx(40) }}
                initialsSize="xs"
              />
            </div>
          </div>
        );
      case "NEON":
        return (
          <div className="relative w-full h-full bg-[#0a0a0f] overflow-hidden">
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "w-full h-full object-cover opacity-25",
                imagePositionClass,
              )}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{ padding: `${marginPx}px` }}
            >
              <span
                className="font-black px-3 py-1 rounded border-2 text-xs uppercase tracking-[0.3em] mb-6"
                style={{
                  ...badgeStyles,
                  borderColor: team.primary,
                  color: team.primary,
                  boxShadow: `0 0 20px ${team.primary}80, inset 0 0 15px ${team.primary}20`,
                }}
              >
                {badgeText}
              </span>
              <h2
                className={cn("font-black leading-tight", headlineFont)}
                style={{
                  ...headlineStyles,
                  color: "#fff",
                  textShadow: `0 0 30px ${team.primary}, 0 0 60px ${team.primary}60`,
                }}
              >
                {headline}
              </h2>
              <div
                className="mt-6 h-px w-24 opacity-80"
                style={{
                  backgroundColor: team.secondary,
                  boxShadow: `0 0 15px ${team.secondary}`,
                }}
              />
              <p className="mt-3 text-white/60 text-[10px] font-mono uppercase tracking-widest">
                {team.name}
              </p>
            </div>
            <div className="absolute top-4 right-4">
              <TeamBranding
                team={team}
                style={{
                  width: logoPx(44),
                  height: logoPx(44),
                  filter: `drop-shadow(0 0 8px ${team.primary})`,
                }}
                initialsSize="xs"
              />
            </div>
          </div>
        );
      case "EDITORIAL":
        return (
          <div className="relative w-full h-full bg-white overflow-hidden flex">
            <div
              className="w-16 shrink-0 flex flex-col items-center justify-center py-8"
              style={{ backgroundColor: team.primary }}
            >
              <span className="text-white font-black text-2xl leading-none tracking-tighter">
                {article.team?.conference}
              </span>
              <span className="text-white/80 text-[12px] font-bold uppercase tracking-widest mt-2">
                {article.team?.division}
              </span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex-1 relative min-h-0">
                <img
                  src={imageUrl}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover",
                    imagePositionClass,
                  )}
                  referrerPolicy="no-referrer"
                  style={imageObjectPositionStyle}
                />
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
              </div>
              <div
                className="shrink-0 border-t-2 border-black"
                style={{ padding: `${marginPx}px` }}
              >
                <h2
                  className={cn(
                    "text-black font-black leading-tight",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="h-px flex-1"
                    style={{ backgroundColor: team.secondary }}
                  />
                  <span className="text-black/50 text-[10px] font-bold uppercase">
                    {team.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4">
              <TeamBranding
                team={team}
                style={{ width: logoPx(40), height: logoPx(40) }}
                initialsSize="xs"
              />
            </div>
          </div>
        );
      case "VINTAGE":
        return (
          <div
            className="relative w-full h-full overflow-hidden flex flex-col"
            style={{
              backgroundColor: "#f5f0e6",
              border: "8px solid #c4a574",
              boxShadow: "inset 0 0 0 2px #8b7355",
            }}
          >
            <div className="absolute inset-4 border border-amber-900/20 pointer-events-none" />
            <div className="relative flex-1 min-h-0">
              <img
                src={imageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover opacity-90",
                  imagePositionClass,
                )}
                referrerPolicy="no-referrer"
                style={{
                  ...imageObjectPositionStyle,
                  filter: "sepia(0.25) contrast(1.05)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#f5f0e6] via-transparent to-transparent" />
            </div>
            <div
              className="relative bg-[#f5f0e6] text-amber-900"
              style={{ padding: `${marginPx}px` }}
            >
              <span
                className="inline-block px-2 py-0.5 border border-amber-900/50 text-[10px] font-black uppercase tracking-widest mb-2"
                style={badgeStyles}
              >
                {badgeText}
              </span>
              <h2
                className={cn("font-black leading-snug", headlineFont)}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <p className="mt-1 text-amber-900/70 text-xs font-serif">
                {team.name}
              </p>
            </div>
            <div className="absolute top-6 left-6">
              <TeamBranding
                team={team}
                style={{
                  width: logoPx(48),
                  height: logoPx(48),
                  filter: "sepia(0.3)",
                }}
                initialsSize="xs"
              />
            </div>
          </div>
        );

        return (
          <div
            className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center"
            style={{
              padding: "12%",
              backgroundColor: "#111",
            }}
          >
            <div
              className="absolute inset-[12%] rounded-sm overflow-hidden"
              style={{
                border: `6px solid ${team.primary}`,
                boxShadow: `0 0 0 2px ${team.secondary}, inset 0 0 60px rgba(0,0,0,0.5)`,
              }}
            >
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col items-center text-center"
                style={{ padding: `${marginPx}px` }}
              >
                <span
                  className="text-[10px] font-black uppercase tracking-[0.4em] mb-2"
                  style={{ color: team.secondary }}
                >
                  {badgeText}
                </span>
                <h2
                  className={cn(
                    "text-white font-black leading-tight",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h2>
              </div>
            </div>
            <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2">
              <TeamBranding
                team={team}
                style={{ width: logoPx(36), height: logoPx(36) }}
                initialsSize="xs"
              />
            </div>
          </div>
        );
      case "WAVE":
        return (
          <div className="relative w-full h-full overflow-hidden flex flex-col">
            {/* Imagem em camada cheia para não deixar espaço entre a imagem e a div de conteúdo */}
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
            <div
              className="relative z-10 mt-auto shrink-0 flex flex-col items-center justify-center text-center rounded-t-[2rem]"
              style={{
                padding: `${marginPx}px`,
                paddingTop: marginPx + 12,
                background: `linear-gradient(180deg, ${team.primary} 0%, ${team.primary}ee 100%)`,
                boxShadow: "0 -4px 30px rgba(0,0,0,0.2)",
              }}
            >
              <span
                className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-90"
                style={{ color: team.secondary }}
              >
                {badgeText}
              </span>
              <h2
                className={cn(
                  "text-white font-black leading-tight drop-shadow-lg",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(28), height: logoPx(28) }}
                  initialsSize="xs"
                />
                <span className="text-white/90 text-[10px] font-bold uppercase">
                  {team.name}
                </span>
              </div>
            </div>
          </div>
        );
      case "SIGNING_CARD":
        return (
          <div className="relative w-full h-full bg-white overflow-hidden flex">
            {/* Faixa lateral com escudo grande (inspirado na FOX) */}

            {/* Foto + conteúdo */}
            <div className="flex-1 h-full relative flex flex-col">
              <div className="flex-1 relative">
                <img
                  src={imageUrl}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover",
                    imagePositionClass,
                  )}
                  referrerPolicy="no-referrer"
                  style={imageObjectPositionStyle}
                />
                <div className="pointer-events-none absolute bottom-0 left-0 w-full h-[90%] bg-gradient-to-t from-black/80 via-black/70 to-transparent" />{" "}
              </div>
              <div
                className="absolute inset-0 flex flex-col justify-end"
                style={{ padding: `${marginPx}px` }}
              >
                <div className="max-w-[80%]">
                  <h2
                    className={cn(
                      "text-white font-black leading-none tracking-tight text-4xl md:text-5xl",
                      headlineFont,
                    )}
                    style={headlineStyles}
                  >
                    {headline}
                  </h2>
                </div>
                {subtext && (
                  <div className="mt-3 inline-flex items-center bg-yellow-400 px-4 py-2 rounded-sm shadow-md">
                    <span className="text-black font-black text-[11px] uppercase tracking-widest">
                      {subtext}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "WELCOME_POSTER":
        return (
          <div className="relative w-full h-full bg-[#f7f3eb] overflow-hidden flex flex-col items-center justify-center">
            <div
              className="relative w-full h-full bg-white shadow-xl border border-black/5 flex flex-col items-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(32), height: logoPx(32) }}
                  initialsSize="xs"
                />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-black/60">
                  {badgeText || "WELCOME"}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center leading-tight text-yellow-500">
                {team.name.toUpperCase()}
              </h2>
              <div className="relative w-full flex-1 flex items-center justify-center mb-5">
                <div className="relative w-[95%] rounded-3xl overflow-hidden shadow-lg">
                  <img
                    src={imageUrl}
                    alt=""
                    className={cn(
                      "w-full h-full object-cover",
                      imagePositionClass,
                    )}
                    referrerPolicy="no-referrer"
                    style={imageObjectPositionStyle}
                  />
                </div>
              </div>
              <div className="w-full text-center ">
                <p
                  className={cn(
                    "text-2xl md:text-3xl font-black tracking-tight text-black",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </p>
                {subtext && (
                  <p className="mt-1 text-xs text-black/60 font-medium uppercase tracking-widest">
                    {subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case "BOLD_CONTRACT":
        return (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <img
              src={imageUrl}
              alt=""
              className={cn("w-full h-full object-cover", imagePositionClass)}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center text-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">
                <span>{contractLabel || "CONTRACT"}</span>
                <span className="w-6 h-px bg-white/40" />
                <span>{(contractTeamLabel || team.name).toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-center mb-2">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(72), height: logoPx(72) }}
                  initialsSize="lg"
                />
              </div>
              <h2
                className={cn(
                  "text-white font-black text-4xl md:text-5xl leading-none drop-shadow-2xl",
                  headlineFont,
                )}
                style={headlineStyles}
              >
                {headline}
              </h2>
              {subtext && (
                <p className="mt-2 text-xs text-white/80 font-medium tracking-widest uppercase">
                  {subtext}
                </p>
              )}
            </div>
          </div>
        );
      case "CUTOUT_HERO":
        return (
          <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center">
            <div
              className="relative w-[88%] h-[88%] bg-white flex flex-col items-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="absolute inset-x-8 top-5 flex justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">
                <span>{team.name}</span>
                <span>{badgeText || "SIGNED"}</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-[80%] h-[80%]">
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-3xl shadow-2xl"
                    referrerPolicy="no-referrer"
                    style={imageObjectPositionStyle}
                  />
                </div>
              </div>
              <div className="w-full text-center mt-auto">
                <h2
                  className={cn(
                    "text-3xl md:text-4xl text-black font-black tracking-tight",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h2>
                {subtext && (
                  <p className="mt-1 text-xs text-black/60 font-medium uppercase tracking-widest">
                    {subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case "SIDE_STRIPE":
        return (
          <div className="relative w-full h-full overflow-hidden flex bg-black">
            <div className="w-2/5 h-full relative">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-y-0 right-0 w-20" />
            </div>
            <div
              className="flex-1 h-full flex flex-col justify-center relative"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="absolute inset-0 opacity-10">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at top, #fff 0, transparent 50%)",
                  }}
                />
              </div>
              <div className="relative z-10 flex flex-col gap-3">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(56), height: logoPx(56) }}
                  initialsSize="xs"
                />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.35em]">
                  {badgeText || "NEWS"}
                </span>
                <h2
                  className={cn(
                    "text-white font-black leading-tight text-3xl md:text-4xl",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h2>
                {subtext && (
                  <p
                    className="text-white/70 text-xs max-w-xs"
                    style={subtextStyles}
                  >
                    {subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case "CENTER_BADGE":
        return (
          <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black">
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen",
                imagePositionClass,
              )}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-black" />
            <div
              className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="mb-4 flex flex-col items-center gap-2">
                <div className="p-1 rounded-full bg-white/10 border border-white/20">
                  <TeamBranding
                    team={team}
                    style={{ width: logoPx(64), height: logoPx(64) }}
                    initialsSize="xs"
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60">
                  {badgeText || team.name.toUpperCase()}
                </span>
              </div>
              <h2
                className={cn(
                  "text-white font-black text-3xl md:text-4xl leading-tight drop-shadow-2xl",
                  headlineFont,
                )}
                style={{ ...headlineStyles, textAlign: "center" }}
              >
                {headline}
              </h2>
              {subtext && (
                <p
                  className="mt-3 text-xs text-white/70 max-w-md"
                  style={subtextStyles}
                >
                  {subtext}
                </p>
              )}
            </div>
          </div>
        );
      case "DUAL_PANEL":
        return (
          <div className="relative w-full h-full overflow-hidden">
            {/* Imagem como background ocupando tudo */}
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              {/* Overlay em cima da imagem toda (melhora legibilidade do texto). */}
              <div className="absolute inset-0 bg-black/45" />
            </div>

            {/* Painel de texto (mantém textos/estilos como estavam) */}
            <div className="relative z-10 w-full h-full flex">
              <div
                className="w-1/2 h-full flex flex-col justify-between"
                style={{ padding: `${marginPx}px` }}
              >
                <div className="flex items-center gap-3">
                  <TeamBranding
                    team={team}
                    style={{ width: logoPx(52), height: logoPx(52) }}
                    initialsSize="xs"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/80">
                      {badgeText || "NEWS"}
                    </span>
                    {/* <span className="text-xs font-bold text-white/90">
                      {team.name}
                    </span> */}
                  </div>
                </div>
                <div className="mt-4">
                  <h2
                    className={cn(
                      "text-white font-black text-2xl md:text-3xl leading-tight",
                      headlineFont,
                    )}
                    style={headlineStyles}
                  >
                    {headline}
                  </h2>
                  {subtext && (
                    <p
                      className="mt-3 text-xs text-white/90"
                      style={subtextStyles}
                    >
                      {subtext}
                    </p>
                  )}
                </div>
              </div>
              {/* Metade direita fica só como imagem de fundo */}
              <div className="w-1/2 h-full" />
            </div>
          </div>
        );
      case "RIBBON_HEADLINE":
        return (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <img
              src={imageUrl}
              alt=""
              className={cn("w-full h-full object-cover", imagePositionClass)}
              referrerPolicy="no-referrer"
              style={imageObjectPositionStyle}
            />
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-t-md bg-white text-black text-[10px] font-black uppercase tracking-[0.35em]">
                <span>{badgeText || "BREAKING"}</span>
                <span className="w-6 h-[1px] bg-black/40" />
                <span>{team.name}</span>{" "}
                <img src={team.logo} alt={team.name} className="w-4 h-4" />
              </div>
              <div className="relative bg-black/85 border-t border-white/20 rounded-t-none rounded-b-xl px-4 py-4 mt-[-2px]">
                <h2
                  className={cn(
                    "text-white font-black text-2xl md:text-3xl leading-tight",
                    headlineFont,
                  )}
                  style={headlineStyles}
                >
                  {headline}
                </h2>
                {subtext && (
                  <p
                    className="mt-2 text-xs text-white/70 max-w-xl"
                    style={subtextStyles}
                  >
                    {subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case "STACKED_NEWS":
        return (
          <div className="relative w-full h-full overflow-hidden bg-zinc-950">
            <div className="absolute inset-0 opacity-40">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>
            <div
              className="relative z-10 w-full h-full flex flex-col"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.35em] text-white/60 mb-3">
                <span>{badgeText || "NOTÍCIAS NFL"}</span>
                <span>{team.initials}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 mt-auto">
                <div className="bg-white/5 border border-white/15 rounded-xl p-3 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 shrink-0">
                    <img
                      src={imageUrl}
                      alt=""
                      className={cn(
                        "w-full h-full object-cover",
                        imagePositionClass,
                      )}
                      referrerPolicy="no-referrer"
                      style={imageObjectPositionStyle}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2
                      className={cn(
                        "text-white font-black text-sm leading-snug line-clamp-3",
                        headlineFont,
                      )}
                      style={headlineStyles}
                    >
                      {headline}
                    </h2>
                    {subtext && (
                      <p className="mt-1 text-[11px] text-white/70 line-clamp-2">
                        {subtext}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "GRID_HERO":
        return (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt=""
                className={cn("w-full h-full object-cover", imagePositionClass)}
                referrerPolicy="no-referrer"
                style={imageObjectPositionStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
            </div>
            <div
              className="relative z-10 w-full h-full flex flex-col"
              style={{ padding: `${marginPx}px` }}
            >
              <div className="flex items-center justify-between mb-4">
                <TeamBranding
                  team={team}
                  style={{ width: logoPx(52), height: logoPx(52) }}
                  initialsSize="xs"
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/60">
                  {badgeText || "HEADLINE"}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-3 mt-auto">
                <div className="col-span-8">
                  <h2
                    className={cn(
                      "text-white font-black text-3xl md:text-4xl leading-tight",
                      headlineFont,
                    )}
                    style={headlineStyles}
                  >
                    {headline}
                  </h2>
                </div>
                <div className="col-span-4 flex flex-col gap-2 text-[11px] text-white/70">
                  <div className="border border-white/20 rounded-lg px-2 py-1">
                    <span className="block font-bold uppercase tracking-widest text-[9px] text-white/40">
                      Time
                    </span>
                    <span className="block font-semibold">{team.name}</span>
                  </div>
                  {subtext && (
                    <div className="border border-white/20 rounded-lg px-2 py-1">
                      <span className="block font-bold uppercase tracking-widest text-[9px] text-white/40">
                        Detalhe
                      </span>
                      <p className="block text-[11px] leading-snug line-clamp-4">
                        {subtext}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case "MATCHUP":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela página &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.away.team.abbreviation,
          ) ?? {
            name: g.away.team.displayName,
            initials: g.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.home.team.abbreviation,
          ) ?? {
            name: g.home.team.displayName,
            initials: g.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.home.team.logo,
          };
          const gameDate = g.date
            ? new Date(g.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          const awayLines = g.away.linescores ?? [];
          const homeLines = g.home.linescores ?? [];
          const getQ = (
            arr: { displayValue: string; period: number }[],
            period: number,
          ) => arr.find((s) => s.period === period)?.displayValue ?? "–";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx - 4)}px` }}
            >
              {/* Fundo */}
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/65" />
              </div>

              {/* Barra superior: status + data + local */}
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-3">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                >
                  {g.status || "FINAL"}
                </span>
                {gameDate && (
                  <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider drop-shadow-md">
                    {gameDate}
                  </span>
                )}
                {g.venue && (
                  <span
                    className="text-white/70 text-[10px] font-medium truncate max-w-[140px] drop-shadow-md"
                    title={g.venue}
                  >
                    {g.venue}
                  </span>
                )}
              </div>

              {/* Área principal: dois blocos com cor do time + logo + placar + nome */}
              <div className="relative z-10 flex flex-1 min-h-0 items-stretch gap-3">
                <div
                  className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-white/20 bg-black/40 backdrop-blur-sm py-4"
                  style={{
                    borderColor: `${awayBrand.primary}99`,
                    boxShadow: `inset 0 0 0 1px ${awayBrand.primary}40`,
                  }}
                >
                  <div
                    className="h-1 w-12 rounded-full mb-2"
                    style={{ backgroundColor: awayBrand.primary }}
                  />
                  <TeamBranding
                    team={awayBrand}
                    style={{ width: logoPx(64), height: logoPx(64) }}
                    initialsSize="lg"
                  />
                  <span className="text-white font-black text-4xl tabular-nums mt-2 drop-shadow-lg">
                    {g.away.score}
                  </span>
                  <span className="text-white/95 text-xs font-bold mt-1 text-center px-2 drop-shadow-md leading-tight">
                    {g.away.team.displayName}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center shrink-0">
                  <span className="text-white/50 font-black text-2xl">×</span>
                </div>
                <div
                  className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-white/20 bg-black/40 backdrop-blur-sm py-4"
                  style={{
                    borderColor: `${homeBrand.primary}99`,
                    boxShadow: `inset 0 0 0 1px ${homeBrand.primary}40`,
                  }}
                >
                  <div
                    className="h-1 w-12 rounded-full mb-2"
                    style={{ backgroundColor: homeBrand.primary }}
                  />
                  <TeamBranding
                    team={homeBrand}
                    style={{ width: logoPx(64), height: logoPx(64) }}
                    initialsSize="lg"
                  />
                  <span className="text-white font-black text-4xl tabular-nums mt-2 drop-shadow-lg">
                    {g.home.score}
                  </span>
                  <span className="text-white/95 text-xs font-bold mt-1 text-center px-2 drop-shadow-md leading-tight">
                    {g.home.team.displayName}
                  </span>
                </div>
              </div>

              {/* Placar por quarto (Q1–Q4) */}
              {(awayLines.length > 0 || homeLines.length > 0) && (
                <div className="relative z-10 mt-3 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 overflow-hidden">
                  <div className="grid grid-cols-5 text-center text-[10px] font-bold uppercase tracking-wider">
                    <div className="py-2 text-white/40 border-b border-white/10">
                      {" "}
                    </div>
                    {[1, 2, 3, 4].map((q) => (
                      <div
                        key={q}
                        className="py-2 text-white/60 border-b border-white/10"
                      >
                        Q{q}
                      </div>
                    ))}
                    <div className="py-1.5 text-white/70 border-b border-white/10 bg-white/5">
                      Visit.
                    </div>
                    {[1, 2, 3, 4].map((q) => (
                      <div
                        key={q}
                        className="py-1.5 text-white tabular-nums border-b border-white/10 bg-white/5"
                      >
                        {getQ(awayLines, q)}
                      </div>
                    ))}
                    <div className="py-1.5 text-white/70 border-b border-white/10">
                      Casa
                    </div>
                    {[1, 2, 3, 4].map((q) => (
                      <div
                        key={q}
                        className="py-1.5 text-white tabular-nums border-b border-white/10"
                      >
                        {getQ(homeLines, q)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Records + TV */}
              <div className="relative z-10 mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px]">
                {g.away.records?.[0] && g.home.records?.[0] && (
                  <span className="text-white/90 font-bold uppercase tracking-wider drop-shadow-md">
                    {g.away.team.abbreviation} {g.away.records[0].summary} ·{" "}
                    {g.home.team.abbreviation} {g.home.records[0].summary}
                  </span>
                )}
                {g.broadcast && (
                  <span className="text-white/60 font-medium drop-shadow-md">
                    TV: {g.broadcast}
                  </span>
                )}
              </div>

              {/* Líderes em uma linha (opcional) */}
              {g.leaders && g.leaders.length > 0 && (
                <div className="relative z-10 mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">
                    Destaques
                  </span>
                  {g.leaders.slice(0, 3).map((cat, i) => {
                    const top = cat.leaders?.[0];
                    return top ? (
                      <span
                        key={i}
                        className="text-white/80 text-[9px] font-medium drop-shadow-md"
                      >
                        {cat.displayName}: {top.athlete.displayName}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })();
      case "HALFTIME":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela página &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === gameData!.away.team.abbreviation,
          ) ?? {
            name: gameData!.away.team.displayName,
            initials: gameData!.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: gameData!.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === gameData!.home.team.abbreviation,
          ) ?? {
            name: gameData!.home.team.displayName,
            initials: gameData!.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: gameData!.home.team.logo,
          };
          const halfA = getFirstHalfScore(gameData!.away);
          const halfH = getFirstHalfScore(gameData!.home);
          return (
            <div
              className="relative w-full h-full flex flex-col items-center justify-center gap-6 overflow-hidden"
              style={{ padding: `${marginPx}px` }}
            >
              {/* Fundo: mesma imagem do MATCHUP */}
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/65" />
              </div>

              <div className="relative z-10 text-nfl-red font-black uppercase tracking-widest text-sm drop-shadow-md">
                1Âº tempo
              </div>
              <div className="relative z-10 flex items-center justify-center gap-8 md:gap-12 w-full">
                <div className="flex flex-col items-center gap-2">
                  <TeamBranding
                    team={awayBrand}
                    style={{ width: logoPx(72), height: logoPx(72) }}
                    initialsSize="lg"
                  />
                  <span className="text-white font-black text-4xl tabular-nums drop-shadow-lg">
                    {halfA}
                  </span>
                  <span className="text-white/70 text-xs font-bold drop-shadow-md">
                    {gameData!.away.team.displayName}
                  </span>
                </div>
                <span className="text-white/40 font-black text-2xl">–</span>
                <div className="flex flex-col items-center gap-2">
                  <TeamBranding
                    team={homeBrand}
                    style={{ width: logoPx(72), height: logoPx(72) }}
                    initialsSize="lg"
                  />
                  <span className="text-white font-black text-4xl tabular-nums drop-shadow-lg">
                    {halfH}
                  </span>
                  <span className="text-white/70 text-xs font-bold drop-shadow-md">
                    {gameData!.home.team.displayName}
                  </span>
                </div>
              </div>
              <div className="relative z-10 text-white/40 text-xs drop-shadow-md">
                {gameData!.name}
              </div>
            </div>
          );
        })();
      case "LEADERS":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela página &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const leaders = g.leaders ?? [];
          const accentByIndex = ["#D50A0A", "#0ea5e9", "#f59e0b"] as const;
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.away.team.abbreviation,
          ) ?? {
            name: g.away.team.displayName,
            initials: g.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.home.team.abbreviation,
          ) ?? {
            name: g.home.team.displayName,
            initials: g.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.home.team.logo,
          };
          const awayScoreNum = parseInt(g.away.score, 10) || 0;
          const homeScoreNum = parseInt(g.home.score, 10) || 0;
          const awayWins = awayScoreNum > homeScoreNum;
          const homeWins = homeScoreNum > awayScoreNum;
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              {/* Fundo */}
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>

              {/* Título */}
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                  Líderes do jogo
                </h2>
              </div>

              {/* Cards dos líderes */}
              <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-3">
                {leaders.slice(0, 3).map((cat, i) => {
                  const top = cat.leaders?.[0];
                  if (!top) return null;
                  const accent = accentByIndex[i] ?? "#D50A0A";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-xl overflow-hidden border border-white/15 bg-black/50 backdrop-blur-md shadow-lg"
                      style={{
                        boxShadow: `0 0 0 1px ${accent}40, 0 4px 12px rgba(0,0,0,0.4)`,
                      }}
                    >
                      <div
                        className="w-1.5 h-full min-h-[72px] shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      {top.athlete.headshot ? (
                        <img
                          src={top.athlete.headshot}
                          alt=""
                          className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white/20"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-white/80 text-sm font-black border-2 border-white/20"
                          style={{ backgroundColor: `${accent}40` }}
                        >
                          {top.athlete.position?.abbreviation ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 py-2.5 pr-3">
                        <div className="text-white font-black text-base truncate drop-shadow-sm">
                          {top.athlete.displayName}
                        </div>
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white"
                          style={{ backgroundColor: `${accent}99` }}
                        >
                          {cat.displayName}
                        </span>
                        <div className="text-white/95 text-xs font-mono mt-2 font-semibold tracking-wide">
                          {top.displayValue}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rodapé: logos + times + placar (vencedor em destaque) */}
              <div className="relative z-10 mt-3 pt-3 border-t border-white/15">
                <div className="flex items-center justify-center gap-1.5 md:gap-2 flex-nowrap text-center overflow-hidden min-w-0">
                  <TeamBranding
                    team={awayBrand}
                    style={{ width: logoPx(28), height: logoPx(28) }}
                    initialsSize="xs"
                    className="shrink-0"
                  />
                  <span className="text-white font-bold text-sm md:text-base truncate min-w-0 max-w-[28%] drop-shadow-md shrink">
                    {g.away.team.displayName}
                  </span>
                  <span
                    className="font-black text-xl md:text-2xl tabular-nums shrink-0 drop-shadow-md"
                    style={{
                      color: awayWins
                        ? awayBrand.primary
                        : homeWins
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(255,255,255,0.9)",
                    }}
                  >
                    {g.away.score}
                  </span>
                  <span className="text-white/60 font-black text-lg shrink-0">
                    â€“
                  </span>
                  <span
                    className="font-black text-xl md:text-2xl tabular-nums shrink-0 drop-shadow-md"
                    style={{
                      color: homeWins
                        ? homeBrand.primary
                        : awayWins
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(255,255,255,0.9)",
                    }}
                  >
                    {g.home.score}
                  </span>
                  <span className="text-white font-bold text-sm md:text-base truncate min-w-0 max-w-[28%] drop-shadow-md shrink">
                    {g.home.team.displayName}
                  </span>
                  <TeamBranding
                    team={homeBrand}
                    style={{ width: logoPx(28), height: logoPx(28) }}
                    initialsSize="xs"
                    className="shrink-0"
                  />
                </div>
              </div>
            </div>
          );
        })();
      case "SCOREBOARD":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela pÃ¡gina &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.away.team.abbreviation,
          ) ?? {
            name: g.away.team.displayName,
            initials: g.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.home.team.abbreviation,
          ) ?? {
            name: g.home.team.displayName,
            initials: g.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.home.team.logo,
          };
          const awayWins =
            (parseInt(g.away.score, 10) || 0) >
            (parseInt(g.home.score, 10) || 0);
          const homeWins =
            (parseInt(g.home.score, 10) || 0) >
            (parseInt(g.away.score, 10) || 0);
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/65" />
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center gap-4 md:gap-6">
                <div
                  className="flex-1 flex flex-col items-center justify-center rounded-xl py-6 border-2 bg-black/40 backdrop-blur-sm"
                  style={{
                    borderColor: awayWins
                      ? `${awayBrand.primary}cc`
                      : "rgba(255,255,255,0.2)",
                    boxShadow: awayWins
                      ? `0 0 20px ${awayBrand.primary}40`
                      : undefined,
                  }}
                >
                  <TeamBranding
                    team={awayBrand}
                    style={{ width: logoPx(80), height: logoPx(80) }}
                    initialsSize="lg"
                  />
                  <span
                    className="text-white font-black text-5xl md:text-6xl tabular-nums mt-2 drop-shadow-lg"
                    style={awayWins ? { color: awayBrand.primary } : undefined}
                  >
                    {g.away.score}
                  </span>
                  <span className="text-white/90 text-sm font-bold mt-1 text-center px-2 drop-shadow-md">
                    {g.away.team.displayName}
                  </span>
                </div>
                <span className="text-white/50 font-black text-3xl shrink-0">
                  â€“
                </span>
                <div
                  className="flex-1 flex flex-col items-center justify-center rounded-xl py-6 border-2 bg-black/40 backdrop-blur-sm"
                  style={{
                    borderColor: homeWins
                      ? `${homeBrand.primary}cc`
                      : "rgba(255,255,255,0.2)",
                    boxShadow: homeWins
                      ? `0 0 20px ${homeBrand.primary}40`
                      : undefined,
                  }}
                >
                  <TeamBranding
                    team={homeBrand}
                    style={{ width: logoPx(80), height: logoPx(80) }}
                    initialsSize="lg"
                  />
                  <span
                    className="text-white font-black text-5xl md:text-6xl tabular-nums mt-2 drop-shadow-lg"
                    style={homeWins ? { color: homeBrand.primary } : undefined}
                  >
                    {g.home.score}
                  </span>
                  <span className="text-white/90 text-sm font-bold mt-1 text-center px-2 drop-shadow-md">
                    {g.home.team.displayName}
                  </span>
                </div>
              </div>
            </div>
          );
        })();
      case "QUARTERS":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela pÃ¡gina &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.away.team.abbreviation,
          ) ?? {
            name: g.away.team.displayName,
            initials: g.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.home.team.abbreviation,
          ) ?? {
            name: g.home.team.displayName,
            initials: g.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.home.team.logo,
          };
          const awayLines = g.away.linescores ?? [];
          const homeLines = g.home.linescores ?? [];
          const getQ = (
            arr: { displayValue: string; period: number }[],
            period: number,
          ) => arr.find((s) => s.period === period)?.displayValue ?? "0";
          const totalA = [1, 2, 3, 4].reduce(
            (s, q) => s + (parseInt(getQ(awayLines, q), 10) || 0),
            0,
          );
          const totalH = [1, 2, 3, 4].reduce(
            (s, q) => s + (parseInt(getQ(homeLines, q), 10) || 0),
            0,
          );
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                  Placar por quarto
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 rounded-xl bg-black/50 backdrop-blur-sm border border-white/15 overflow-hidden">
                <div className="grid grid-cols-6 gap-0 text-center text-[10px] font-bold uppercase tracking-wider h-full">
                  <div className="py-2.5 text-white/40 border-b border-white/10" />
                  {[1, 2, 3, 4].map((q) => (
                    <div
                      key={q}
                      className="py-2.5 text-white/70 border-b border-white/10"
                    >
                      Q{q}
                    </div>
                  ))}
                  <div className="py-2.5 text-white/90 border-b border-white/10">
                    Total
                  </div>
                  <div className="py-2 flex items-center justify-center gap-1.5 border-b border-white/10 bg-white/5">
                    <TeamBranding
                      team={awayBrand}
                      style={{ width: logoPx(20), height: logoPx(20) }}
                      initialsSize="xs"
                    />
                    <span className="text-white/80 truncate">
                      {g.away.team.abbreviation}
                    </span>
                  </div>
                  {[1, 2, 3, 4].map((q) => (
                    <div
                      key={q}
                      className="py-2 text-white tabular-nums border-b border-white/10 bg-white/5"
                    >
                      {getQ(awayLines, q)}
                    </div>
                  ))}
                  <div className="py-2 text-white font-black tabular-nums border-b border-white/10 bg-white/5">
                    {totalA}
                  </div>
                  <div className="py-2 flex items-center justify-center gap-1.5 border-b border-white/10">
                    <TeamBranding
                      team={homeBrand}
                      style={{ width: logoPx(20), height: logoPx(20) }}
                      initialsSize="xs"
                    />
                    <span className="text-white/80 truncate">
                      {g.home.team.abbreviation}
                    </span>
                  </div>
                  {[1, 2, 3, 4].map((q) => (
                    <div
                      key={q}
                      className="py-2 text-white tabular-nums border-b border-white/10"
                    >
                      {getQ(homeLines, q)}
                    </div>
                  ))}
                  <div className="py-2 text-white font-black tabular-nums border-b border-white/10">
                    {totalH}
                  </div>
                </div>
              </div>
            </div>
          );
        })();
      case "STATS":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela pÃ¡gina &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const leaders = g.leaders ?? [];
          const accentByIndex = [
            "#D50A0A",
            "#0ea5e9",
            "#f59e0b",
            "#22c55e",
            "#a855f7",
          ] as const;
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                  Destaques do jogo
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-2 overflow-auto">
                {leaders.slice(0, 5).map((cat, i) => {
                  const top = cat.leaders?.[0];
                  if (!top) return null;
                  const accent = accentByIndex[i] ?? "#D50A0A";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-white/15 bg-black/50 backdrop-blur-sm py-2.5 px-3"
                      style={{ boxShadow: `0 0 0 1px ${accent}30` }}
                    >
                      <div
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-white/60 text-[9px] font-bold uppercase tracking-wider">
                          {cat.displayName}
                        </span>
                        <div className="text-white font-bold text-sm truncate">
                          {top.athlete.displayName}
                        </div>
                      </div>
                      <span
                        className="text-white font-black text-sm tabular-nums shrink-0"
                        style={{ color: accent }}
                      >
                        {top.displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="relative z-10 mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px]">
                {g.away.records?.[0] && g.home.records?.[0] && (
                  <span className="text-white/90 font-bold uppercase tracking-wider drop-shadow-md">
                    {g.away.team.abbreviation} {g.away.records[0].summary}{" "}
                    {g.home.team.abbreviation} {g.home.records[0].summary}
                  </span>
                )}
                {g.venue && (
                  <span className="text-white/60 drop-shadow-md">
                    Local: {g.venue}
                  </span>
                )}
                {g.broadcast && (
                  <span className="text-white/60 drop-shadow-md">
                    TV: {g.broadcast}
                  </span>
                )}
              </div>
            </div>
          );
        })();
      case "GAME_CARD":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela pÃ¡gina &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.away.team.abbreviation,
          ) ?? {
            name: g.away.team.displayName,
            initials: g.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.home.team.abbreviation,
          ) ?? {
            name: g.home.team.displayName,
            initials: g.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.home.team.logo,
          };
          const gameDate = g.date
            ? new Date(g.date).toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/65" />
              </div>
              <div className="relative z-10 rounded-xl border border-white/20 bg-black/50 backdrop-blur-md p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-white/80">
                  {gameDate && (
                    <span className="font-bold uppercase tracking-wider">
                      {gameDate}
                    </span>
                  )}
                  {g.venue && (
                    <span className="truncate max-w-[200px]">
                      Local: {g.venue}
                    </span>
                  )}
                  {g.broadcast && <span>TV: {g.broadcast}</span>}
                </div>
                <div className="flex items-center justify-center gap-4 py-2">
                  <TeamBranding
                    team={awayBrand}
                    style={{ width: logoPx(56), height: logoPx(56) }}
                    initialsSize="md"
                  />
                  <span className="text-white font-black text-3xl tabular-nums drop-shadow-lg">
                    {g.away.score} – {g.home.score}
                  </span>
                  <TeamBranding
                    team={homeBrand}
                    style={{ width: logoPx(56), height: logoPx(56) }}
                    initialsSize="md"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-white/90 text-xs font-bold">
                  <span className="truncate max-w-[40%]">
                    {g.away.team.displayName}
                  </span>
                  <span className="text-white/50">×</span>
                  <span className="truncate max-w-[40%]">
                    {g.home.team.displayName}
                  </span>
                </div>
                <div className="flex justify-center">
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  >
                    {g.status || "FINAL"}
                  </span>
                </div>
              </div>
            </div>
          );
        })();
      case "BOX_SCORE":
      case "STATS_DETAILED":
      case "ROSTER":
      case "WIN_PROBABILITY":
      case "DRIVES":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo pela pÃ¡gina &quot;Criar post&quot; para usar este
              template.
            </div>
          );
        }
        if (
          gameSummaryLoading ||
          (SUMMARY_STYLES.includes(activeStyle) && !gameSummaryData)
        ) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/80">
              <Loader2 size={32} className="animate-spin mx-auto mb-3" />
              <p>Carregando resumo do jogo…</p>
            </div>
          );
        }
        return (() => {
          const g = gameData!;
          const summary = gameSummaryData!;
          const awayBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.away.team.abbreviation,
          ) ?? {
            name: g.away.team.displayName,
            initials: g.away.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.away.team.logo,
          };
          const homeBrand = ALL_NFL_TEAMS.find(
            (t) => t.initials === g.home.team.abbreviation,
          ) ?? {
            name: g.home.team.displayName,
            initials: g.home.team.abbreviation,
            primary: "#374151",
            secondary: "#fff",
            logo: g.home.team.logo,
          };
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          const overlay = <div className="absolute inset-0 bg-black/70" />;
          if (activeStyle === "BOX_SCORE") {
            const teams = summary.boxscore?.teams ?? [];
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {overlay}
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    Box score
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 flex gap-3 overflow-auto">
                  {teams.slice(0, 2).map((t, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-0 rounded-xl bg-black/50 backdrop-blur-sm border border-white/15 p-3 overflow-auto"
                    >
                      <div className="text-white font-bold text-xs mb-2 truncate">
                        {t.team?.displayName ??
                          (i === 0
                            ? g.away.team.displayName
                            : g.home.team.displayName)}
                      </div>
                      {(t.statistics ?? []).slice(0, 12).map((s, j) => (
                        <div
                          key={j}
                          className="flex justify-between text-[10px] text-white/90 py-0.5 border-b border-white/10 last:border-0"
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="tabular-nums shrink-0 ml-2">
                            {s.stats?.join(", ") ?? "–"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="relative z-10 mt-2 text-white/50 text-[10px] text-center">
                  {g.name}
                </div>
              </div>
            );
          }
          if (activeStyle === "STATS_DETAILED") {
            const stats = summary.statistics ?? [];
            const firstCat = stats[0];
            const athletes = firstCat?.splits?.[0]?.athletes ?? [];
            const labels = firstCat?.labels ?? [];
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {overlay}
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    {firstCat?.name ?? "EstatÃ­sticas"}
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-2">
                  {athletes.slice(0, 8).map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-black/50 border border-white/15 px-3 py-2"
                    >
                      <span className="text-white font-bold text-sm truncate">
                        {a.athlete?.displayName}
                      </span>
                      <span className="text-nfl-red font-black text-xs tabular-nums shrink-0 ml-2">
                        {a.stats?.slice(0, 4).join(" • ") ?? "--"}
                      </span>
                    </div>
                  ))}
                </div>
                {labels.length > 0 && (
                  <div className="relative z-10 mt-2 text-white/50 text-[9px] truncate text-center">
                    {labels.slice(0, 5).join(" · ")}
                  </div>
                )}
              </div>
            );
          }
          if (activeStyle === "ROSTER") {
            const roster = summary.roster ?? [];
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {overlay}
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    Roster
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 overflow-auto grid grid-cols-2 gap-2">
                  {roster.slice(0, 2).map((r, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-black/50 border border-white/15 p-2 overflow-auto"
                    >
                      <div className="text-white font-bold text-[10px] mb-1.5 truncate">
                        {r.team?.displayName}
                      </div>
                      {(r.athletes ?? []).slice(0, 10).map((a, j) => (
                        <div
                          key={j}
                          className="text-white/90 text-[9px] py-0.5 flex gap-1"
                        >
                          <span className="text-white/60 w-5 shrink-0">
                            {a.jersey}
                          </span>
                          <span className="truncate">{a.displayName}</span>
                          <span className="text-white/50 shrink-0">
                            {a.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (activeStyle === "WIN_PROBABILITY") {
            const plays = summary.winprobability?.playByPlay ?? [];
            const maxPoints = plays.filter(
              (p) => p.homeWinPercentage != null || p.awayWinPercentage != null,
            );
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {overlay}
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    Probabilidade de vitória
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center">
                  <div className="flex h-8 w-full rounded-lg overflow-hidden bg-black/50 border border-white/15">
                    {maxPoints.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-white/50 text-xs">
                        Sem dados
                      </div>
                    ) : (
                      maxPoints.slice(0, 50).map((p, i) => (
                        <div
                          key={i}
                          className="flex-1 min-w-[2%] transition-colors"
                          style={{
                            backgroundColor:
                              (p.homeWinPercentage ?? 0) >=
                              (p.awayWinPercentage ?? 0)
                                ? `${homeBrand.primary}99`
                                : `${awayBrand.primary}99`,
                          }}
                          title={`Casa ${p.homeWinPercentage ?? 0}% · Visitante ${p.awayWinPercentage ?? 0}%`}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold">
                    <span
                      className="truncate max-w-[45%]"
                      style={{ color: awayBrand.primary }}
                    >
                      {g.away.team.abbreviation}
                    </span>
                    <span
                      className="truncate max-w-[45%] text-right"
                      style={{ color: homeBrand.primary }}
                    >
                      {g.home.team.abbreviation}
                    </span>
                  </div>
                </div>
                <div className="relative z-10 mt-2 text-white/50 text-[10px] text-center">
                  {g.away.score} – {g.home.score}
                </div>
              </div>
            );
          }
          if (activeStyle === "DRIVES") {
            const drives = summary.drives?.previous ?? [];
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {overlay}
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    Drives
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1.5">
                  {drives.slice(0, 12).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-[10px]"
                    >
                      <span className="text-white/90 font-bold truncate">
                        {d.team?.abbreviation ?? "–"}
                      </span>
                      <span className="text-white/70 truncate mx-2">
                        {d.shortDisplayResult ??
                          d.result ??
                          d.description ??
                          "–"}
                      </span>
                      {d.plays != null && (
                        <span className="text-white/50 shrink-0">
                          {d.plays} plays
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {drives.length === 0 && (
                  <div className="relative z-10 flex-1 flex items-center justify-center text-white/50 text-sm">
                    Sem dados de drives
                  </div>
                )}
              </div>
            );
          }
          return null;
        })();
      case "STANDINGS_AFC_NFC":
      case "STANDINGS_DIVISION":
      case "RACE_PLAYOFFS":
        if (!standingsData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue a tabela na página &quot;Criar post&quot; &gt; Tabela.
            </div>
          );
        }
        return (() => {
          const st = standingsData;
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          const divisions = st.conferences.flatMap((c) => c.divisions);
          const allEntries = divisions.flatMap((d) => d.entries);
          if (activeStyle === "STANDINGS_AFC_NFC") {
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/70" />
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    Tabela NFL {st.season}
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-4">
                  {st.conferences.map((conf, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-black/50 border border-white/15 p-2"
                    >
                      <div className="text-nfl-red font-black text-[10px] uppercase tracking-wider mb-2">
                        {conf.name}
                      </div>
                      {conf.divisions.map((div, j) => (
                        <div key={j} className="mb-2 last:mb-0">
                          <div className="text-white/70 text-[9px] font-bold uppercase mb-1">
                            {div.name}
                          </div>
                          {div.entries.slice(0, 4).map((e, k) => (
                            <div
                              key={k}
                              className="flex justify-between text-[10px] text-white/90 py-0.5"
                            >
                              <span className="truncate">
                                {e.teamAbbreviation} {e.teamDisplayName}
                              </span>
                              <span className="tabular-nums shrink-0">
                                {e.wins}-{e.losses}
                                {e.ties ? `-${e.ties}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (activeStyle === "STANDINGS_DIVISION" && divisions.length > 0) {
            const div = divisions[0];
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/70" />
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    {div.name}
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 overflow-auto">
                  {div.entries.map((e, k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-lg bg-black/50 border border-white/15 px-3 py-2 mb-1.5"
                    >
                      <span className="text-white font-bold text-sm truncate">
                        {e.teamAbbreviation} {e.teamDisplayName}
                      </span>
                      <span className="text-nfl-red font-black tabular-nums">
                        {e.wins}-{e.losses}
                        {e.ties ? `-${e.ties}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (activeStyle === "RACE_PLAYOFFS") {
            const sorted = [...allEntries]
              .sort((a, b) => (b.winPct ?? 0) - (a.winPct ?? 0))
              .slice(0, 14);
            if (sorted.length === 0) {
              return (
                <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
                  Nenhum dado para Race for the playoffs. A API pode nÃ£o
                  retornar entradas.
                </div>
              );
            }
            return (
              <div
                className="relative w-full h-full flex flex-col overflow-hidden"
                style={{ padding: `${Math.max(12, marginPx)}px` }}
              >
                <div className="absolute inset-0">
                  <img
                    src={bgImg}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/70" />
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <div
                    className="h-1 w-8 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                  />
                  <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                    Race for the playoffs
                  </h2>
                </div>
                <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                  {sorted.map((e, k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-[10px]"
                    >
                      <span className="text-white/90 font-bold">
                        #{k + 1} {e.teamAbbreviation}
                      </span>
                      <span className="tabular-nums text-white/80">
                        {e.wins}-{e.losses}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Tabela sem dados. A API pode nÃ£o retornar divisÃµes.
            </div>
          );
        })();
      case "SCHEDULE_WEEK_GRID":
        if (!scheduleData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue os jogos da semana na página &quot;Criar post&quot; &gt;
              Por semana.
            </div>
          );
        }
        return (() => {
          const sw = scheduleData;
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                  Jogos â€“ {sw.season} {sw.label}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto grid grid-cols-2 gap-2">
                {sw.games.slice(0, 12).map((game) => (
                  <div
                    key={game.id}
                    className="rounded-lg bg-black/50 border border-white/15 p-2 flex items-center justify-between gap-1"
                  >
                    {!hideTeamLogo && (
                      <img
                        src={game.away.team.logo}
                        alt=""
                        className="w-6 h-6 object-contain shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="text-white text-[9px] font-bold truncate">
                      {game.away.team.abbreviation}
                    </span>
                    <span className="text-white/80 text-[9px] tabular-nums shrink-0">
                      {game.away.score}-{game.home.score}
                    </span>
                    <span className="text-white text-[9px] font-bold truncate">
                      {game.home.team.abbreviation}
                    </span>
                    {!hideTeamLogo && (
                      <img
                        src={game.home.team.logo}
                        alt=""
                        className="w-6 h-6 object-contain shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "ODDS_LINE":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo para ver a linha.
            </div>
          );
        }
        return (() => {
          const pick = gameSummaryData?.pickcenter?.[0]?.odds?.[0];
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          if (!gameSummaryData && gameSummaryLoading) {
            return (
              <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
                Carregando linha do jogo…
              </div>
            );
          }
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                  Linha do jogo
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-3">
                {pick ? (
                  <>
                    {pick.spread && (
                      <p className="text-white font-bold text-sm">
                        Spread: {pick.spread}
                      </p>
                    )}
                    {pick.overUnder && (
                      <p className="text-white font-bold text-sm">
                        Total: {pick.overUnder}
                      </p>
                    )}
                    <p className="text-white/80 text-xs">
                      {gameData.away.team.abbreviation} @{" "}
                      {gameData.home.team.abbreviation}
                    </p>
                  </>
                ) : (
                  <p className="text-white/60 text-sm">
                    Linha indisponÃ­vel para este jogo.
                  </p>
                )}
              </div>
            </div>
          );
        })();
      case "GAME_RECAP":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo para ver o recap.
            </div>
          );
        }
        if (recapLoading) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregando recap…
            </div>
          );
        }
        return (() => {
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          const text =
            recapData?.summary ??
            recapData?.headline ??
            recapData?.body ??
            "Recap indisponível.";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/75" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Recap
                </h2>
              </div>
              <p className="relative z-10 text-white/90 text-xs leading-relaxed overflow-auto flex-1 line-clamp-[12]">
                {text}
              </p>
              <p className="relative z-10 text-white/50 text-[10px] mt-2">
                {gameData.away.team.abbreviation} @{" "}
                {gameData.home.team.abbreviation}
              </p>
            </div>
          );
        })();
      case "PREDICTOR":
        if (!gameData) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Abra um jogo para ver a previsÃ£o.
            </div>
          );
        }
        if (predictorLoading) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregando previsão…
            </div>
          );
        }
        return (() => {
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          const homePct = predictorData?.homeWinPercentage ?? 0;
          const awayPct = predictorData?.awayWinPercentage ?? 0;
          const spread = predictorData?.spread;
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
                  PrevisÃ£o do jogo
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-4">
                <div className="flex justify-between text-sm text-white font-bold">
                  <span>{gameData.away.team.abbreviation}</span>
                  <span className="tabular-nums text-nfl-red">
                    {awayPct > 0 ? `${Math.round(awayPct * 100)}%` : "â€”"}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-white font-bold">
                  <span>{gameData.home.team.abbreviation}</span>
                  <span className="tabular-nums text-nfl-red">
                    {homePct > 0 ? `${Math.round(homePct * 100)}%` : "â€”"}
                  </span>
                </div>
                {spread != null && (
                  <p className="text-white/80 text-xs">
                    Spread: {spread > 0 ? `+${spread}` : spread}
                  </p>
                )}
              </div>
            </div>
          );
        })();
      case "NEWS_CAROUSEL":
      case "NEWS_TOP5":
        if (editorData?.type !== "espn_news" || !editorData.items?.length) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue notícias na página Dados.
            </div>
          );
        }
        return (() => {
          const items = editorData.items.slice(
            0,
            activeStyle === "NEWS_TOP5" ? 5 : 10,
          );
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  {activeStyle === "NEWS_TOP5"
                    ? "Top 5 notÃ­cias"
                    : "Ãšltimas da NFL"}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-2">
                {items.map((n, i) => (
                  <div
                    key={n.id}
                    className="rounded-lg bg-black/50 border border-white/15 p-2 flex gap-2"
                  >
                    {n.images?.[0]?.url && (
                      <img
                        src={n.images[0].url}
                        alt=""
                        className="w-12 h-12 object-cover rounded shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-[10px] font-bold line-clamp-2">
                        {i + 1}. {n.headline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "SEASON_LEADERS":
        if (
          editorData?.type !== "season_leaders" ||
          !editorData.leaders.categories?.length
        ) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue líderes na página Dados.
            </div>
          );
        }
        return (() => {
          const cat = editorData.leaders.categories[0];
          const entries = cat.entries?.slice(0, 5) ?? [];
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Líderes {editorData.season} – {cat.label ?? cat.name}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {entries.map((e, i) => (
                  <div
                    key={e.athleteId}
                    className="flex justify-between text-[10px] text-white/90 py-1"
                  >
                    <span>
                      #{e.rank ?? i + 1} {e.displayName}{" "}
                      {e.teamAbbreviation ? `(${e.teamAbbreviation})` : ""}
                    </span>
                    <span className="tabular-nums">
                      {e.displayValue ?? e.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "INJURIES_REPORT":
        if (editorData?.type !== "injuries") {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue lesões na página Times.
            </div>
          );
        }
        return (() => {
          const { team, injuries } = editorData;
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                {!hideTeamLogo && team.logo && (
                  <img
                    src={team.logo}
                    alt=""
                    className="w-8 h-8 object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Lesões – {team.displayName}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {injuries.length === 0 ? (
                  <p className="text-white/60 text-sm">
                    Nenhum jogador listado.
                  </p>
                ) : (
                  injuries.slice(0, 15).map((e, i) => (
                    <div
                      key={e.athleteId || i}
                      className="flex justify-between text-[10px] text-white/90 py-1 border-b border-white/10"
                    >
                      <span>
                        {e.displayName} {e.position ? `(${e.position})` : ""}
                      </span>
                      <span className="text-white/70">{e.status ?? "â€”"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })();
      case "DRAFT_ROUND":
        if (editorData?.type !== "draft" || !editorData.draft.rounds?.length) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue o draft na página Dados.
            </div>
          );
        }
        return (() => {
          const round = editorData.draft.rounds[0];
          const picks = round.picks?.slice(0, 12) ?? [];
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Draft {editorData.season} – 1ª rodada
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {picks.map((p, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-[10px] text-white/90 py-1"
                  >
                    <span>
                      {p.pick}. {p.teamAbbreviation ?? "â€”"}{" "}
                      {p.athleteDisplayName ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "QBR_WEEK":
        if (
          editorData?.type !== "qbr_week" ||
          !editorData.qbr.entries?.length
        ) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue QBR na página Dados.
            </div>
          );
        }
        return (() => {
          const entries = editorData.qbr.entries.slice(0, 10);
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  QBR – Semana {editorData.week}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {entries.map((e, i) => (
                  <div
                    key={e.athleteId || i}
                    className="flex justify-between text-[10px] text-white/90 py-1"
                  >
                    <span>
                      #{e.rank ?? i + 1} {e.displayName}{" "}
                      {e.teamAbbreviation ?? ""}
                    </span>
                    <span className="tabular-nums">{e.qbr.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "NEXT_GAME_TEAM":
        if (editorData?.type !== "next_game") {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Use a pÃ¡gina Times â†’ PrÃ³ximo jogo.
            </div>
          );
        }
        return (() => {
          const { team, game } = editorData;
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          const dateStr = game.date
            ? new Date(game.date).toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                {!hideTeamLogo && team.logo && (
                  <img
                    src={team.logo}
                    alt=""
                    className="w-10 h-10 object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Próximo jogo â€“ {team.displayName}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-4">
                <div className="flex items-center justify-center gap-4">
                  {!hideTeamLogo && (
                    <img
                      src={game.away.team.logo}
                      alt=""
                      className="w-12 h-12 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="text-white font-bold">
                    {game.away.team.abbreviation}
                  </span>
                  <span className="text-white/60">@</span>
                  <span className="text-white font-bold">
                    {game.home.team.abbreviation}
                  </span>
                  {!hideTeamLogo && (
                    <img
                      src={game.home.team.logo}
                      alt=""
                      className="w-12 h-12 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                <p className="text-white/70 text-center text-sm">{dateStr}</p>
                {game.venue && (
                  <p className="text-white/50 text-center text-xs">
                    {game.venue}
                  </p>
                )}
              </div>
            </div>
          );
        })();
      case "TRANSACTIONS":
        if (editorData?.type !== "transactions" || !editorData.items?.length) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue transações na página Dados.
            </div>
          );
        }
        return (() => {
          const items = editorData.items.slice(0, 12);
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  MovimentaÃ§Ã£o da liga
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {items.map((t, i) => (
                  <div
                    key={t.id || i}
                    className="text-[10px] text-white/90 py-1 border-b border-white/10"
                  >
                    {t.athleteName ?? t.description ?? t.type ?? "â€”"}{" "}
                    {t.teamAbbreviation ? `(${t.teamAbbreviation})` : ""}
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "FUTURES":
        if (
          editorData?.type !== "futures" ||
          !editorData.futures.items?.length
        ) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue futures na página Dados.
            </div>
          );
        }
        return (() => {
          const items = editorData.futures.items.slice(0, 10);
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Favoritos ao Super Bowl {editorData.season}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {items.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="flex justify-between text-[10px] text-white/90 py-1"
                  >
                    <span>{f.name || f.teamAbbreviation || "â€”"}</span>
                    <span className="tabular-nums">
                      {f.odds ?? f.value ?? "â€”"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })();
      case "TALENT_PICKS":
        if (
          editorData?.type !== "talent_picks" ||
          !editorData.picks.picks?.length
        ) {
          return (
            <div className="relative w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center text-white/60 text-sm">
              Carregue talent picks na página Dados.
            </div>
          );
        }
        return (() => {
          const picks = editorData.picks.picks.slice(0, 10);
          const bgImg =
            "https://res.cloudinary.com/dc7j2rlyf/image/upload/v1772982106/ChatGPT_Image_8_de_mar._de_2026_12_01_15_zhvjdx.png";
          return (
            <div
              className="relative w-full h-full flex flex-col overflow-hidden"
              style={{ padding: `${Math.max(12, marginPx)}px` }}
            >
              <div className="absolute inset-0">
                <img
                  src={bgImg}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div
                  className="h-1 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(213,10,10,0.9)" }}
                />
                <h2 className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">
                  Picks dos analistas â€“ Semana {editorData.week}
                </h2>
              </div>
              <div className="relative z-10 flex-1 min-h-0 overflow-auto space-y-1">
                {picks.map((p, i) => (
                  <div
                    key={p.id || i}
                    className="text-[10px] text-white/90 py-1 border-b border-white/10"
                  >
                    {p.talentName ?? "Analista"}:{" "}
                    {p.pick ?? p.teamAbbreviation ?? "â€”"}
                  </div>
                ))}
              </div>
            </div>
          );
        })();
    }
  };

  const ALL_STYLES: PostStyle[] = [
    ...(gameData
      ? ([
          "MATCHUP",
          "HALFTIME",
          "LEADERS",
          "SCOREBOARD",
          "QUARTERS",
          "STATS",
          "GAME_CARD",
          "BOX_SCORE",
          "STATS_DETAILED",
          "ROSTER",
          "WIN_PROBABILITY",
          "DRIVES",
          "ODDS_LINE",
          "GAME_RECAP",
          "PREDICTOR",
        ] as PostStyle[])
      : []),
    ...(standingsData
      ? ([
          "STANDINGS_AFC_NFC",
          "STANDINGS_DIVISION",
          "RACE_PLAYOFFS",
        ] as PostStyle[])
      : []),
    ...(scheduleData ? (["SCHEDULE_WEEK_GRID"] as PostStyle[]) : []),
    ...(editorData?.type === "espn_news"
      ? (["NEWS_CAROUSEL", "NEWS_TOP5"] as PostStyle[])
      : []),
    ...(editorData?.type === "season_leaders"
      ? (["SEASON_LEADERS"] as PostStyle[])
      : []),
    ...(editorData?.type === "injuries"
      ? (["INJURIES_REPORT"] as PostStyle[])
      : []),
    ...(editorData?.type === "draft" ? (["DRAFT_ROUND"] as PostStyle[]) : []),
    ...(editorData?.type === "qbr_week" ? (["QBR_WEEK"] as PostStyle[]) : []),
    ...(editorData?.type === "transactions"
      ? (["TRANSACTIONS"] as PostStyle[])
      : []),
    ...(editorData?.type === "futures" ? (["FUTURES"] as PostStyle[]) : []),
    ...(editorData?.type === "talent_picks"
      ? (["TALENT_PICKS"] as PostStyle[])
      : []),
    ...(editorData?.type === "next_game"
      ? (["NEXT_GAME_TEAM"] as PostStyle[])
      : []),
    "BREAKING",
    "TRADED",
    "TRADED_CARD",
    "RELEASED",
    "RUMORS",
    "QUOTE",
    "SPLIT_TRADE",
    "SPLIT_RELEASE",
    "BIG_BOTTOM",
    "TOP_HEADLINE",
    "CHOP_STYLE",
    "MINIMAL",
    "TICKER",
    "HERO",
    "CARD",
    "BANNER",
    "SPOTLIGHT",
    "NEON",
    "EDITORIAL",
    "VINTAGE",
    "WAVE",
    "SIGNING_CARD",
    "WELCOME_POSTER",
    "BOLD_CONTRACT",
    "CUTOUT_HERO",
    "SIDE_STRIPE",
    "CENTER_BADGE",
    "DUAL_PANEL",
    "RIBBON_HEADLINE",
    "STACKED_NEWS",
    "GRID_HERO",
  ] as PostStyle[];

  const SectionHeader = ({
    label,
    extra,
  }: {
    label: string;
    extra?: React.ReactNode;
  }) => (
    <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-white/4 list-none [&::-webkit-details-marker]:hidden group-open:bg-white/3">
      <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {extra}
        <ChevronRight
          size={11}
          className="text-white/25 group-open:rotate-90 transition-transform shrink-0"
        />
      </div>
    </summary>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* â”€â”€ MODAL CONTAINER â”€â”€ */}
      <div className="w-full h-full md:max-w-[1880px] md:max-h-[96vh] flex flex-col bg-zinc-950 md:rounded-3xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* â”€â”€ HEADER â”€â”€ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0 bg-zinc-950 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Instagram size={16} className="text-pink-500 shrink-0" />
            <span className="text-white font-black text-sm uppercase tracking-[0.2em]">
              Post Editor
            </span>
            <span className="text-white/15 hidden md:inline">|</span>
            <span className="text-white/35 text-xs hidden md:inline truncate max-w-[500px]">
              {article.headline?.slice(0, 90)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col bg-[#0c0c0e] border-r border-white/8 min-w-0 overflow-hidden">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-2.5 border-b border-white/8 shrink-0 bg-zinc-950/60">
              {/* Format */}
              <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-2xl border border-white/10">
                {(publishDestination === "stories"
                  ? (["9:16"] as PostFormat[])
                  : publishDestination === "reels"
                    ? (["4:5"] as PostFormat[])
                    : (["1:1", "4:5"] as PostFormat[])
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFormat(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      activeFormat === f
                        ? "bg-white text-black shadow-sm"
                        : "text-white/45 hover:text-white",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {/* Image position */}
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                  Pos
                </span>
                <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-xl border border-white/10">
                  {(["top", "center", "bottom"] as ImagePosition[]).map(
                    (pos) => (
                      <button
                        key={pos}
                        onClick={() => setImagePosition(pos)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                          imagePosition === pos
                            ? "bg-white/20 text-white"
                            : "text-white/40 hover:text-white",
                        )}
                      >
                        {pos === "top"
                          ? "Topo"
                          : pos === "bottom"
                            ? "Base"
                            : "Centro"}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {/* Horizontal */}
              <div className="flex items-center gap-2 min-w-[170px]">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest shrink-0">
                  H
                </span>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={imageHorizontalOffset}
                  onChange={(e) =>
                    setImageHorizontalOffset(parseInt(e.target.value, 10))
                  }
                  className="flex-1 accent-white/60 h-1"
                />
                <span className="text-white/30 text-[10px] w-7 text-right shrink-0 tabular-nums">
                  {imageHorizontalOffset === 0
                    ? "0"
                    : imageHorizontalOffset > 0
                      ? `+${imageHorizontalOffset}`
                      : imageHorizontalOffset}
                </span>
              </div>
            </div>

            {/* Preview canvas — relative para posicionar o canvas oculto no carrossel */}
            <div className="flex-1 relative flex flex-col items-center justify-center gap-3 p-6 min-h-0 overflow-auto">
              {/* Canvas para export + primeira imagem do carrossel. Em modo carrossel fica invisível mas no viewport para o toJpeg capturar (evita imagem preta). */}
              <div
                ref={postRef}
                className={cn(
                  "shadow-2xl overflow-hidden bg-zinc-900 transition-all duration-500",
                  formats[activeFormat],
                  publishAsCarousel && fetchedContentImageUrls.length >= 2
                    ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 -z-10 pointer-events-none"
                    : "",
                )}
              >
                {renderTemplate()}
              </div>

              {/* Carousel preview */}
              {publishAsCarousel &&
                fetchedContentImageUrls.length >= 2 &&
                (() => {
                  const extraImagesCount = Math.max(
                    fetchedContentImageUrls.length - 1,
                    0,
                  );
                  const totalSlides = 1 + extraImagesCount;
                  const isTemplateSlide = carouselPreviewIndex === 0;
                  const currentImageIndex = carouselPreviewIndex;
                  return (
                    <>
                      <div
                        ref={
                          isTemplateSlide ? carouselTemplatePreviewRef : null
                        }
                        className={cn(
                          "relative shadow-2xl overflow-hidden bg-zinc-900 transition-all duration-500",
                          formats[activeFormat],
                        )}
                      >
                        {isTemplateSlide ? (
                          <div className="w-full h-full">
                            {renderTemplate()}
                          </div>
                        ) : (
                          <img
                            src={fetchedContentImageUrls[currentImageIndex]}
                            alt=""
                            className={cn(
                              "w-full h-full object-cover transition-opacity duration-200",
                              imagePositionClass,
                            )}
                            referrerPolicy="no-referrer"
                            style={imageObjectPositionStyle}
                          />
                        )}
                        <div
                          className="pointer-events-none absolute inset-0 flex items-center justify-between px-3"
                          data-carousel-ui="nav"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCarouselPreviewIndex((i) =>
                                i <= 0 ? totalSlides - 1 : i - 1,
                              )
                            }
                            className="pointer-events-auto p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCarouselPreviewIndex((i) =>
                                i >= totalSlides - 1 ? 0 : i + 1,
                              )
                            }
                            className="pointer-events-auto p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <div
                          className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5"
                          data-carousel-ui="dots"
                        >
                          {Array.from({ length: totalSlides }).map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setCarouselPreviewIndex(i)}
                              className={cn(
                                "pointer-events-auto w-2 h-2 rounded-full transition-all",
                                i === carouselPreviewIndex
                                  ? "bg-white scale-110"
                                  : "bg-white/40 hover:bg-white/60",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-white/35 text-xs tabular-nums">
                          Slide {carouselPreviewIndex + 1} / {totalSlides}
                        </p>
                        {!isTemplateSlide && (
                          <button
                            type="button"
                            onClick={() =>
                              removeCarouselImage(currentImageIndex)
                            }
                            className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 border border-red-400/30 text-red-300 text-xs hover:bg-red-500/30 transition-colors"
                          >
                            <X size={11} /> Remover
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
            </div>

            {/* Export bar */}
            <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-white/8 shrink-0 bg-zinc-950/60">
              {publishAsCarousel && fetchedContentImageUrls.length >= 2 && (
                <span className="text-white/30 text-xs">
                  Desmarque carrossel para exportar.
                </span>
              )}
              <button
                onClick={() => exportPost("png")}
                disabled={
                  isExporting ||
                  (publishAsCarousel && fetchedContentImageUrls.length >= 2)
                }
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 text-sm"
              >
                <Download size={15} /> {isExporting ? "Exportandoâ€¦" : "PNG"}
              </button>
              <button
                onClick={() => exportPost("jpg")}
                disabled={
                  isExporting ||
                  (publishAsCarousel && fetchedContentImageUrls.length >= 2)
                }
                className="flex items-center gap-2 bg-zinc-800 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 text-sm"
              >
                <Download size={15} /> JPG
              </button>
            </div>
          </div>

          <div className="w-[360px] xl:w-[800px] shrink-0 flex flex-col min-h-0 bg-zinc-950">
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-white/10">
              <button
                type="button"
                onClick={() => setRightPanelTab("design")}
                className={cn(
                  "flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2",
                  rightPanelTab === "design"
                    ? "text-white border-white"
                    : "text-white/35 border-transparent hover:text-white/60",
                )}
              >
                Design
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab("instagram")}
                className={cn(
                  "flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5",
                  rightPanelTab === "instagram"
                    ? "text-pink-400 border-pink-500"
                    : "text-white/35 border-transparent hover:text-white/60",
                )}
              >
                <Instagram size={12} /> Instagram
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* â”€â”€ DESIGN TAB â”€â”€ */}
              {rightPanelTab === "design" && (
                <div className="divide-y divide-white/6">
                  {/* Template Style */}
                  <details open className="group">
                    <SectionHeader
                      label="Template Style"
                      extra={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveStyle("BREAKING");
                          }}
                          className="flex items-center gap-1 text-white/25 hover:text-white/70 text-[9px] uppercase font-bold"
                        >
                          <RotateCcw size={9} /> Reset
                        </button>
                      }
                    />
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-3 gap-1">
                        {ALL_STYLES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setActiveStyle(s)}
                            className={cn(
                              "py-2 px-1 rounded-lg text-[8px] font-black uppercase transition-all border leading-tight text-center",
                              activeStyle === s
                                ? "bg-white text-black border-white"
                                : "bg-white/4 text-white/55 border-white/8 hover:border-white/25 hover:bg-white/10 hover:text-white",
                            )}
                          >
                            {s.replaceAll("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </details>

                  {/* Times */}
                  <details open className="group">
                    <SectionHeader label="Times" />
                    <div className="px-4 pb-4 space-y-3 mt-5">
                      {/* Original */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                          {teamBrand.logo ? (
                            <img
                              src={teamBrand.logo}
                              alt=""
                              className="w-full h-full object-contain p-0.5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-white font-black text-[9px] uppercase">
                              {teamBrand.initials}
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedTeamForOriginal?.initials ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedTeamForOriginal(
                              v
                                ? (ALL_NFL_TEAMS.find(
                                    (x) => x.initials === v,
                                  ) ?? null)
                                : null,
                            );
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-white text-xs focus:border-white/30 outline-none appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff60'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 0.4rem center",
                            backgroundSize: "1rem",
                            paddingRight: "1.8rem",
                          }}
                        >
                          <option value="">
                            {baseTeamBrand.name} (artigo)
                          </option>
                          {ALL_NFL_TEAMS.map((t) => (
                            <option key={t.initials} value={t.initials}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Contratante */}
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTeamForLogo?.initials ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedTeamForLogo(
                              v
                                ? (ALL_NFL_TEAMS.find(
                                    (x) => x.initials === v,
                                  ) ?? null)
                                : null,
                            );
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-white text-xs focus:border-white/30 outline-none appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff60'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 0.4rem center",
                            backgroundSize: "1rem",
                            paddingRight: "1.8rem",
                          }}
                        >
                          <option value="">Contratante (nenhum)</option>
                          {ALL_NFL_TEAMS.map((t) => (
                            <option key={t.initials} value={t.initials}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                          {selectedTeamForLogo?.logo ? (
                            <img
                              src={selectedTeamForLogo.logo}
                              alt=""
                              className="w-full h-full object-contain p-0.5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-white/25 text-[9px]">
                              â€”
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Ocultar logo do time (global) */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hideTeamLogo}
                          onChange={(e) => setHideTeamLogo(e.target.checked)}
                          className="rounded border-white/30 bg-black/40 text-nfl-red accent-nfl-red"
                        />
                        <span className="text-white/65 text-xs">
                          Ocultar logo do time nos posts
                        </span>
                      </label>
                      {/* Logo scale */}
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] uppercase tracking-widest shrink-0 w-10">
                          Logo
                        </span>
                        <input
                          type="range"
                          min="40"
                          max="260"
                          value={teamLogoScale}
                          onChange={(e) =>
                            setTeamLogoScale(parseInt(e.target.value, 10))
                          }
                          className="flex-1 accent-nfl-red"
                          disabled={hideTeamLogo}
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {teamLogoScale}%
                        </span>
                      </div>
                      {/* BOLD_CONTRACT labels */}
                      {activeStyle === "BOLD_CONTRACT" && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <label className="flex flex-col gap-1">
                            <span className="text-white/40 text-[10px] uppercase tracking-widest">
                              Texto da tag
                            </span>
                            <input
                              type="text"
                              value={contractLabel}
                              onChange={(e) =>
                                setContractLabel(e.target.value.toUpperCase())
                              }
                              className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-white/30 outline-none"
                              placeholder="CONTRACT"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-white/40 text-[10px] uppercase tracking-widest">
                              Nome do time (barra)
                            </span>
                            <input
                              type="text"
                              value={contractTeamLabel}
                              onChange={(e) =>
                                setContractTeamLabel(e.target.value)
                              }
                              className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-white/30 outline-none"
                              placeholder={baseTeamBrand.name.toUpperCase()}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* Tipografia */}
                  <details className="group">
                    <SectionHeader label="Tipografia" />
                    <div className="px-4 pb-4 space-y-3 mt-5">
                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            "font-sans",
                            "font-display",
                            "font-mono",
                            "font-serif",
                          ] as FontOption[]
                        ).map((f) => (
                          <button
                            key={f}
                            onClick={() => setHeadlineFont(f)}
                            className={cn(
                              "py-2 rounded-lg text-[9px] font-bold border transition-all",
                              headlineFont === f
                                ? "bg-white text-black border-white"
                                : "bg-transparent text-white/55 border-white/10 hover:border-white/30",
                            )}
                          >
                            {f.split("-")[1].toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-10 shrink-0">
                          Size
                        </span>
                        <input
                          type="range"
                          min="20"
                          max="120"
                          value={headlineSize}
                          onChange={(e) =>
                            setHeadlineSize(parseInt(e.target.value))
                          }
                          className="flex-1 accent-nfl-red"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {headlineSize}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10">
                          {(["left", "center", "right"] as const).map((a) => {
                            const Icon =
                              a === "left"
                                ? AlignLeft
                                : a === "center"
                                  ? AlignCenter
                                  : AlignRight;
                            return (
                              <button
                                key={a}
                                onClick={() => setHeadlineAlign(a)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  headlineAlign === a
                                    ? "bg-white text-black"
                                    : "text-white/35 hover:text-white",
                                )}
                              >
                                <Icon size={13} />
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10">
                          <button
                            onClick={() => setHeadlineItalic(!headlineItalic)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              headlineItalic
                                ? "bg-white text-black"
                                : "text-white/35 hover:text-white",
                            )}
                          >
                            <Italic size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setHeadlineUppercase(!headlineUppercase)
                            }
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              headlineUppercase
                                ? "bg-white text-black"
                                : "text-white/35 hover:text-white",
                            )}
                          >
                            <CaseUpper size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-10 shrink-0">
                          Letra
                        </span>
                        <input
                          type="range"
                          min="-1"
                          max="12"
                          value={headlineLetterSpacing}
                          onChange={(e) =>
                            setHeadlineLetterSpacing(parseInt(e.target.value))
                          }
                          className="flex-1 accent-nfl-red"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {headlineLetterSpacing}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-10 shrink-0">
                          Word
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={headlineWordSpacing}
                          onChange={(e) =>
                            setHeadlineWordSpacing(parseInt(e.target.value))
                          }
                          className="flex-1 accent-nfl-red"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {headlineWordSpacing}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-10 shrink-0">
                          Margem
                        </span>
                        <input
                          type="range"
                          min="8"
                          max="80"
                          value={textMargin}
                          onChange={(e) =>
                            setTextMargin(parseInt(e.target.value))
                          }
                          className="flex-1 accent-nfl-red"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {textMargin}px
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* Badge */}
                  <details className="group">
                    <SectionHeader label="Badge / Status" />
                    <div className="px-4 pb-4 space-y-3 mt-5">
                      <input
                        type="text"
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-black uppercase text-sm focus:border-white/30 outline-none"
                        placeholder="Texto do badge (ex. BREAKING)"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-10 shrink-0">
                          Size
                        </span>
                        <input
                          type="range"
                          min="10"
                          max="150"
                          value={badgeSize}
                          onChange={(e) =>
                            setBadgeSize(parseInt(e.target.value))
                          }
                          className="flex-1 accent-white/60"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {badgeSize}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-10 shrink-0">
                          Skew
                        </span>
                        <input
                          type="range"
                          min="-30"
                          max="30"
                          value={badgeSkew}
                          onChange={(e) =>
                            setBadgeSkew(parseInt(e.target.value))
                          }
                          className="flex-1 accent-white/60"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {badgeSkew}°
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* Especiais condicionais */}
                  {activeStyle === "CHOP_STYLE" && (
                    <div className="px-4 py-3 space-y-2 mt-5">
                      <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block">
                        Jogador dispensado
                      </label>
                      <input
                        type="text"
                        value={releasedPlayerName}
                        onChange={(e) => setReleasedPlayerName(e.target.value)}
                        placeholder="Ex.: Jonathan Allen"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:border-white/30 outline-none"
                      />
                    </div>
                  )}
                  {activeStyle === "RUMORS" && (
                    <div className="px-4 py-3 space-y-2 mt-5">
                      <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block">
                        Faixa lateral
                      </label>
                      <input
                        type="text"
                        value={rumorsLabel}
                        onChange={(e) => setRumorsLabel(e.target.value)}
                        placeholder="Ex.: RUMORS, REPORT, INSIDER"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:border-white/30 outline-none"
                      />
                    </div>
                  )}
                  {activeStyle === "TOP_HEADLINE" && (
                    <div className="px-4 py-3 space-y-2 mt-5">
                      <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block">
                        Top headline – linha 1
                      </label>
                      <input
                        type="text"
                        value={topHeadlinePrimary}
                        onChange={(e) => setTopHeadlinePrimary(e.target.value)}
                        placeholder="Ex.: THE RUNNING BACK"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:border-white/30 outline-none"
                      />
                      <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block">
                        Top headline – linha 2 (destaque colorido)
                      </label>
                      <input
                        type="text"
                        value={topHeadlineSecondary}
                        onChange={(e) =>
                          setTopHeadlineSecondary(e.target.value)
                        }
                        placeholder="Ex.: WE NEED"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:border-white/30 outline-none"
                      />
                    </div>
                  )}

                  {/* Conteúdo */}
                  <details open className="group">
                    <SectionHeader label="Conteúdo" />
                    <div className="px-4 pb-4 space-y-3 mt-5">
                      <textarea
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold text-sm focus:border-white/30 outline-none min-h-[68px] resize-none"
                        placeholder="Headline"
                      />
                      <textarea
                        value={subtext}
                        onChange={(e) => setSubtext(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white/55 text-sm focus:border-white/30 outline-none min-h-[52px] resize-none"
                        placeholder="Subtext / Descrição"
                        maxLength={500}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] w-14 shrink-0">
                          Sub size
                        </span>
                        <input
                          type="range"
                          min="5"
                          max="32"
                          value={subtextSize}
                          onChange={(e) =>
                            setSubtextSize(parseInt(e.target.value))
                          }
                          className="flex-1 accent-white/40"
                        />
                        <span className="text-white/40 text-[10px] w-8 text-right shrink-0 tabular-nums">
                          {subtextSize}px
                        </span>
                      </div>
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                          Imagem épica (Replicate)
                        </p>
                        <p className="text-white/35 text-[10px] leading-relaxed">
                          Usa a foto da notícia + texto (headline e conteúdo)
                          para montar um prompt por tipo de notícia (troca,
                          contrato, draft, etc.). Com{" "}
                          <strong className="text-white/50">OpenAI</strong> o
                          prompt fica mais preciso; sem ela, usa regras
                          automáticas.{" "}
                          <strong className="text-white/50">Cloudinary</strong>{" "}
                          ajuda quando a ESPN bloqueia hotlink para o Replicate.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={generateEpicHeroImage}
                            disabled={
                              isGeneratingEpicImage ||
                              isGeneratingEpicVariations
                            }
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-100 text-xs font-bold hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingEpicImage ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Sparkles size={14} />
                            )}
                            {isGeneratingEpicImage
                              ? "Gerando…"
                              : "1 imagem épica"}
                          </button>
                          <button
                            type="button"
                            onClick={() => generateEpicImageVariations(3)}
                            disabled={
                              isGeneratingEpicImage ||
                              isGeneratingEpicVariations
                            }
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 border border-purple-400/35 text-purple-100 text-xs font-bold hover:bg-purple-500/25 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingEpicVariations ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Sparkles size={14} />
                            )}
                            {isGeneratingEpicVariations
                              ? "Gerando variações…"
                              : "3 variações"}
                          </button>
                        </div>
                        {replicateHeroImageUrl && (
                          <div className="flex flex-col gap-2">
                            {epicImageCategory && (
                              <p className="text-white/40 text-[10px]">
                                Categoria detectada:{" "}
                                <span className="text-white/60 font-mono">
                                  {epicImageCategory}
                                </span>
                              </p>
                            )}
                            {epicVariationUrls.length > 0 && (
                              <p className="text-white/35 text-[10px]">
                                Variações prontas: {epicVariationUrls.length}{" "}
                                {fetchedContentImageUrls.length >= 2
                                  ? "· carrossel ativo"
                                  : ""}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setReplicateHeroImageUrl(null);
                                setEpicImageCategory(null);
                                setEpicVariationUrls([]);
                              }}
                              className="w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-white/5 border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              Voltar à imagem original
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {rightPanelTab === "instagram" && (
                <div className="p-4 space-y-4">
                  <p className="text-white/35 text-[10px] leading-relaxed">
                    <strong className="text-white/60">Feed:</strong> 1:1 ou 4:5
                    &nbsp;·&nbsp;
                    <strong className="text-white/60">Reels:</strong> 4:5
                    &nbsp;·&nbsp;
                    <strong className="text-white/60">Stories:</strong> 9:16
                    (Stories exportado em 1080×1920 px automático)
                  </p>

                  {/* Destino */}
                  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPublishDestination("feed")}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5",
                        publishDestination === "feed"
                          ? "bg-white text-black"
                          : "text-white/45 hover:text-white",
                      )}
                    >
                      <ImageIcon size={12} /> Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishDestination("reels")}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5",
                        publishDestination === "reels"
                          ? "bg-white text-black"
                          : "text-white/45 hover:text-white",
                      )}
                    >
                      <Zap size={12} /> Reels
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishDestination("stories")}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5",
                        publishDestination === "stories"
                          ? "bg-white text-black"
                          : "text-white/45 hover:text-white",
                      )}
                    >
                      <Send size={12} /> Stories
                    </button>
                  </div>

                  {(publishDestination === "feed" ||
                    publishDestination === "reels") && (
                    <>
                      {/* ESPN URL */}
                      <div className="space-y-2">
                        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block">
                          Buscar conteúdo ESPN
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={espnUrlInput}
                            onChange={(e) => setEspnUrlInput(e.target.value)}
                            placeholder="Cole a URL da notícia ESPN"
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-white/25 focus:border-white/30 outline-none"
                          />
                          <button
                            type="button"
                            onClick={fetchContentFromEspn}
                            disabled={isFetchingContent}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {isFetchingContent ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              "Buscar"
                            )}
                          </button>
                        </div>
                        {fullArticleContent.length > 0 && (
                          <p className="text-emerald-400/80 text-[10px]">
                            {fullArticleContent.length} caracteres carregados
                          </p>
                        )}
                      </div>

                      {/* Carousel thumbnails */}
                      {publishDestination === "feed" &&
                        fetchedContentImageUrls.length >= 2 && (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={publishAsCarousel}
                                onChange={(e) =>
                                  setPublishAsCarousel(e.target.checked)
                                }
                                className="rounded border-white/30 bg-black/40 text-pink-500"
                              />
                              <span className="text-white/65 text-xs">
                                Carrossel ({fetchedContentImageUrls.length}{" "}
                                imagens)
                              </span>
                            </label>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                              {fetchedContentImageUrls.map((url, i) => (
                                <div
                                  key={`${url}-${i}`}
                                  className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/20 bg-black/40 group"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeCarouselImage(i);
                                    }}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} strokeWidth={2.5} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {publishDestination === "feed" ||
                      publishDestination === "reels" ? (
                        <>
                          {/* AI caption */}
                          <button
                            type="button"
                            onClick={generateCaptionWithAI}
                            disabled={isGeneratingCaption}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-white text-xs font-bold hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingCaption ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Sparkles size={13} />
                            )}
                            Gerar legenda com IA
                          </button>
                          <textarea
                            value={captionForInstagram}
                            onChange={(e) =>
                              setCaptionForInstagram(e.target.value)
                            }
                            placeholder={
                              publishDestination === "reels"
                                ? "Legenda do Reels (máx. 2.200 caracteres)"
                                : "Legenda do post (ou use IA acima)"
                            }
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs placeholder:text-white/25 focus:border-white/30 outline-none min-h-[80px] resize-y"
                            rows={12}
                          />
                        </>
                      ) : null}
                    </>
                  )}

                  {!hasInstagramConfig() && (
                    <p className="text-amber-400/80 text-xs bg-amber-400/8 border border-amber-400/20 rounded-xl px-3 py-2.5">
                      Configure em Perfil &gt; Instagram (token + ID da conta).
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={publishToInstagram}
                    disabled={isPublishing || !hasInstagramConfig()}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold uppercase transition-all",
                      hasInstagramConfig()
                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90 disabled:opacity-50"
                        : "bg-white/10 text-white/35 cursor-not-allowed",
                    )}
                  >
                    {isPublishing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {isPublishing ? "Publicando..." : "Publicar no Instagram"}
                  </button>
                  {publishAsCarousel && fetchedContentImageUrls.length >= 2 && (
                    <button
                      type="button"
                      onClick={debugCaptureCarouselTemplate}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-zinc-800/60 border border-amber-400/40 text-amber-200 hover:bg-zinc-800 transition-colors"
                    >
                      <Bug size={14} />
                      Debug: testar captura do carrossel (sem publicar)
                    </button>
                  )}

                  {(debugTemplateDataUrl || debugTemplateImageUrl) && (
                    <div className="mt-3 space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5">
                      <p className="text-[10px] font-semibold text-amber-100 uppercase tracking-widest">
                        Debug do template (carrossel)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {debugTemplateDataUrl && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-amber-100/80">
                              Preview local (data URL)
                            </p>
                            <div className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/40">
                              <img
                                src={debugTemplateDataUrl}
                                alt="Debug template local"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                        {debugTemplateImageUrl && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-amber-100/80">
                              Preview Cloudinary (primeira imagem)
                            </p>
                            <div className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/40">
                              <img
                                src={debugTemplateImageUrl}
                                alt="Debug template na Cloudinary"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {publishMessage && (
          <motion.div
            key="publish-toast"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 right-6 z-60 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg ring-1 text-sm font-medium",
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
};
