import React, { useState, useEffect, useCallback } from "react";
import { ChevronRight, Loader2, Instagram, Stethoscope, Calendar } from "lucide-react";
import { getNflTeamsByDivision, type TeamForPage, type DivisionGroup } from "../lib/nfl-teams-by-division";
import { fetchNflTeams, type EspnTeamInfo } from "../services/espnTeams";
import { fetchTeamInjuries } from "../services/espnInjuries";
import { fetchNextGameForTeam } from "../services/espnTeams";
import type { EditorData } from "../types/editorData";
import { cn } from "../lib/utils";

const DIVISION_LABEL_EN: Record<string, string> = {
  East: "East",
  North: "North",
  South: "South",
  West: "West",
};


function teamToEspnInfo(team: TeamForPage, espnId: string): EspnTeamInfo {
  return {
    id: espnId,
    displayName: team.name,
    abbreviation: team.abbreviation,
    logo: team.logo,
  };
}

interface TeamCardProps {
  key?: React.Key;
  team: TeamForPage;
  espnId: string | null;
  onCreatePostWithData: (data: EditorData) => void;
}

function TeamCard({ team, espnId, onCreatePostWithData }: TeamCardProps) {
  const power = 80 + (team.abbreviation.charCodeAt(0) % 20);
  const [injuriesLoading, setInjuriesLoading] = useState(false);
  const [nextGameLoading, setNextGameLoading] = useState(false);

  const handleInjuries = useCallback(async () => {
    if (!espnId) return;
    setInjuriesLoading(true);
    try {
      const injuries = await fetchTeamInjuries(espnId);
      onCreatePostWithData({
        type: "injuries",
        team: teamToEspnInfo(team, espnId),
        injuries,
      });
    } catch {
      // error already handled by empty array from service
      onCreatePostWithData({
        type: "injuries",
        team: teamToEspnInfo(team, espnId),
        injuries: [],
      });
    } finally {
      setInjuriesLoading(false);
    }
  }, [espnId, team, onCreatePostWithData]);

  const handleNextGame = useCallback(async () => {
    if (!espnId) return;
    setNextGameLoading(true);
    try {
      const result = await fetchNextGameForTeam(espnId);
      if (result) onCreatePostWithData({ type: "next_game", team: result.team, game: result.game });
    } finally {
      setNextGameLoading(false);
    }
  }, [espnId, onCreatePostWithData]);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden border-2 transition-all hover:scale-[1.02] hover:border-white/30 flex flex-col"
      style={{
        borderColor: `${team.primary}60`,
        background: `linear-gradient(180deg, ${team.primary}15 0%, transparent 50%)`,
      }}
    >
      <a
        href={team.espnUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center text-center flex-1 pt-6 pb-2"
      >
        <div
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center text-xs font-black text-white rounded-md"
          style={{ backgroundColor: team.primary }}
        >
          {power}
        </div>
        <div
          className="absolute top-4 right-4 px-2 py-1 rounded-lg text-[10px] font-black uppercase text-white"
          style={{ backgroundColor: team.primary }}
        >
          {team.abbreviation}
        </div>
        <div className="flex-1 flex items-center justify-center pt-6 pb-2">
          <img
            src={team.logo}
            alt={team.name}
            className="w-24 h-24 object-contain group-hover:scale-110 transition-transform"
            referrerPolicy="no-referrer"
          />
        </div>
        <h3 className="text-white font-black uppercase tracking-tight text-lg mb-3">
          {team.name.split(" ").pop()}
        </h3>
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white border"
            style={{ borderColor: team.primary }}
          >
            {team.conference}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white border"
            style={{ borderColor: team.primary }}
          >
            {DIVISION_LABEL_EN[team.division] ?? team.division}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-white/80 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
          Ver perfil
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </a>
      {espnId && (
        <div className="p-3 flex flex-col gap-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleNextGame}
            disabled={nextGameLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold uppercase transition-colors",
              "bg-white/10 hover:bg-white/20 text-white disabled:opacity-50",
            )}
          >
            {nextGameLoading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
            Próximo jogo
          </button>
          <button
            type="button"
            onClick={handleInjuries}
            disabled={injuriesLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold uppercase transition-colors",
              "bg-nfl-red/80 hover:bg-nfl-red text-white disabled:opacity-50",
            )}
          >
            {injuriesLoading ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
            Lesões
          </button>
        </div>
      )}
    </div>
  );
}

interface TeamsPageProps {
  onCreatePostWithData?: (data: EditorData) => void;
}

export function TeamsPage({ onCreatePostWithData }: TeamsPageProps) {
  const divisions = getNflTeamsByDivision();
  const [abbrevToId, setAbbrevToId] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetchNflTeams()
      .then((teams) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        teams.forEach((t) => {
          map[t.abbreviation] = t.id;
        });
        if (map["JAC"]) map["JAX"] = map["JAC"];
        if (map["WSH"]) map["WAS"] = map["WSH"];
        setAbbrevToId(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const getEspnId = useCallback(
    (abbreviation: string): string | null => abbrevToId[abbreviation] ?? null,
    [abbrevToId],
  );

  return (
    <section className="space-y-14">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-1">
          Times NFL
        </h1>
        <p className="text-white/50 text-sm">
          Agrupados por divisão. Use &quot;Próximo jogo&quot; ou &quot;Lesões&quot; para criar post.
        </p>
      </div>
      {divisions.map((group: DivisionGroup) => (
        <div key={`${group.conference}-${group.division}`} className="space-y-6">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-0.5">
              {group.labelPt}
            </p>
            <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: "#E31837" }}>
              {group.labelEn}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {group.teams.map((team) => (
              <TeamCard
                key={team.abbreviation}
                team={team}
                espnId={getEspnId(team.abbreviation)}
                onCreatePostWithData={onCreatePostWithData ?? (() => {})}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
