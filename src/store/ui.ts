import { create } from "zustand";

interface UIState {
  // Project state
  projectName: string;
  setProjectName: (name: string) => void;

  // Dialog state
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
  exportProgressOpen: boolean;
  setExportProgressOpen: (open: boolean) => void;
  recorderOpen: boolean;
  setRecorderOpen: (open: boolean) => void;
  shortcutsDialogOpen: boolean;
  setShortcutsDialogOpen: (open: boolean) => void;

  // Existing UI state
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  projectName: "Untitled Project",
  setProjectName: (name: string) => set({ projectName: name }),

  exportDialogOpen: false,
  setExportDialogOpen: (open: boolean) => set({ exportDialogOpen: open }),
  exportProgressOpen: false,
  setExportProgressOpen: (open: boolean) => set({ exportProgressOpen: open }),
  recorderOpen: false,
  setRecorderOpen: (open: boolean) => set({ recorderOpen: open }),
  shortcutsDialogOpen: false,
  setShortcutsDialogOpen: (open: boolean) => set({ shortcutsDialogOpen: open }),

  selectedClipId: null,
  setSelectedClipId: (id: string | null) => set({ selectedClipId: id }),
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  snapToGrid: true,
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
}));
