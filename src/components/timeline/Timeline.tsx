import { useCallback, useState } from "react";
import { useTimelineStore } from "@/store/timeline";
import { Ruler } from "./Ruler";
import { Track } from "./Track";

const PIXELS_PER_SECOND = 60; // Scale: 60 pixels = 1 second
const TRACK_HEIGHT = 60;

export function Timeline() {
  const { duration, addItem } = useTimelineStore();
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      // Get the clip ID from the drag data
      const clipId = e.dataTransfer.getData("text/plain");
      if (clipId) {
        addItem(clipId);
      }
    },
    [addItem]
  );

  const width = Math.max(duration * PIXELS_PER_SECOND, 800);

  return (
    <div
      className="flex h-full flex-col bg-background relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header info */}
      <div className="flex h-8 items-center border-b border-border px-2 text-xs text-muted-foreground">
        <div className="w-20">Track 1</div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-x-auto bg-secondary/10">
        <div style={{ width: `${width}px`, minWidth: "100%" }}>
          {/* Ruler */}
          <div className="sticky top-0 z-10">
            <Ruler width={width} pixelsPerSecond={PIXELS_PER_SECOND} />
          </div>

          {/* Track */}
          <Track
            trackId={1}
            pixelsPerSecond={PIXELS_PER_SECOND}
            height={TRACK_HEIGHT}
          />
        </div>
      </div>

      {/* Empty state */}
      {duration === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <p>Drag clips from Library to Timeline</p>
          </div>
        </div>
      )}

      {/* Timeline drop zone overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 border-2 border-primary bg-primary/5" />
      )}
    </div>
  );
}
