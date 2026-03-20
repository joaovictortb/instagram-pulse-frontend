/**
 * Serviço para calendário e jogos por semana da NFL.
 * Usa o scoreboard por semana (já existente) para "Jogos da semana X".
 * Opcionalmente pode consumir cdn.espn.com para calendário da temporada.
 */

import { fetchScoreboardByWeek, type EspnGame } from "./espnScoreboard";

export interface ScheduleWeek {
  season: number;
  week: number;
  label: string;
  games: EspnGame[];
}

export interface ScheduleCalendarEntry {
  label: string;
  detail?: string;
  value: string;
  startDate: string;
  endDate: string;
}

export interface ScheduleCalendar {
  season: number;
  entries: ScheduleCalendarEntry[];
}

/**
 * Retorna os jogos de uma semana (reutiliza scoreboard).
 */
export async function fetchScheduleWeek(
  season: number,
  week: number
): Promise<ScheduleWeek> {
  const { games } = await fetchScoreboardByWeek(season, week);
  return {
    season,
    week,
    label: `Week ${week}`,
    games,
  };
}

const REGULAR_SEASON_WEEKS = 18;
const PRESEASON_WEEKS = [1, 2, 3, 4];
const POSTSEASON_LABELS = ["Wild Card", "Divisional", "Conference Champ", "Pro Bowl", "Super Bowl"];

/**
 * Retorna entradas do calendário da temporada (semana a semana).
 */
export function getSeasonCalendar(season: number): ScheduleCalendarEntry[] {
  const entries: ScheduleCalendarEntry[] = [];
  for (let w = 1; w <= REGULAR_SEASON_WEEKS; w++) {
    entries.push({
      label: `Week ${w}`,
      detail: `Semana ${w}`,
      value: String(w),
      startDate: "",
      endDate: "",
    });
  }
  POSTSEASON_LABELS.forEach((label, i) => {
    entries.push({
      label,
      value: `post-${i + 1}`,
      startDate: "",
      endDate: "",
    });
  });
  return entries;
}
