import React, { createContext, useCallback, useContext, useState } from "react";

const STORAGE_KEY = "nfl-studio-hide-team-logo";

function readInitial(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

interface HideLogoContextValue {
  hideTeamLogo: boolean;
  setHideTeamLogo: (value: boolean) => void;
}

const HideLogoContext = createContext<HideLogoContextValue | null>(null);

export function HideLogoProvider({ children }: { children: React.ReactNode }) {
  const [hideTeamLogo, setState] = useState(readInitial);
  const setHideTeamLogo = useCallback((value: boolean) => {
    setState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {}
  }, []);
  return (
    <HideLogoContext.Provider value={{ hideTeamLogo, setHideTeamLogo }}>
      {children}
    </HideLogoContext.Provider>
  );
}

export function useHideTeamLogo(): HideLogoContextValue {
  const ctx = useContext(HideLogoContext);
  if (!ctx) {
    return {
      hideTeamLogo: false,
      setHideTeamLogo: () => {},
    };
  }
  return ctx;
}
