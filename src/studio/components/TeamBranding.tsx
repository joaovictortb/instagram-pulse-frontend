import React from "react";
import type { TeamBrand } from "../lib/teamColors";
import { cn } from "../lib/utils";
import { useHideTeamLogo } from "../context/HideLogoContext";

interface TeamBrandingProps {
  team: TeamBrand;
  /** Tamanho do container (ex: w-12 h-12, w-24 h-24). */
  className?: string;
  /** Tamanho em px (sobrescreve w/h do className quando passado). */
  style?: React.CSSProperties;
  /** Estilo do container: circle ou rounded box. */
  variant?: "circle" | "rounded";
  /** Tamanho do texto das iniciais quando não há logo. */
  initialsSize?: "xs" | "sm" | "md" | "lg" | "xl";
}

const initialsSizes = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

/**
 * Exibe logo do time ou iniciais como fallback. Usado nos templates de post.
 */
export function TeamBranding({
  team,
  className,
  style: styleProp,
  variant = "circle",
  initialsSize = "sm",
}: TeamBrandingProps) {
  const { hideTeamLogo } = useHideTeamLogo();
  if (hideTeamLogo) {
    return null;
  }
  const shape = variant === "circle" ? "rounded-full" : "rounded-2xl";
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden shrink-0",
        shape,
        className,
      )}
      style={{ borderColor: `${team.primary}40`, ...styleProp }}
    >
      {team.logo ? (
        <img
          src={team.logo}
          alt={team.name}
          className="w-full h-full object-contain p-0.5"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className={cn(
            "font-black uppercase tracking-tighter text-white",
            initialsSizes[initialsSize],
          )}
          style={{ textShadow: "0 0 20px rgba(0,0,0,0.5)" }}
        >
          {team.initials}
        </span>
      )}
    </div>
  );
}
