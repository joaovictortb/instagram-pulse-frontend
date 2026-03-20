"use client";

import { Link, useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { 
  LayoutDashboard, 
  BarChart3, 
  Image as ImageIcon, 
  MessageSquare, 
  Users, 
  Zap, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Cpu
} from "lucide-react";
import { useUIStore } from "@/src/store/ui";
import { motion } from "motion/react";
import { useAuth } from "../src/components/FirebaseProvider";

const navItems = [
  { name: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Análise", href: "/analytics", icon: BarChart3 },
  { name: "Conteúdo", href: "/content", icon: ImageIcon },
  { name: "Comentários", href: "/comments", icon: MessageSquare },
  { name: "Público", href: "/audience", icon: Users },
  { name: "Crescimento IA", href: "/growth-ai", icon: Zap },
  { name: "Orquestrador", href: "/orchestrator", icon: Cpu },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 260 : 80 }}
      className="fixed left-0 top-0 h-screen bg-dashboard-card border-r border-dashboard-border z-50 flex flex-col"
    >
      <div className="p-6 flex items-center justify-between">
        {isSidebarOpen && (
          <span className="text-xl font-bold gradient-text">InstaPulse</span>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-brand-primary/10 text-brand-primary" 
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
            >
              <item.icon size={22} className={cn(isActive && "text-brand-primary")} />
              {isSidebarOpen && (
                <span className="font-medium">{item.name}</span>
              )}
              {!isSidebarOpen && (
                <div className="absolute left-20 bg-zinc-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-dashboard-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-accent to-brand-secondary p-[2px]">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/user/100"} 
                alt="User" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.displayName || "Usuário"}</span>
              <span className="text-xs text-zinc-500">Plano Business</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={logout}
          className={cn(
            "flex items-center gap-4 p-3 rounded-xl transition-all text-rose-500 hover:bg-rose-500/10 w-full",
            !isSidebarOpen && "justify-center"
          )}
        >
          <LogOut size={22} />
          {isSidebarOpen && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </motion.aside>
  );
}
