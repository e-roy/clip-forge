import { Button } from "@/components/ui/button";
import { FilmIcon, Download, Settings } from "lucide-react";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ExportProgress } from "@/components/export/ExportProgress";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ProjectSettingsDialog } from "@/components/project/ProjectSettingsDialog";
import { useUIStore } from "@/store/ui";
import { useTimelineStore } from "@/store/timeline";
import { useExport } from "@/lib/useExport";

export function Header() {
  const {
    projectName,
    exportDialogOpen,
    exportProgressOpen,

    settingsDialogOpen,
    projectSettingsDialogOpen,
    setExportDialogOpen,
    setExportProgressOpen,

    setSettingsDialogOpen,
    setProjectSettingsDialogOpen,
  } = useUIStore();
  const { items } = useTimelineStore();
  const { handleStartExport } = useExport();

  return (
    <>
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <FilmIcon className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">{projectName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setProjectSettingsDialogOpen(true)}
            title="Project settings"
            size="sm"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={items.length === 0}
            title={
              items.length === 0
                ? "Add clips to timeline to export"
                : `Export ${items.length} ${
                    items.length === 1 ? "clip" : "clips"
                  }`
            }
            size="icon"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onStartExport={handleStartExport}
      />
      <ExportProgress
        open={exportProgressOpen}
        onOpenChange={setExportProgressOpen}
        onClose={() => setExportProgressOpen(false)}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
      <ProjectSettingsDialog
        open={projectSettingsDialogOpen}
        onOpenChange={setProjectSettingsDialogOpen}
      />
    </>
  );
}
