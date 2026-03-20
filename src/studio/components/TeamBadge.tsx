import React from "react";
import type { ArticleTeam } from "../services/newsService";

interface TeamBadgeProps {
  team?: ArticleTeam;
  fallbackLabel: string;
}

export function TeamBadge({ team, fallbackLabel }: TeamBadgeProps) {
  const label = team?.name ?? fallbackLabel;

  const normalizeColor = (value?: string | null) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // Se já vier com #, mantém
    if (trimmed.startsWith("#")) return trimmed;
    // Se for um hex curto/longo, prefixa com #
    if (/^[0-9a-fA-F]{3,8}$/.test(trimmed)) {
      return `#${trimmed}`;
    }
    return trimmed;
  };

  const primary = normalizeColor(team?.primaryColor) ?? "rgba(0,0,0,0.6)";
  const secondary = normalizeColor(team?.secondaryColor) ?? "#ffffff";

  // Estilo inspirado no badge da imagem: pílula, logo à esquerda e nome completo
  return (
    <div
      className="inline-flex items-center gap-2 px-3 rounded-full shadow-xl"
      style={{
        background:
          team?.primaryColor && team?.secondaryColor
            ? `linear-gradient(135deg, ${primary})`
            : primary,
      }}
    >
      {team?.logo && (
        <div className="w-7 h-7 rounded-full overflow-hidde flex items-center justify-center shrink-0">
          <img
            src={team.logo}
            alt={team.name ?? "Logo do time"}
            className="w-7 h-7 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <span className="text-[11px] font-semibold text-white whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
