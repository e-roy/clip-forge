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
  settingsDialogOpen: boolean;
  setSettingsDialogOpen: (open: boolean) => void;
  projectSettingsDialogOpen: boolean;
  setProjectSettingsDialogOpen: (open: boolean) => void;
  collectAssetsDialogOpen: boolean;
  setCollectAssetsDialogOpen: (open: boolean) => void;
  archiveDialogOpen: boolean;
  setArchiveDialogOpen: (open: boolean) => void;
  recoveryDialogOpen: boolean;
  setRecoveryDialogOpen: (open: boolean) => void;
  alertDialogOpen: boolean;
  alertTitle: string;
  alertMessage: string;
  setAlertDialog: (title: string, message: string) => void;
  closeAlertDialog: () => void;

  // Existing UI state
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  fitToWindow: boolean;
  setFitToWindow: (value: boolean) => void;
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
  settingsDialogOpen: false,
  setSettingsDialogOpen: (open: boolean) => set({ settingsDialogOpen: open }),
  projectSettingsDialogOpen: false,
  setProjectSettingsDialogOpen: (open: boolean) =>
    set({ projectSettingsDialogOpen: open }),
  collectAssetsDialogOpen: false,
  setCollectAssetsDialogOpen: (open: boolean) =>
    set({ collectAssetsDialogOpen: open }),
  archiveDialogOpen: false,
  setArchiveDialogOpen: (open: boolean) => set({ archiveDialogOpen: open }),
  recoveryDialogOpen: false,
  setRecoveryDialogOpen: (open: boolean) => set({ recoveryDialogOpen: open }),
  alertDialogOpen: false,
  alertTitle: "",
  alertMessage: "",
  setAlertDialog: (title: string, message: string) =>
    set({ alertDialogOpen: true, alertTitle: title, alertMessage: message }),
  closeAlertDialog: () =>
    set({ alertDialogOpen: false, alertTitle: "", alertMessage: "" }),

  selectedClipId: null,
  setSelectedClipId: (id: string | null) => set({ selectedClipId: id }),
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  snapToGrid: true,
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  fitToWindow: false,
  setFitToWindow: (value: boolean) => set({ fitToWindow: value }),
}));
