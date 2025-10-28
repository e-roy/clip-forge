import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilmIcon, Video as VideoIcon, Download } from "lucide-react";
import { Library } from "@/components/library/Library";
import { Preview } from "@/components/preview/Preview";
import { Timeline } from "@/components/timeline/Timeline";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ExportProgress } from "@/components/export/ExportProgress";
import { Recorder } from "@/components/recorder/Recorder";
import { useTimelineStore } from "@/store/timeline";
import { useClipsStore } from "@/store/clips";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

function App() {
  const [projectName] = useState("Untitled Project");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProgressOpen, setExportProgressOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const { items } = useTimelineStore();
  const { clips, addClips } = useClipsStore();

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
          startTime: item.startTime,
          endTime: item.endTime,
          trackId: item.trackId,
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
      setExportProgressOpen(false);
      alert("Export failed. Please try again.");
    }
  };

  const handleRecordingDone = async (filePath: string) => {
    try {
      // Get metadata for the recorded file
      const metas = await window.api.getMediaInfo([filePath]);
      if (metas.length > 0) {
        addClips(metas);
      }
    } catch (error) {
      alert(
        "Recording saved but failed to add to library. You may need to manually import it."
      );
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

      {/* Main Content Area with Resizable Panels */}
      <ResizablePanelGroup
        direction="vertical"
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel defaultSize={70}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Sidebar - Library */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
              <div className="h-full border-r border-border">
                <Library />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Center - Preview */}
            <ResizablePanel defaultSize={80} minSize={30}>
              <div className="h-full">
                <Preview />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* Bottom - Timeline */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
          <div className="h-full border-t border-border overflow-hidden">
            <Timeline />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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
    </div>
  );
}

export default App;
