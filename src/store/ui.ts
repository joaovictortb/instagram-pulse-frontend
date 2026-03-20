import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  dateRange: {
    from: Date;
    to: Date;
  };
  toggleSidebar: () => void;
  setDateRange: (range: { from: Date; to: Date }) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  },
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setDateRange: (range) => set({ dateRange: range }),
}));
