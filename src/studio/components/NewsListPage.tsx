import React from "react";
import { Flame } from "lucide-react";
import { NewsCard } from "./NewsCard";
import type { Article } from "../services/newsService";

interface NewsListPageProps {
  articles: Article[];
  onGeneratePost: (article: Article) => void;
  onGenerateCarousel?: (article: Article) => void;
}

/** Página que lista todas as notícias em grid. */
export function NewsListPage({ articles, onGeneratePost, onGenerateCarousel }: NewsListPageProps) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
          <Flame className="text-nfl-red" />
          Todas as notícias
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article, idx) => (
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
