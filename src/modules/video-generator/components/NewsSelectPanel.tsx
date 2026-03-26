import { useMemo, useState } from "react";
import { Search, Image as ImageIcon, Clock } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useNewsList, type Article } from "../hooks/useNewsList";

export function NewsSelectPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (article: Article) => void;
}) {
  const { data, isLoading, isError } = useNewsList(5);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((a) => {
      const hay = `${a.headline} ${a.description} ${(a.categories || [])
        .map((c) => c.description)
        .join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [data, q]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          size={16}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar notícia…"
          className="w-full bg-zinc-900 border border-dashboard-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary"
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            Não foi possível carregar as notícias do Supabase.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-zinc-400">
            Nenhuma notícia encontrada.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => {
              const isActive = a.dataSourceIdentifier === selectedId;
              const thumb = a.images?.[0]?.url;
              return (
                <button
                  key={a.dataSourceIdentifier}
                  type="button"
                  onClick={() => onSelect(a)}
                  className={cn(
                    "w-full text-left rounded-2xl border transition-colors overflow-hidden",
                    "bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.06]",
                    isActive &&
                      "border-brand-primary/35 bg-brand-primary/10 shadow-[inset_0_0_0_1px_rgba(225,48,108,0.10)]",
                  )}
                >
                  <div className="flex gap-3 p-3">
                    <div className="h-14 w-16 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-500">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-zinc-100 line-clamp-2">
                        {a.headline}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 line-clamp-2">
                        {a.description || "Sem descrição"}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-600">
                        <Clock size={12} />
                        <span className="tabular-nums">
                          {new Date(a.published).toLocaleDateString("pt-BR")}
                        </span>
                        {a.categories?.[0]?.description && (
                          <>
                            <span className="text-zinc-700">•</span>
                            <span className="truncate">
                              {a.categories[0].description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
