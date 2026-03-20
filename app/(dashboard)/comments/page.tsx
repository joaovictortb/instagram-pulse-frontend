"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  MoreVertical,
  Reply,
  ThumbsUp,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import { apiFetch, readJsonBody } from "@/src/lib/api";
import { useMemo, useState } from "react";

type SentimentFilter =
  | "Todos"
  | "Positivos"
  | "Perguntas"
  | "Neutros"
  | "Negativos"
  | "Spam";

type SentimentBucket = Exclude<SentimentFilter, "Todos">;

function classifyComment(text: string): SentimentBucket {
  const t = (text || "").toLowerCase();
  if (
    /\b(spam|compra agora|clique aqui|ganhe dinheiro)\b/i.test(text) ||
    (t.length < 3 && /[🎉💰]/.test(text))
  ) {
    return "Spam";
  }
  if (/\?/.test(text)) return "Perguntas";
  if (
    /\b(amei|adorei|lindo|linda|incrível|parabéns|obrigad|❤️|🔥|👏|top)\b/i.test(
      t
    )
  ) {
    return "Positivos";
  }
  if (/\b(ruim|péssimo|horrível|odeio|não gost|decepcion)\b/i.test(t)) {
    return "Negativos";
  }
  return "Neutros";
}

export default function CommentsPage() {
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<SentimentFilter>("Todos");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["instagram-comments"],
    queryFn: async () =>
      readJsonBody(await apiFetch("/api/instagram/comments")),
  });

  const list = (comments || []) as any[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      const text = (c.text || "").toLowerCase();
      const user = (c.username || "").toLowerCase();
      if (q && !text.includes(q) && !user.includes(q)) return false;
      if (sentiment === "Todos") return true;
      return classifyComment(c.text || "") === sentiment;
    });
  }, [list, search, sentiment]);

  const counts = useMemo(() => {
    const buckets: Record<SentimentBucket, number> = {
      Positivos: 0,
      Perguntas: 0,
      Neutros: 0,
      Negativos: 0,
      Spam: 0,
    };
    for (const c of list) {
      buckets[classifyComment(c.text || "")]++;
    }
    return { Todos: list.length, ...buckets } satisfies Record<
      SentimentFilter,
      number
    >;
  }, [list]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Central de comentários</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Comentários dos posts recentes na API Meta. Filtros locais (sem IA).
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold">
          <Clock size={14} />
          {list.length} NA API · {filtered.length} VISÍVEIS
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Filter size={14} />
                Filtro rápido
              </h4>
              <div className="space-y-2">
                {(
                  [
                    "Todos",
                    "Positivos",
                    "Perguntas",
                    "Neutros",
                    "Negativos",
                    "Spam",
                  ] as SentimentFilter[]
                ).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSentiment(f)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                      sentiment === f
                        ? "bg-brand-primary/15 text-brand-primary font-bold"
                        : "hover:bg-zinc-800 text-zinc-400"
                    )}
                  >
                    <span>{f}</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">
                      {counts[f]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-dashboard-border">
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                Classificação heurística (palavras-chave e “?”). Para análise com
                IA, isso pode ser ligado a um endpoint dedicado depois.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar comentários ou @usuário…"
                className="w-full bg-zinc-900 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-zinc-800/50 animate-pulse rounded-xl"
                />
              ))
            ) : filtered.length > 0 ? (
              filtered.map((comment: any) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 flex gap-4 hover:border-brand-primary/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`}
                      alt=""
                    />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-sm truncate">
                          @{comment.username}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 shrink-0">
                          {classifyComment(comment.text || "")}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          •{" "}
                          {new Date(comment.timestamp).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-zinc-600 hover:text-zinc-300 shrink-0"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed break-words">
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-4 pt-2 flex-wrap">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-brand-primary transition-colors"
                      >
                        <Reply size={14} />
                        RESPONDER
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-emerald-500 transition-colors"
                      >
                        <ThumbsUp size={14} />
                        CURTIR
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        <AlertCircle size={14} />
                        DENUNCIAR
                      </button>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-dashboard-border">
                    <img
                      src={comment.post_thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500 glass-card">
                Nenhum comentário corresponde aos filtros.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
