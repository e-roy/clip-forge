import { create } from "zustand";

interface UIState {
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedClipId: null,
  setSelectedClipId: (id: string | null) => set({ selectedClipId: id }),
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  snapToGrid: true,
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
}));
