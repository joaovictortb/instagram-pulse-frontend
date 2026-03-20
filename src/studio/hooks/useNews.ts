import { useState, useEffect } from "react";
import {
  fetchNFLNewsNotPublishedOnInstagram,
  type Article,
} from "../services/newsService";

const LIMIT = 100;

export function useNews() {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchNFLNewsNotPublishedOnInstagram(LIMIT);
        if (!cancelled) setNews(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          console.error("Erro ao carregar notícias:", e);
          setNews([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { news, loading, hasNews: news.length > 0 };
}
