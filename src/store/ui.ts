import { create } from "zustand";

interface UIState {
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedClipId: null,
  setSelectedClipId: (id: string | null) => set({ selectedClipId: id }),
}));
