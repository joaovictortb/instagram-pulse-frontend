/**
 * Montagem do carrossel a partir do artigo (narrativa fixa, sem IA)
 * ou a partir do conteúdo gerado pela IA (textos únicos por slide).
 */

import type { Article } from "../services/newsService";
import type { CarouselSlideItem } from "../types/carousel";
import type {
  GuiaSlidesContent,
  PlayersListContent,
} from "../services/openaiCarousel";

const CTA_TITLE = "FIQUE POR DENTRO";
const CTA_CONTENT = "Siga para mais atualizações da NFL";
const TITLE_SUBTITLE = "NFL BREAKING";
const CONTENT_HEADER = "O QUE VOCÊ PRECISA SABER";
const FALLBACK_IMAGE = "https://picsum.photos/seed/nfl/1080/1080";

export const SLIDE_COUNT_OPTIONS = [4, 5, 6] as const;
export type SlideCountOption = (typeof SLIDE_COUNT_OPTIONS)[number];

/**
 * Retorna uma URL de imagem disponível.
 * Se não houver imagens suficientes, repete o último (via módulo) — mas
 * ao cortar para 4/5/6 a repetição fica mínima.
 */
function getImageUrlByIndex(urls: string[], index: number): string {
  if (urls.length === 0) return FALLBACK_IMAGE;
  return urls[index % urls.length];
}

/**
 * Gera a sequência de slides a partir de um único Article.
 * Narrativa: Capa → O Fato → 3 slides de imagem → CTA.
 * Todas as URLs de imagem disponíveis da notícia são usadas; se forem poucas,
 * repetimos nos slides que faltam. Se não houver nenhuma, usamos um placeholder.
 */
export function generateSlidesFromArticle(
  article: Article,
  slideCount: SlideCountOption = 6,
): CarouselSlideItem[] {
  const headline = article.headline ?? "";
  const description = article.description ?? "";
  const rawImages = (article.images ?? [])
    .map((img) => img?.url)
    .filter((url): url is string => Boolean(url?.trim()));
  const urlsAvailable =
    rawImages.length > 0 ? rawImages : [FALLBACK_IMAGE];

  const slides: CarouselSlideItem[] = [];
  let id = 1;

  // Estrutura fixa: title (1) + content (1) + images (N) + cta (1) => total slideCount
  const imageSlideCount = Math.max(1, slideCount - 3);

  slides.push({
    id: id++,
    type: "title",
    title: headline,
    subtitle: TITLE_SUBTITLE,
    image: urlsAvailable[0],
  });

  slides.push({
    id: id++,
    type: "content",
    title: CONTENT_HEADER,
    content: description,
    image: getImageUrlByIndex(urlsAvailable, 1),
  });

  const detailTitles = ["Ponto chave 1", "Ponto chave 2", "Ponto chave 3"];

  for (let i = 0; i < imageSlideCount; i++) {
    slides.push({
      id: id++,
      type: "image",
      title: detailTitles[i] ?? headline,
      content: description
        ? description.slice(i * 140, (i + 1) * 140)
        : undefined,
      image: getImageUrlByIndex(urlsAvailable, 2 + i),
    });
  }

  slides.push({
    id: id++,
    type: "cta",
    title: CTA_TITLE,
    content: CTA_CONTENT,
    image: getImageUrlByIndex(urlsAvailable, 2 + imageSlideCount),
  });

  return slides;
}

/**
 * Monta os 6 slides a partir do conteúdo gerado pela IA (textos únicos) e das URLs de imagem.
 * As imagens são distribuídas nos slides (repetindo se necessário).
 */
export function buildSlidesFromGuiaContent(
  guia: GuiaSlidesContent,
  imageUrls: string[],
): CarouselSlideItem[] {
  const urls = imageUrls.length > 0 ? imageUrls : [FALLBACK_IMAGE];
  const [s1, s2, s3, s4, s5, s6] = guia.slides;

  return [
    {
      id: 1,
      type: "title",
      title: s1.title,
      subtitle: s1.subtitle,
      image: urls[0],
    },
    {
      id: 2,
      type: "content",
      title: s2.title,
      content: s2.content,
      image: urls[1 % urls.length],
    },
    {
      id: 3,
      type: "image",
      title: s3.title,
      content: s3.content,
      image: urls[2 % urls.length],
    },
    {
      id: 4,
      type: "image",
      title: s4.title,
      content: s4.content,
      image: urls[3 % urls.length],
    },
    {
      id: 5,
      type: "image",
      title: s5.title,
      content: s5.content,
      image: urls[4 % urls.length],
    },
    {
      id: 6,
      type: "cta",
      title: s6.title,
      content: s6.content,
      image: urls[5 % urls.length],
    },
  ];
}

/**
 * Corta os slides do guia (gerados sempre com 6 slots) para respeitar o número desejado.
 * Mantém ordem e garante que CTA continue sendo o último slide.
 */
const GUIA_SLICE_INDICES: Record<SlideCountOption, number[]> = {
  4: [0, 1, 2, 5], // title, content, img1, cta
  5: [0, 1, 2, 3, 5], // title, content, img1, img2, cta
  6: [0, 1, 2, 3, 4, 5], // todos
};

export function sliceSlidesToCount(
  slides: CarouselSlideItem[],
  count: SlideCountOption,
): CarouselSlideItem[] {
  const indices = GUIA_SLICE_INDICES[count];
  if (slides.length <= count) {
    // Re-id para ficar consistente.
    return slides.map((s, i) => ({ ...s, id: i + 1 }));
  }

  return indices
    .filter((i) => i < slides.length)
    .map((i, idx) => ({ ...slides[i], id: idx + 1 }));
}

/**
 * Monta N slides a partir do conteúdo gerado pela IA (players_list).
 * Cada jogador vira 1 slide dedicado, sem limite fixo de 6.
 */
export function buildSlidesFromPlayersList(
  data: PlayersListContent,
  imageUrls: string[],
): CarouselSlideItem[] {
  const urls = imageUrls.length > 0 ? imageUrls : [FALLBACK_IMAGE];
  return data.slides.map((s, i) => ({
    id: i + 1,
    type: s.type === "title" ? "title" : s.type === "cta" ? "cta" : "image",
    title: s.title,
    subtitle: s.subtitle,
    content: s.content,
    image: urls[i % urls.length],
  }));
}
