import { create } from "zustand";
import type { Clip } from "@/types/clip";
import type { TimelineItem } from "@/types/timeline";

interface ProjectData {
  clips: Clip[];
  timeline: {
    items: TimelineItem[];
    tracks: Array<{
      id: string;
      trackNumber: number;
      name: string;
      visible: boolean;
      locked: boolean;
      muted: boolean;
      volume: number;
    }>;
    fps: number;
    duration: number;
    pixelsPerSecond: number;
  };
  ui: {
    projectName: string;
  };
}

interface ProjectState {
  // Loading state
  isLoading: boolean;
  loadError: string | null;

  hasUnsavedChanges: boolean;
  lastSaveTime: number | null;
  autoSaveInterval: NodeJS.Timeout | null;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  saveProject: () => Promise<void>;
  loadProject: () => Promise<void>;
  startAutoSave: () => void;
  stopAutoSave: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const saveProject = async () => {
    try {
      // Check if api is available
      if (!window.api) {
        return;
      }

      // Use lazy imports to avoid circular dependencies
      const clipsModule = await import("./clips");
      const timelineModule = await import("./timeline");
      const uiModule = await import("./ui");

      const clips = clipsModule.useClipsStore.getState().clips;
      const timeline = timelineModule.useTimelineStore.getState();
      const ui = uiModule.useUIStore.getState();

      const projectData: ProjectData = {
        clips,
        timeline: {
          items: timeline.items,
          tracks: timeline.tracks,
          fps: timeline.fps,
          duration: timeline.duration,
          pixelsPerSecond: timeline.pixelsPerSecond,
        },
        ui: {
          projectName: ui.projectName,
        },
      };

      const projectJson = JSON.stringify(projectData, null, 2);

      // Save to autosave via IPC
      await window.api.saveProject(projectJson);

      set({ hasUnsavedChanges: false, lastSaveTime: Date.now() });
    } catch (error) {
      // Silently fail - autosave errors shouldn't break the app
      console.error("Failed to save project:", error);
    }
  };

  const loadProject = async () => {
    set({ isLoading: true, loadError: null });

    try {
      // Check if api is available
      if (!window.api) {
        console.log("API not available yet, skipping project load");
        set({ isLoading: false });
        return;
      }

      const autosavePath = await window.api.getAutosavePath();
      const result = await window.api.loadProject(autosavePath);

      if (result.success && result.data) {
        const projectData: ProjectData = JSON.parse(result.data);

        // Validate project data before loading
        if (!projectData.clips || !projectData.timeline || !projectData.ui) {
          throw new Error("Invalid project data structure");
        }

        // Use lazy imports to avoid circular dependencies
        const clipsModule = await import("./clips");
        const timelineModule = await import("./timeline");
        const uiModule = await import("./ui");

        // Restore clips (only if they exist and are valid)
        if (Array.isArray(projectData.clips)) {
          clipsModule.useClipsStore.getState().clearClips();
          const validClips = projectData.clips.filter(
            (clip) => clip && clip.path && clip.duration && clip.format
          );
          if (validClips.length > 0) {
            clipsModule.useClipsStore.getState().addClips(
              validClips.map((clip) => ({
                path: clip.path,
                duration: clip.duration,
                format: clip.format,
                codec: clip.codec,
                fileSize: clip.fileSize,
                resolution: clip.resolution,
                thumbnail: clip.thumbnail,
              }))
            );
          }
        }

        // Restore timeline (preserve history/undo state)
        if (projectData.timeline) {
          const timelineStore = timelineModule.useTimelineStore.getState();
          const updates: any = {};

          if (Array.isArray(projectData.timeline.items)) {
            updates.items = projectData.timeline.items;
          }
          if (Array.isArray(projectData.timeline.tracks)) {
            updates.tracks = projectData.timeline.tracks;
          }
          if (typeof projectData.timeline.fps === "number") {
            updates.fps = projectData.timeline.fps;
          }
          if (typeof projectData.timeline.duration === "number") {
            updates.duration = projectData.timeline.duration;
          }
          if (typeof projectData.timeline.pixelsPerSecond === "number") {
            updates.pixelsPerSecond = projectData.timeline.pixelsPerSecond;
          }

          // Always preserve history
          updates.history = timelineStore.history;
          updates.historyIndex = timelineStore.historyIndex;

          timelineModule.useTimelineStore.setState(updates);
        }

        // Restore UI
        if (projectData.ui && projectData.ui.projectName) {
          uiModule.useUIStore.setState({
            projectName: projectData.ui.projectName,
          });
        }

        set({ hasUnsavedChanges: false, isLoading: false, loadError: null });
        console.log("Project loaded successfully");
      } else {
        // Autosave file doesn't exist yet, that's fine
        console.log("No autosave file found, starting fresh project");
        set({ isLoading: false, loadError: null });
      }
    } catch (error: any) {
      // If loading fails, delete the corrupted autosave file
      console.error("Failed to load project:", error);
      set({ isLoading: false, loadError: error.message });

      try {
        if (window.api) {
          await window.api.deleteAutosave();
          console.log("Corrupted autosave deleted, starting fresh");
        }
      } catch (deleteError) {
        console.error("Failed to delete corrupted autosave:", deleteError);
      }
    }
  };

  const startAutoSave = () => {
    const { autoSaveInterval } = get();
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    // Auto-save every 30 seconds
    const interval = setInterval(() => {
      const { isLoading } = get();
      // Don't save while loading
      if (!isLoading) {
        get().saveProject();
      }
    }, 30000) as unknown as NodeJS.Timeout;

    set({ autoSaveInterval: interval });
  };

  const stopAutoSave = () => {
    const { autoSaveInterval } = get();
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      set({ autoSaveInterval: null });
    }
  };

  return {
    isLoading: false,
    loadError: null,
    hasUnsavedChanges: false,
    lastSaveTime: null,
    autoSaveInterval: null,
    setHasUnsavedChanges: (hasChanges: boolean) =>
      set({ hasUnsavedChanges: hasChanges }),
    saveProject,
    loadProject,
    startAutoSave,
    stopAutoSave,
  };
});
