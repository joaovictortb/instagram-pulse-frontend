"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  MoreVertical,
  Reply,
  ThumbsUp,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import { apiFetchJson } from "@/src/lib/api";
import { useMemo, useState } from "react";

type SentimentFilter =
  | "Todos"
  | "Positivos"
  | "Perguntas"
  | "Neutros"
  | "Negativos"
  | "Spam";

type SentimentBucket = Exclude<SentimentFilter, "Todos">;

type IgComment = {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  post_thumb?: string;
  post_id?: string;
  post_caption?: string;
};

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<SentimentFilter>("Todos");
  /** Rascunho de resposta por id do comentário */
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  /** Qual card está com painel de resposta aberto */
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const { data: comments, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["instagram-comments"],
    queryFn: () => apiFetchJson<IgComment[]>("/api/instagram/comments"),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const list = (comments || []) as IgComment[];

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

  const generateMutation = useMutation({
    mutationFn: async (c: IgComment) => {
      const data = await apiFetchJson<{ ok?: boolean; reply?: string }>(
        "/api/ai/comment-reply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commentText: c.text || "",
            username: c.username || "user",
            postCaption: c.post_caption || undefined,
          }),
        },
      );
      return data.reply ?? "";
    },
    onSuccess: (text, c) => {
      setReplyDrafts((prev) => ({ ...prev, [c.id]: text }));
      setToast({ type: "ok", text: "Rascunho gerado com IA. Revise antes de publicar." });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (e: Error) => {
      setToast({ type: "err", text: e.message || "Erro na IA" });
      setTimeout(() => setToast(null), 6000);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      commentId,
      message,
    }: {
      commentId: string;
      message: string;
    }) => {
      return apiFetchJson("/api/instagram/comments/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, message }),
      });
    },
    onSuccess: (_, { commentId }) => {
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      setOpenReplyId(null);
      void queryClient.invalidateQueries({ queryKey: ["instagram-comments"] });
      setToast({ type: "ok", text: "Resposta publicada no Instagram." });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (e: Error) => {
      setToast({ type: "err", text: e.message || "Erro ao responder" });
      setTimeout(() => setToast(null), 6000);
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Central de comentários</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Comentários de todos os posts (paginação até 2000 mídias na API). Gere
            rascunho com IA e publique a resposta oficial.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs font-bold text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Atualizar
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold">
            <Clock size={14} />
            {list.length} NA API · {filtered.length} VISÍVEIS
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium",
            toast.type === "ok"
              ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
              : "bg-red-500/15 text-red-200 border border-red-500/30",
          )}
        >
          {toast.text}
        </div>
      )}

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
                        : "hover:bg-zinc-800 text-zinc-400",
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
                Classificação local (palavras-chave). A IA usa{" "}
                <code className="text-zinc-500">OPENAI_API_KEY</code> na API para
                responder.
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
              filtered.map((comment: IgComment) => {
                const open = openReplyId === comment.id;
                const draft = replyDrafts[comment.id] ?? "";
                const busyGen =
                  generateMutation.isPending &&
                  generateMutation.variables?.id === comment.id;
                const busySend =
                  replyMutation.isPending &&
                  replyMutation.variables?.commentId === comment.id;

                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 flex gap-4 hover:border-brand-primary/30 transition-all group flex-col sm:flex-row"
                  >
                    <div className="flex gap-4 w-full">
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
                              {new Date(comment.timestamp).toLocaleString(
                                "pt-BR",
                              )}
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
                            onClick={() =>
                              setOpenReplyId((id) =>
                                id === comment.id ? null : comment.id,
                              )
                            }
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-bold transition-colors",
                              open
                                ? "text-brand-primary"
                                : "text-zinc-500 hover:text-brand-primary",
                            )}
                          >
                            <Reply size={14} />
                            {open ? "Fechar" : "RESPONDER"}
                          </button>
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 cursor-not-allowed"
                            title="A Instagram Graph API não oferece endpoint para curtir comentários. Curta no app Instagram."
                            role="note"
                          >
                            <ThumbsUp size={14} />
                            CURTIR
                          </span>
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 cursor-not-allowed"
                            title="Denúncia só pelo app Instagram; não há API pública para isto."
                            role="note"
                          >
                            <AlertCircle size={14} />
                            DENUNCIAR
                          </span>
                        </div>

                        {open && (
                          <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Sua resposta (publica no Instagram)
                            </label>
                            <textarea
                              value={draft}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment.id]: e.target.value,
                                }))
                              }
                              placeholder="Gere com IA ou escreva aqui…"
                              rows={3}
                              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:ring-1 ring-brand-primary resize-y min-h-[72px]"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={busyGen}
                                onClick={() => generateMutation.mutate(comment)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-bold hover:bg-violet-500/30 disabled:opacity-50"
                              >
                                {busyGen ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Sparkles size={14} />
                                )}
                                Gerar com IA
                              </button>
                              <button
                                type="button"
                                disabled={busySend || !draft.trim()}
                                onClick={() =>
                                  replyMutation.mutate({
                                    commentId: comment.id,
                                    message: draft.trim(),
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-primary/90 text-black text-xs font-bold hover:bg-brand-primary disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {busySend ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Send size={14} />
                                )}
                                Publicar resposta
                              </button>
                            </div>
                            <p className="text-[10px] text-zinc-600">
                              Exige permissão{" "}
                              <code className="text-zinc-500">
                                instagram_manage_comments
                              </code>{" "}
                              no token Meta.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-dashboard-border self-start">
                        <img
                          src={comment.post_thumb}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })
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
