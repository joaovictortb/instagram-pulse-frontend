/**
 * URL do app NFL Blog (Next) para rotas como legenda com IA — ou origem atual.
 * Use VITE_NFL_BLOG_URL_STUDIO ou VITE_NFL_BLOG_URL.
 */
import { envStudio } from "./env-studio";

export function getNflBlogApiUrl(): string {
  const url = envStudio("VITE_NFL_BLOG_URL_STUDIO", "VITE_NFL_BLOG_URL");
  if (url) return url;
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  return "";
}
