import React, { useEffect, useState } from "react";
import {
  Home,
  Newspaper,
  Shield,
  Gamepad2,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

export type NavView = "home" | "news" | "teams" | "games" | "data" | "profile";

interface NavProps {
  currentView?: NavView;
  onNavigate?: (view: NavView) => void;
}

const ITEMS: {
  view: NavView;
  label: string;
  short: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { view: "home", label: "Início", short: "Home", Icon: Home },
  { view: "news", label: "Notícias", short: "News", Icon: Newspaper },
  { view: "teams", label: "Times", short: "Teams", Icon: Shield },
  { view: "games", label: "Jogos", short: "Games", Icon: Gamepad2 },
  { view: "data", label: "Dados", short: "Data", Icon: BarChart3 },
  { view: "profile", label: "Configurações", short: "Perfil", Icon: Settings },
];

export function Nav({ currentView = "home", onNavigate }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function go(view: NavView) {
    onNavigate?.(view);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050508]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[#050508]/75">
      <div className="mx-auto flex h-[3.75rem] items-center justify-between gap-4">
        {/* Marca */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="hidden h-9 w-px shrink-0 rounded-full bg-gradient-to-b from-nfl-red via-white/40 to-nfl-blue sm:block"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
                Studio
                <span className="text-nfl-red"> NFL</span>
              </span>
              <span className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/45 sm:inline">
                Editorial
              </span>
            </div>
            <p className="hidden text-[11px] text-white/35 sm:block">
              Conteúdo e publicação para redes
            </p>
          </div>
        </div>

        {/* Desktop */}
        <nav
          className="hidden md:flex md:items-center md:justify-end"
          aria-label="Secções principais"
        >
          <ul className="flex items-center gap-0.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            {ITEMS.map(({ view, label, Icon }) => {
              const active = currentView === view;
              return (
                <li key={view}>
                  <button
                    type="button"
                    onClick={() => go(view)}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                      active
                        ? "text-white"
                        : "text-white/45 hover:bg-white/[0.06] hover:text-white/85",
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative h-3.5 w-3.5 shrink-0 transition-colors",
                        active
                          ? "text-nfl-red"
                          : "text-white/35 group-hover:text-white/60",
                      )}
                      strokeWidth={2}
                    />
                    <span className="relative">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile trigger */}
        <div className="flex shrink-0 items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-expanded={mobileOpen}
            aria-controls="studio-nav-mobile"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile painel */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="studio-nav-mobile"
            className="fixed inset-x-0 top-[3.75rem] z-50 mx-4 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c10] p-2 shadow-2xl shadow-black/50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navegação"
          >
            <ul className="flex flex-col gap-0.5">
              {ITEMS.map(({ view, label, short, Icon }) => {
                const active = currentView === view;
                return (
                  <li key={view}>
                    <button
                      type="button"
                      onClick={() => go(view)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-white/65 hover:bg-white/[0.05] hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                          active
                            ? "border-nfl-red/40 bg-nfl-red/15 text-nfl-red"
                            : "border-white/10 bg-white/[0.04] text-white/50",
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">
                          {short}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </header>
  );
}
