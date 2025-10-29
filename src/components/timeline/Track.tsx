import { useState } from "react";
import { useTimelineStore } from "@/store/timeline";
import { useUIStore } from "@/store/ui";
import { TrackItem } from "./TrackItem";
import { getTickInterval } from "@/lib/timeline-helpers";

interface TrackProps {
  trackId: number;
  pixelsPerSecond: number;
  height: number;
  snapGrid: number;
}

export function Track({
  trackId,
  pixelsPerSecond,
  height,
  snapGrid,
}: TrackProps) {
  const {
    getItemsForTrack,
    playheadTime,
    selectedItemId,
    duration,
    addItem,
    items,
    updateItem,
    tracks,
  } = useTimelineStore();
  const { showGrid } = useUIStore();
  const trackItems = getItemsForTrack(trackId);
  const [isDragOver, setIsDragOver] = useState(false);

  // Get track info to check if locked
  const trackInfo = tracks.find((t) => t.trackNumber === trackId);
  const isLocked = trackInfo?.locked ?? false;

  const tickInterval = getTickInterval(pixelsPerSecond, duration);

  // Generate grid lines
  const gridLines: number[] = [];
  const majorTicks: number[] = [];
  if (showGrid) {
    for (let time = 0; time <= duration; time += snapGrid) {
      gridLines.push(time);
    }
  }

  // Generate major tick lines
  for (let time = 0; time <= duration; time += tickInterval) {
    majorTicks.push(time);
  }

  // Handle drop on this track
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Don't allow drops on locked tracks
    if (isLocked) return;

    const clipId = e.dataTransfer.getData("text/plain");
    const itemId = e.dataTransfer.getData("application/timeline-item-id");

    if (itemId) {
      // This is an existing timeline item being moved to a different track
      const existingItem = items.find((item) => item.id === itemId);
      if (existingItem && existingItem.trackId !== trackId) {
        updateItem(itemId, { trackId });
      }
    } else if (clipId) {
      // This is a new clip from the library
      addItem(clipId, trackId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Check if we're actually leaving the track (not just moving to a child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  return (
    <div
      data-track-id={trackId}
      className={`relative border-b border-border transition-colors ${
        isDragOver ? "bg-primary/10" : ""
      }`}
      style={{ height: `${height}px` }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Minor grid lines */}
      {gridLines
        .filter((time) => !majorTicks.includes(time))
        .map((time) => (
          <div
            key={`grid-${time}`}
            className="absolute h-full border-l border-border opacity-50 pointer-events-none"
            style={{ left: `${time * pixelsPerSecond}px` }}
          />
        ))}

      {/* Major tick lines - more visible */}
      {majorTicks.map((time) => (
        <div
          key={`major-${time}`}
          className="absolute h-full border-l-4 border-border opacity-70 pointer-events-none"
          style={{ left: `${time * pixelsPerSecond}px` }}
        />
      ))}

      {/* Playhead line */}
      <div
        className="absolute h-full w-0.5 bg-primary z-10"
        style={{ left: `${playheadTime * pixelsPerSecond}px` }}
      />

      {trackItems.map((item) => (
        <TrackItem
          key={item.id}
          item={item}
          pixelsPerSecond={pixelsPerSecond}
          isSelected={selectedItemId === item.id}
          snapGrid={snapGrid}
          isTrackLocked={isLocked}
        />
      ))}
    </div>
  );
}
