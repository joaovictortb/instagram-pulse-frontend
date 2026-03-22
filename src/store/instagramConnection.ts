import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  /** `instagram_connections.id` — qual conta usar nos pedidos à API */
  activeConnectionId: string | null;
  setActiveConnectionId: (id: string | null) => void;
};

export const useInstagramConnectionStore = create<State>()(
  persist(
    (set) => ({
      activeConnectionId: null,
      setActiveConnectionId: (id) => set({ activeConnectionId: id }),
    }),
    { name: "instapulse-ig-connection" },
  ),
);
