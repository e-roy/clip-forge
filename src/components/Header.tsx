import { Button } from "@/components/ui/button";
import { FilmIcon, Video as VideoIcon, Download } from "lucide-react";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ExportProgress } from "@/components/export/ExportProgress";
import { Recorder } from "@/components/recorder/Recorder";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useUIStore } from "@/store/ui";
import { useTimelineStore } from "@/store/timeline";
import { useExport } from "@/lib/useExport";
import { useRecording } from "@/lib/useRecording";

export function Header() {
  const {
    projectName,
    exportDialogOpen,
    exportProgressOpen,
    recorderOpen,
    settingsDialogOpen,
    setExportDialogOpen,
    setExportProgressOpen,
    setRecorderOpen,
    setSettingsDialogOpen,
  } = useUIStore();
  const { items } = useTimelineStore();
  const { handleStartExport } = useExport();
  const { handleRecordingDone } = useRecording();

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
            onClick={() => setRecorderOpen(true)}
            title="Record screen or webcam"
            size="icon"
          >
            <VideoIcon className="h-4 w-4" />
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
      <Recorder
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        onRecorded={handleRecordingDone}
        onRecordedCallback={() => setRecorderOpen(false)}
      />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </>
  );
}
