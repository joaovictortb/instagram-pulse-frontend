import React from "react";
import { Flame } from "lucide-react";
import { NewsCard } from "./NewsCard";
import type { Article } from "../services/newsService";

interface NewsGridProps {
  articles: Article[];
  onGeneratePost: (article: Article) => void;
  onGenerateCarousel?: (article: Article) => void;
  onViewAll?: () => void;
}

/** Lista de notícias a partir do 6º artigo (os 5 primeiros vão para o hero). */
export function NewsGrid({ articles, onGeneratePost, onGenerateCarousel, onViewAll }: NewsGridProps) {
  const gridArticles = articles.slice(5);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
          <Flame className="text-nfl-red" />
          Notícias Recentes
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="cursor-pointer text-sm font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
        >
          Ver todas
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {gridArticles.map((article, idx) => (
          <NewsCard
            key={`${article.dataSourceIdentifier}-${idx}`}
            article={article}
            index={idx}
            onGeneratePost={onGeneratePost}
            onGenerateCarousel={onGenerateCarousel}
          />
        ))}
      </div>
    </section>
  );
}
