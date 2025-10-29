import { useTimelineStore } from "@/store/timeline";
import { useClipsStore } from "@/store/clips";
import { useUIStore } from "@/store/ui";

export function useExport() {
  const { items, tracks } = useTimelineStore();
  const { clips } = useClipsStore();
  const { setExportProgressOpen } = useUIStore();

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
        const track = tracks.find((t) => t.trackNumber === item.trackId);
        return {
          path: clip?.path || "",
          inTime: item.inTime,
          outTime: item.outTime,
          startTime: item.startTime,
          endTime: item.endTime,
          trackId: item.trackId,
          displayOrder: track?.displayOrder ?? item.trackId,
          visible: track?.visible ?? true,
          muted: track?.muted ?? false,
          volume: track?.volume ?? 1.0,
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

  return { handleStartExport };
}
