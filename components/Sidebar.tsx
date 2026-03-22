"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Cpu,
  CalendarRange,
  Clapperboard,
  Instagram,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { useUIStore } from "@/src/store/ui";
import { motion } from "motion/react";
import { useAuth } from "../src/components/AuthProvider";

type NavItem = { name: string; href: string; icon: LucideIcon };

const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [
      { name: "Painel", href: "/dashboard", icon: LayoutDashboard },
      { name: "Análise", href: "/analytics", icon: BarChart3 },
      { name: "Conteúdo", href: "/content", icon: ImageIcon },
      { name: "Comentários", href: "/comments", icon: MessageSquare },
      { name: "Público", href: "/audience", icon: Users },
    ],
  },
  {
    id: "growth",
    label: "Crescimento",
    items: [
      { name: "Crescimento IA", href: "/growth-ai", icon: Zap },
      { name: "Plano 7 dias", href: "/growth-plan", icon: CalendarRange },
    ],
  },
  {
    id: "tools",
    label: "Ferramentas",
    items: [
      { name: "Orquestrador", href: "/orchestrator", icon: Cpu },
      { name: "Studio", href: "/studio", icon: Clapperboard },
      { name: "Instagram", href: "/instagram-connect", icon: Instagram },
      {
        name: "YouTube → IG",
        href: "/youtube-import",
        icon: Youtube,
      },
    ],
  },
  {
    id: "account",
    label: "Conta",
    items: [{ name: "Configurações", href: "/settings", icon: Settings }],
  },
];

const SIDEBAR_EXPANDED = 272;
const SIDEBAR_COLLAPSED = 80;

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { displayName, photoURL, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("[auth] logout", e);
    }
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
      transition={{ type: "spring", stiffness: 380, damping: 35 }}
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-zinc-950/95 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.45)] backdrop-blur-xl",
      )}
    >
      {/* Cabeçalho / marca */}
      <div className="flex h-[4.25rem] shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3">
        <Link
          to="/dashboard"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl outline-none ring-brand-primary/40 transition-opacity hover:opacity-90 focus-visible:ring-2"
          title="InstaPulse — início"
        >
          {isSidebarOpen ? (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary via-brand-accent to-brand-secondary shadow-lg shadow-brand-primary/20">
                <span className="font-display text-sm font-bold tracking-tight text-white">
                  IP
                </span>
              </div>
              <div className="min-w-0 leading-tight">
                <span className="block truncate font-display text-lg font-bold tracking-tight text-white">
                  InstaPulse
                </span>
                <span className="block truncate text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Analytics & conteúdo
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary via-brand-accent to-brand-secondary shadow-lg shadow-brand-primary/25">
              <span className="font-display text-sm font-bold text-white">
                IP
              </span>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Recolher menu" : "Expandir menu"}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition-colors hover:border-white/15 hover:bg-white/[0.07] hover:text-white",
            !isSidebarOpen && "h-8 w-8",
          )}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Navegação */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(63,63,70,0.6)_transparent]"
        aria-label="Navegação principal"
      >
        <div className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              {isSidebarOpen && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-2 transition-all duration-200",
                          isSidebarOpen
                            ? "justify-start"
                            : "justify-center px-0",
                          isActive
                            ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                        )}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-primary to-brand-accent"
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                            isActive
                              ? "border-brand-primary/35 bg-brand-primary/15 text-brand-primary"
                              : "border-white/[0.06] bg-white/[0.03] text-zinc-500 group-hover:border-white/10 group-hover:text-zinc-300",
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        {isSidebarOpen && (
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {item.name}
                          </span>
                        )}

                        {/* Tooltip modo recolhido */}
                        {!isSidebarOpen && (
                          <span
                            className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                            role="tooltip"
                          >
                            {item.name}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Rodapé — utilizador */}
      <div className="shrink-0 space-y-3 border-t border-white/[0.06] bg-zinc-950/80 p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5",
            !isSidebarOpen && "justify-center p-2",
          )}
        >
          <div className="relative h-10 w-10 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-accent to-brand-secondary p-[2px]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-zinc-950">
                <img
                  src={photoURL || "https://picsum.photos/seed/user/100"}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
          {isSidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {displayName || "Utilizador"}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                Plano Business
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(
            "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent py-2.5 text-sm font-medium text-rose-400 transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300",
            isSidebarOpen ? "px-3" : "justify-center px-0",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          {isSidebarOpen && <span>Sair</span>}
          {!isSidebarOpen && (
            <span
              className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
              role="tooltip"
            >
              Sair
            </span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
