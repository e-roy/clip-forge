import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilmIcon } from "lucide-react";
import { Library } from "@/components/library/Library";
import { Preview } from "@/components/preview/Preview";
import { Timeline } from "@/components/timeline/Timeline";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ExportProgress } from "@/components/export/ExportProgress";
import { useTimelineStore } from "@/store/timeline";
import { useClipsStore } from "@/store/clips";

function App() {
  const [projectName] = useState("Untitled Project");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProgressOpen, setExportProgressOpen] = useState(false);
  const { items } = useTimelineStore();
  const { clips } = useClipsStore();

  const handleStartExport = async (settings: {
    outputPath: string;
    resolution: "720p" | "1080p" | "source";
    fps: number;
    bitrateKbps: number;
  }) => {
    // Build the export job
    const exportItems = items
      .map((item) => {
        const clip = clips.find((c) => c.id === item.clipId);
        return {
          path: clip?.path || "",
          inTime: item.inTime,
          outTime: item.outTime,
        };
      })
      .filter((item) => item.path); // Filter out any missing clips

    if (exportItems.length === 0) {
      alert("No clips on timeline to export");
      return;
    }

    const exportJob = {
      outputPath: settings.outputPath,
      resolution: settings.resolution,
      fps: settings.fps,
      bitrateKbps: settings.bitrateKbps,
      clips: exportItems,
    };

    setExportProgressOpen(true);

    try {
      await window.api.exportVideo(exportJob);
    } catch (error) {
      console.error("Export error:", error);
      setExportProgressOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Top Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <FilmIcon className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">{projectName}</h1>
        </div>
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
        >
          Export
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Library */}
        <div className="w-64 border-r border-border">
          <Library />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Preview />
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-64 border-t border-border overflow-hidden">
        <Timeline />
      </div>

      {/* Export Dialogs */}
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
    </div>
  );
}

export default App;
