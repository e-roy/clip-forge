import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderIcon, VideoIcon } from "lucide-react";
import { useClipsStore } from "@/store/clips";
import { useUIStore } from "@/store/ui";
import { ClipCard } from "./ClipCard";
import type { Clip } from "@/types/clip";
import { useRecording } from "@/lib/useRecording";
import { Recorder } from "../recorder/Recorder";

export function Library() {
  const { clips, addClips, removeClip } = useClipsStore();
  const { setSelectedClipId, selectedClipId, recorderOpen, setRecorderOpen } =
    useUIStore();
  const { handleRecordingDone } = useRecording();
  const [isDragging, setIsDragging] = useState(false);

  const handleImport = async () => {
    let paths: string[] = [];
    try {
      console.log("Opening file dialog...");
      paths = await window.api.openFileDialog({
        filters: [{ name: "Media Files", extensions: ["mp4", "mov", "webm"] }],
      });
      console.log("Selected files:", paths.length);
      if (paths.length === 0) return;

      console.log("Getting media info...");
      const metas = await window.api.getMediaInfo(paths);
      console.log("Got metadata for", metas.length, "files");
      if (metas.length > 0) {
        console.log("Adding clips to library");
        addClips(metas);
      } else {
        console.error("No valid media files found");
        setAlertDialog(
          "Import Issue",
          "No valid media files were found in the selected files."
        );
      }
    } catch (error) {
      console.error("Import failed:", error);
      setAlertDialog(
        "Import Error",
        `Failed to import files: ${error.message || "Unknown error"}. Please try again.`
      );
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Get dropped files
      const files = Array.from(e.dataTransfer.files);

      // Filter for valid media files
      const validFiles = files.filter((file) =>
        [".mp4", ".mov", ".webm"].some((ext) =>
          file.name.toLowerCase().endsWith(ext)
        )
      );

      if (validFiles.length === 0) return;

      // In Electron with sandbox, File objects don't have path property
      // Extract paths if available
      const paths: string[] = [];
      for (const file of validFiles) {
        const filePath = (file as any).path;
        if (filePath && typeof filePath === "string") {
          paths.push(filePath);
        }
      }

      if (paths.length === 0) {
        // Fallback: use file picker dialog instead
        await handleImport();
        return;
      }

      try {
        const metas = await window.api.getMediaInfo(paths);
        addClips(metas);
      } catch (error) {
        console.error("Drop import failed:", error);
      }
    },
    [addClips]
  );

  const handleSelectClip = (clip: Clip) => {
    setSelectedClipId(clip.id);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Library</h2>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRecorderOpen(true)}
                className="h-8 w-8"
                title="Record screen or webcam"
              >
                <VideoIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleImport}
                className="h-8 w-8"
                title="Import media files"
              >
                <FolderIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 ${isDragging ? "bg-primary/10" : ""}`}
          >
            {clips.length === 0 ? (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>No clips imported yet</p>
                <p className="mt-2 text-xs">
                  Drag and drop media files here or use the Import button
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onSelect={() => handleSelectClip(clip)}
                    onRemove={() => removeClip(clip.id)}
                    formatDuration={formatDuration}
                    formatFileSize={formatFileSize}
                    isSelected={clip.id === selectedClipId}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Recorder
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        onRecorded={handleRecordingDone}
        onRecordedCallback={() => setRecorderOpen(false)}
      />
    </>
  );
}
