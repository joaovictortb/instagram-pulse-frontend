"use client";

import { cn, formatNumber } from "@/src/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ElementType } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: ElementType;
  description?: string;
}

export function MetricCard({ title, value, trend, icon: Icon, description }: MetricCardProps) {
  const isPositive = trend && trend > 0;

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-zinc-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{typeof value === 'number' ? formatNumber(value) : value}</h3>
        {description && <p className="text-xs text-zinc-600 mt-2">{description}</p>}
      </div>
    </div>
  );
}
