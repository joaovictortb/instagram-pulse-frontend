import { useQuery } from "@tanstack/react-query";
import { fetchNFLNews, type Article } from "@/src/studio/services/newsService";

export function useNewsList(limit = 100) {
  return useQuery({
    queryKey: ["nfl-news", limit],
    queryFn: () => fetchNFLNews(limit),
    staleTime: 60_000,
  });
}

export type { Article };

