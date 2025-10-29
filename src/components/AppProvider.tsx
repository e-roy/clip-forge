import { useEffect, useState } from "react";
import { ShortcutsDialog } from "@/components/ui/ShortcutsDialog";
import { RecoveryDialog } from "@/components/recovery/RecoveryDialog";
import { useUIStore } from "@/store/ui";
import { useTimelineStore } from "@/store/timeline";
import { useSettingsStore } from "@/store/settings";
import { useClipsStore } from "@/store/clips";

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
  const { setProjectName, setExportDialogOpen, setSettingsDialogOpen } =
    useUIStore();
  const { theme } = useSettingsStore();
  const [crashAutosavePath, setCrashAutosavePath] = useState<
    string | undefined
  >();

  // Handle menu events
  useEffect(() => {
    if (!window.api) return;

    const handleNewProject = async () => {
      useClipsStore.getState().clearClips();
      useTimelineStore.getState().reset();
      setProjectName("Untitled Project");

      // Save the cleared state to disk immediately
      if (window.api) {
        const { useProjectStore } = await import("@/store/project");
        await useProjectStore.getState().saveProject();
      }
    };

    const handleOpenProject = async () => {
      if (!window.api) return;
      const filePath = await window.api.openProjectDialog();
      if (filePath) {
        const projectData = await window.api.loadProject(filePath);
        if (projectData.success && projectData.data) {
          const data = JSON.parse(projectData.data);
          if (data.clips) {
            useClipsStore.setState({ clips: data.clips });
          }
          if (data.timeline) {
            useTimelineStore.setState(data.timeline);
          }
          if (data.ui && data.ui.projectName) {
            setProjectName(data.ui.projectName);
          } else {
            const filename =
              filePath.split(/[\\/]/).pop() || "Untitled Project";
            const nameWithoutExt = filename.replace(/\.cforge$/i, "");
            setProjectName(nameWithoutExt);
          }
        }
      }
    };

    const handleSave = async () => {
      if (!window.api) return;
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
          compositionDurationSec: (
            await import("@/store/project")
          ).useProjectStore.getState().compositionDurationSec,
        },
        null,
        2
      );
      await window.api.saveProject(projectJson);
    };

    const handleSaveAs = async () => {
      if (!window.api) return;
      const projectName = useUIStore.getState().projectName;
      const filePath = await window.api.saveFileDialog({
        filters: [{ name: "ClipForge Project", extensions: ["cforge"] }],
        defaultPath: projectName + ".cforge",
      });
      if (filePath) {
        const filename = filePath.split(/[\\/]/).pop() || "Untitled Project";
        const nameWithoutExt = filename.replace(/\.cforge$/i, "");
        setProjectName(nameWithoutExt);

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
            compositionDurationSec: (
              await import("@/store/project")
            ).useProjectStore.getState().compositionDurationSec,
          },
          null,
          2
        );
        await window.api.saveProjectAs(projectJson, filePath);
      }
    };

    const handleImportMedia = async () => {
      if (!window.api) return;
      const paths = await window.api.openFileDialog({
        filters: [{ name: "Media Files", extensions: ["mp4", "mov", "webm"] }],
      });
      if (paths.length === 0) return;

      const metas = await window.api.getMediaInfo(paths);
      useClipsStore.getState().addClips(metas);
    };

    const handleExport = () => {
      setExportDialogOpen(true);
    };

    const handleSettings = () => {
      setSettingsDialogOpen(true);
    };

    const handleDeleteSelected = () => {
      const { selectedItemId, removeItem } = useTimelineStore.getState();
      if (selectedItemId) {
        removeItem(selectedItemId);
      }
    };

    // Register listeners
    window.api.onTriggerNewProject(handleNewProject);
    window.api.onTriggerOpenProject(handleOpenProject);
    window.api.onTriggerSave(handleSave);
    window.api.onTriggerSaveAs(handleSaveAs);
    window.api.onTriggerImportMedia(handleImportMedia);
    window.api.onTriggerExport(handleExport);
    window.api.onTriggerSettings(handleSettings);
    window.api.onTriggerDeleteSelected(handleDeleteSelected);

    // Cleanup function to prevent duplicate listeners
    return () => {
      // Note: ipcRenderer.on listeners are automatically cleaned up when the app quits
      // but we don't need to manually remove them here as they persist for the app lifetime
    };
  }, [setProjectName, setExportDialogOpen, setSettingsDialogOpen]);

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
          // Mark app as started after recovery check completes
          // This sets the crash flag for the current session
          await window.api.markAppStarted();
        } catch (error) {
          console.error("Failed to check crash recovery:", error);
          // Still mark app as started even if recovery check fails
          try {
            await window.api.markAppStarted();
          } catch (markError) {
            console.error("Failed to mark app as started:", markError);
          }
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
              compositionDurationSec: (
                require("@/store/project").useProjectStore as any
              ).getState().compositionDurationSec,
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
                    compositionDurationSec: (
                      require("@/store/project").useProjectStore as any
                    ).getState().compositionDurationSec,
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
