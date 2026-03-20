import React from "react";
import { motion } from "motion/react";
import {
  User,
  Calendar,
  ChevronRight,
  Instagram,
  LayoutGrid,
} from "lucide-react";
import { formatDateTime } from "../lib/utils";
import type { Article } from "../services/newsService";
import { TeamBadge } from "./TeamBadge";

interface NewsCardProps {
  /** Satisfaz TS estrito em JSX com `key` (React 19). */
  key?: React.Key;
  article: Article;
  index: number;
  onGeneratePost: (article: Article) => void;
  onGenerateCarousel?: (article: Article) => void;
}

export function NewsCard({
  article,
  index,
  onGeneratePost,
  onGenerateCarousel,
}: NewsCardProps) {
  const categoryLabel = article.categories?.[0]?.description ?? "NFL";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -10 }}
      className="group relative bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/5 hover:border-nfl-red/30 transition-all"
    >
      <div className="aspect-[16/9] overflow-hidden relative">
        <img
          src={
            article.images?.[0]?.url ??
            "https://picsum.photos/seed/nfl-news/800/450"
          }
          alt=""
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <TeamBadge team={article.team} fallbackLabel={categoryLabel} />
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
          <Calendar size={12} /> {formatDateTime(article.published)}
        </div>
        <h3 className="text-xl font-black uppercase italic leading-tight group-hover:text-nfl-red transition-colors line-clamp-3">
          {article.headline}
        </h3>
        <p className="text-sm text-white/60 line-clamp-5 font-medium">
          {article.description}
        </p>
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (article.sourceUrl) {
                window.open(article.sourceUrl, "_blank", "noopener,noreferrer");
              }
            }}
            className="cursor-pointer text-xs font-black border border-white/10 rounded-xl px-2 py-2 uppercase hover:text-nfl-red tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
          >
            Notícia Original
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onGeneratePost(article)}
            className="cursor-pointer text-xs font-black border border-white/10 rounded-xl px-2 py-2 uppercase hover:text-nfl-red tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
          >
            Gerar Post
            <Instagram
              size={18}
              className="group-hover/btn:scale-110 transition-transform ml-2"
            />
          </button>
          {onGenerateCarousel && (
            <button
              type="button"
              onClick={() => onGenerateCarousel(article)}
              className="cursor-pointer text-xs font-black border border-white/10 rounded-xl px-2 py-2 uppercase hover:text-nfl-blue tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
            >
              Gerar carrossel
              <LayoutGrid
                size={18}
                className="group-hover/btn:scale-110 transition-transform ml-2"
              />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
