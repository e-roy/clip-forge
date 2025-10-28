import { useEffect } from "react";
import { ShortcutsDialog } from "@/components/ui/ShortcutsDialog";
import { useUIStore } from "@/store/ui";
import { useTimelineStore } from "@/store/timeline";

/**
 * Handles application-level concerns like keyboard shortcuts, project loading, and autosave
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { shortcutsDialogOpen, setShortcutsDialogOpen } = useUIStore();
  const { undo, redo, canUndo, canRedo } = useTimelineStore();

  // Load project on mount and start auto-save
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
      const timer = setTimeout(initProject, 1000);
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

  return (
    <>
      {children}
      <ShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </>
  );
}
