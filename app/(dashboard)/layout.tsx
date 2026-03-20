"use client";

import { useUIStore } from "@/src/store/ui";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "motion/react";
import { Outlet } from "react-router-dom";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="flex min-h-screen bg-dashboard-bg">
      <Sidebar />
      <motion.main
        initial={false}
        animate={{ marginLeft: isSidebarOpen ? 260 : 80 }}
        className="flex-1 transition-all duration-300"
      >
        <header className="h-16 border-b border-dashboard-border bg-dashboard-bg/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full text-xs font-medium text-zinc-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </div>
            <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
              Generate Report
            </button>
          </div>
        </header>
        <div className="p-8">
          {children || <Outlet />}
        </div>
      </motion.main>
    </div>
  );
}
