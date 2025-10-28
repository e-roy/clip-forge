import { useCallback, useState, useEffect, useRef } from "react";
import { useTimelineStore } from "@/store/timeline";
import { useUIStore } from "@/store/ui";
import { Ruler } from "./Ruler";
import { Track } from "./Track";
import { TrackControls } from "./TrackControls";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Grid3x3, Plus } from "lucide-react";

const TRACK_HEIGHT = 60;
const SNAP_GRID = 0.25; // 0.25 second snap grid

export function Timeline() {
  const {
    duration,
    pixelsPerSecond,
    setPixelsPerSecond,
    selectedItemId,
    selectItem,
    removeItem,
    splitItemAtPlayhead,
    playheadTime,
    rippleDelete,
    toggleRippleDelete,
    tracks,
    addTrack,
  } = useTimelineStore();

  const { showGrid, toggleGrid, snapToGrid, toggleSnapToGrid } = useUIStore();
  const [dragOver, setDragOver] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback(() => {
    // Allow the event to propagate to child tracks
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only hide overlay if leaving the entire timeline area
    const target = e.relatedTarget as HTMLElement;
    if (!timelineRef.current?.contains(target)) {
      setDragOver(false);
    }
  }, []);

  // Don't handle drops at the timeline level - let individual tracks handle it
  const handleDrop = useCallback(() => {
    // We don't prevent default here to allow track-level handlers to work
    // We'll still hide the drag overlay
    setDragOver(false);
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default if we're handling the key
      if (
        e.key === "s" ||
        e.key === "S" ||
        e.key === "Delete" ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
      }

      // Split on S
      if ((e.key === "s" || e.key === "S") && selectedItemId) {
        splitItemAtPlayhead(selectedItemId, playheadTime);
      }

      // Delete on Delete/Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        removeItem(selectedItemId);
      }

      // Zoom controls (Ctrl/Cmd + and -)
      if ((e.ctrlKey || e.metaKey) && e.key === "+") {
        e.preventDefault();
        setPixelsPerSecond(pixelsPerSecond + 20);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setPixelsPerSecond(pixelsPerSecond - 20);
      }

      // Zoom controls with = key (since + requires shift)
      if ((e.ctrlKey || e.metaKey) && e.key === "=") {
        e.preventDefault();
        setPixelsPerSecond(pixelsPerSecond + 20);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedItemId,
    playheadTime,
    splitItemAtPlayhead,
    removeItem,
    pixelsPerSecond,
    setPixelsPerSecond,
  ]);

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        timelineRef.current &&
        !timelineRef.current.contains(e.target as Node)
      ) {
        selectItem(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectItem]);

  const width = Math.max(duration * pixelsPerSecond, 800);

  return (
    <div
      ref={timelineRef}
      className="flex h-full flex-col bg-background relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
    >
      {/* Header info */}
      <div className="flex h-8 items-center justify-between border-b border-border px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {[...tracks].reverse().map((track) => (
            <div key={track.id} className="w-24">
              {track.name}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            pressed={showGrid}
            onPressedChange={toggleGrid}
            size="sm"
            variant="outline"
            title="Show/hide grid lines"
          >
            <Grid3x3 className="h-3 w-3" />
          </Toggle>
          <Toggle
            pressed={snapToGrid}
            onPressedChange={toggleSnapToGrid}
            size="sm"
            variant="outline"
            title="Snap to grid when dragging"
          >
            Snap
          </Toggle>
          <Toggle
            pressed={rippleDelete}
            onPressedChange={toggleRippleDelete}
            size="sm"
            variant="outline"
            title="Ripple delete mode"
          >
            Ripple
          </Toggle>
          <div className="text-xs">
            Zoom: {(pixelsPerSecond / 60).toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Main timeline content with control panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left control panel */}
        <div className="w-32 flex flex-col border-r border-border bg-secondary/5">
          {/* Ruler spacer */}
          <div className="h-8 shrink-0 border-b border-border" />

          {/* Track controls */}
          <div>
            {[...tracks].reverse().map((track) => (
              <TrackControls
                key={track.id}
                trackId={track.id}
                height={TRACK_HEIGHT}
                isVisible={track.visible}
                isLocked={track.locked}
                isMuted={track.muted}
              />
            ))}

            {/* Add track button */}
            <div className="flex h-[60px] items-center justify-center border-t border-border">
              <Button
                onClick={addTrack}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Add new track"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-x-auto bg-secondary/10">
          <div style={{ width: `${width}px`, minWidth: "100%" }}>
            {/* Ruler */}
            <div className="sticky top-0 z-10">
              <Ruler
                width={width}
                pixelsPerSecond={pixelsPerSecond}
                snapGrid={SNAP_GRID}
              />
            </div>

            {/* Tracks (rendered in reverse order - higher track numbers at top) */}
            {[...tracks].reverse().map((track) => (
              <Track
                key={track.id}
                trackId={track.trackNumber}
                pixelsPerSecond={pixelsPerSecond}
                height={TRACK_HEIGHT}
                snapGrid={SNAP_GRID}
              />
            ))}
          </div>
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
