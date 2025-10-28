import { useEffect, useState } from "react";
import { ShortcutsDialog } from "@/components/ui/ShortcutsDialog";
import { RecoveryDialog } from "@/components/recovery/RecoveryDialog";
import { useUIStore } from "@/store/ui";
import { useTimelineStore } from "@/store/timeline";
import { useSettingsStore } from "@/store/settings";

/**
 * Handles application-level concerns like keyboard shortcuts, project loading, and autosave
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const {
    shortcutsDialogOpen,
    setShortcutsDialogOpen,
    recoveryDialogOpen,
    setRecoveryDialogOpen,
  } = useUIStore();
  const { undo, redo, canUndo, canRedo } = useTimelineStore();
  const { theme } = useSettingsStore();
  const [crashAutosavePath, setCrashAutosavePath] = useState<
    string | undefined
  >();

  // Initialize theme on mount
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }
  }, [theme]);

  // Check for crash recovery
  useEffect(() => {
    if (typeof window !== "undefined" && window.api) {
      const checkCrash = async () => {
        try {
          const crashInfo = await window.api.checkCrashRecovery();
          if (crashInfo.hasCrash) {
            setCrashAutosavePath(crashInfo.autosavePath);
            setRecoveryDialogOpen(true);
          }
        } catch (error) {
          console.error("Failed to check crash recovery:", error);
        }
      };
      checkCrash();
    }
  }, []);

  // Load project on mount and start auto-save (after recovery check)
  useEffect(() => {
    if (typeof window !== "undefined" && window.api) {
      const initProject = async () => {
        try {
          const { useProjectStore } = await import("@/store/project");
          await useProjectStore.getState().loadProject();
          useProjectStore.getState().startAutoSave();
          console.log("Project initialized with auto-save enabled");
        } catch (error) {
          console.error("Failed to initialize project:", error);
          // App continues to work even if project loading fails
        }
      };
      // Wait a bit longer to allow crash recovery dialog to appear first
      const timer = setTimeout(initProject, 500);
      return () => {
        clearTimeout(timer);
        import("@/store/project")
          .then(({ useProjectStore }) => {
            useProjectStore.getState().stopAutoSave();
          })
          .catch((err) => {
            console.error("Cleanup error:", err);
          });
      };
    }
  }, []);

  const handleRecover = async () => {
    setRecoveryDialogOpen(false);
    await window.api.clearCrashFlag();
    // Load the autosave file
    if (crashAutosavePath) {
      // Project will be loaded from autosave
      const { useProjectStore } = await import("@/store/project");
      await useProjectStore.getState().loadProject();
    }
  };

  const handleDiscard = async () => {
    setRecoveryDialogOpen(false);
    await window.api.clearCrashFlag();
    // Start with fresh project
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Show shortcuts
      if (e.key === "F1") {
        e.preventDefault();
        setShortcutsDialogOpen(true);
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Grid toggle
      if (e.key === "g" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleGrid();
      }

      // Snap to grid toggle
      if (e.key === "G" && !e.ctrlKey && !e.metaKey && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleSnapToGrid();
      }

      // Ripple delete toggle
      if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        useTimelineStore.getState().toggleRippleDelete();
      }

      // Delete key
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!e.target || (e.target as HTMLElement).tagName !== "INPUT") {
          const { selectedItemId, removeItem } = useTimelineStore.getState();
          if (selectedItemId) {
            e.preventDefault();
            removeItem(selectedItemId);
          }
        }
      }

      // Split key
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        const { selectedItemId, items, playheadTime, splitItemAtPlayhead } =
          useTimelineStore.getState();
        if (selectedItemId) {
          const item = items.find((i) => i.id === selectedItemId);
          if (item) {
            e.preventDefault();
            splitItemAtPlayhead(selectedItemId, playheadTime);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShortcutsDialogOpen, undo, redo, canUndo, canRedo]);

  // Save shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        if (typeof window !== "undefined" && window.api) {
          const { useClipsStore } = require("@/store/clips");
          const { useTimelineStore } = require("@/store/timeline");
          const { useUIStore } = require("@/store/ui");
          const projectJson = JSON.stringify(
            {
              clips: useClipsStore.getState().clips,
              timeline: {
                items: useTimelineStore.getState().items,
                tracks: useTimelineStore.getState().tracks,
              },
              ui: {
                projectName: useUIStore.getState().projectName,
              },
            },
            null,
            2
          );
          window.api.saveProject(projectJson);
        }
      }
      // Ctrl+Shift+S / Cmd+Shift+S - Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        if (typeof window !== "undefined" && window.api) {
          const { useClipsStore } = require("@/store/clips");
          const { useTimelineStore } = require("@/store/timeline");
          const { useUIStore } = require("@/store/ui");
          const projectName = useUIStore.getState().projectName;
          window.api
            .saveFileDialog({
              filters: [{ name: "ClipForge Project", extensions: ["cforge"] }],
              defaultPath: projectName + ".cforge",
            })
            .then((filePath) => {
              if (filePath) {
                const { useUIStore: getUIStore } = require("@/store/ui");

                // Extract project name from filename
                const filename =
                  filePath.split(/[\\/]/).pop() || "Untitled Project";
                const nameWithoutExt = filename.replace(/\.cforge$/i, "");

                // Update the project name to match the filename
                getUIStore.getState().setProjectName(nameWithoutExt);

                const projectJson = JSON.stringify(
                  {
                    clips: useClipsStore.getState().clips,
                    timeline: {
                      items: useTimelineStore.getState().items,
                      tracks: useTimelineStore.getState().tracks,
                    },
                    ui: {
                      projectName: nameWithoutExt,
                    },
                  },
                  null,
                  2
                );
                window.api.saveProjectAs(projectJson, filePath);
              }
            });
        }
      }
      // Ctrl+O / Cmd+O - Open
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        if (typeof window !== "undefined" && window.api) {
          window.api.openProjectDialog().then((filePath) => {
            if (filePath) {
              window.api.loadProject(filePath).then((result) => {
                if (result.success && result.data) {
                  const data = JSON.parse(result.data);
                  const { useClipsStore } = require("@/store/clips");
                  const { useTimelineStore } = require("@/store/timeline");
                  const { useUIStore } = require("@/store/ui");
                  if (data.clips) {
                    useClipsStore.setState({ clips: data.clips });
                  }
                  if (data.timeline) {
                    useTimelineStore.setState(data.timeline);
                  }
                  // Update project name from saved data, or extract from filename
                  if (data.ui && data.ui.projectName) {
                    useUIStore.getState().setProjectName(data.ui.projectName);
                  } else {
                    // Extract project name from filename if not in saved data
                    const filename =
                      filePath.split(/[\\/]/).pop() || "Untitled Project";
                    const nameWithoutExt = filename.replace(/\.cforge$/i, "");
                    useUIStore.getState().setProjectName(nameWithoutExt);
                  }
                }
              });
            }
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {children}
      <ShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
      <RecoveryDialog
        open={recoveryDialogOpen}
        onOpenChange={setRecoveryDialogOpen}
        onRecover={handleRecover}
        onDiscard={handleDiscard}
      />
    </>
  );
}
