import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import { useUIStore } from "@/store/ui";
import type { TimelineItem } from "@/types/timeline";

interface TrackItemProps {
  item: TimelineItem;
  pixelsPerSecond: number;
  isSelected: boolean;
  snapGrid: number;
  isTrackLocked: boolean;
}

export function TrackItem({
  item,
  pixelsPerSecond,
  isSelected,
  snapGrid,
  isTrackLocked,
}: TrackItemProps) {
  const { clips } = useClipsStore();
  const { updateItem, selectItem, getItemsForTrack } = useTimelineStore();
  const { snapToGrid: snapEnabled } = useUIStore();
  const clip = clips.find((c) => c.id === item.clipId);
  const items = getItemsForTrack(item.trackId);

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartInTime, setDragStartInTime] = useState(0);
  const [dragStartOutTime, setDragStartOutTime] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  const handleRef = useRef<HTMLDivElement>(null);

  // Simplified: rely on state variables; no additional refs needed

  // Helper function to snap to grid
  const snapToGrid = useCallback(
    (time: number): number => {
      return Math.round(time / snapGrid) * snapGrid;
    },
    [snapGrid]
  );

  // Helper function to find nearest edge to snap to
  const findNearestSnapEdge = useCallback(
    (targetTime: number, excludedItemId: string): number | null => {
      let nearestDistance = Infinity;
      let nearestTime: number | null = null;

      for (const otherItem of items) {
        if (otherItem.id === excludedItemId) continue;

        const distanceToStart = Math.abs(targetTime - otherItem.startTime);
        const distanceToEnd = Math.abs(targetTime - otherItem.endTime);

        if (distanceToStart < nearestDistance) {
          nearestDistance = distanceToStart;
          nearestTime = otherItem.startTime;
        }
        if (distanceToEnd < nearestDistance) {
          nearestDistance = distanceToEnd;
          nearestTime = otherItem.endTime;
        }
      }

      // Also consider snapping to grid
      const gridSnap = snapToGrid(targetTime);

      // Use nearest edge if within snap threshold
      const snapThreshold = snapGrid;
      if (
        nearestTime !== null &&
        Math.abs(targetTime - nearestTime) <= snapThreshold
      ) {
        return nearestTime;
      }
      if (Math.abs(targetTime - gridSnap) <= snapThreshold) {
        return gridSnap;
      }

      return null;
    },
    [items, snapGrid, snapToGrid]
  );

  // Calculate display dimensions
  const trimmedDuration = item.outTime - item.inTime;
  const width = trimmedDuration * pixelsPerSecond;
  const left = item.startTime * pixelsPerSecond;

  const clipName = useMemo(() => {
    if (!clip) return "Unknown";
    return clip.name;
  }, [clip]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectItem(item.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't allow dragging on locked tracks
    if (isTrackLocked) return;

    // Don't start dragging if clicking on trim handles or if a drag is already happening
    const target = e.target as HTMLElement;
    if (
      target.closest(".cursor-ew-resize") ||
      isDraggingLeft ||
      isDraggingRight
    ) {
      return;
    }
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartTime(item.startTime);
    e.stopPropagation();
  };

  // Handle dragging items (moving on timeline)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = dragStartTime + deltaTime;

      let finalStartTime: number;

      if (snapEnabled) {
        // Snap to nearby edges or grid
        const snapTime = findNearestSnapEdge(newStartTime, item.id);
        finalStartTime = snapTime ?? Math.max(0, newStartTime);
      } else {
        // No snapping, just move freely
        finalStartTime = Math.max(0, newStartTime);
      }

      const duration = item.endTime - item.startTime;
      const newEndTime = finalStartTime + duration;

      updateItem(item.id, {
        startTime: finalStartTime,
        endTime: newEndTime,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragStartX,
    dragStartTime,
    item,
    pixelsPerSecond,
    updateItem,
    findNearestSnapEdge,
    snapEnabled,
  ]);

  // Handle mouse move for trimming
  useEffect(() => {
    if (!isDraggingLeft && !isDraggingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (isDraggingLeft) {
        // Trimming from the left (increasing inTime)
        const newInTime = Math.max(
          0,
          Math.min(dragStartInTime + deltaTime, item.outTime - 0.1)
        );
        const durationChange = newInTime - item.inTime;
        const newStartTime = item.startTime + durationChange;
        const newEndTime = item.endTime + durationChange;

        updateItem(item.id, {
          inTime: newInTime,
          startTime: newStartTime,
          endTime: newEndTime,
        });
      } else if (isDraggingRight && clip) {
        // Trimming from the right (decreasing outTime)
        const newOutTime = Math.min(
          clip.duration,
          Math.max(dragStartOutTime + deltaTime, item.inTime + 0.1)
        );

        updateItem(item.id, {
          outTime: newOutTime,
          endTime: item.startTime + (newOutTime - item.inTime),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDraggingLeft,
    isDraggingRight,
    dragStartX,
    dragStartInTime,
    dragStartOutTime,
    item,
    pixelsPerSecond,
    clip,
    updateItem,
  ]);

  const handleLeftMouseDown = (e: React.MouseEvent) => {
    // Don't allow trimming on locked tracks
    if (isTrackLocked) return;
    e.stopPropagation();
    setIsDraggingLeft(true);
    setDragStartX(e.clientX);
    setDragStartInTime(item.inTime);
  };

  const handleRightMouseDown = (e: React.MouseEvent) => {
    // Don't allow trimming on locked tracks
    if (isTrackLocked) return;
    e.stopPropagation();
    setIsDraggingRight(true);
    setDragStartX(e.clientX);
    setDragStartOutTime(item.outTime);
  };

  if (!clip) return null;

  // HTML5 drag disabled for items to simplify UX; movement is handled via mouse events

  return (
    <div
      className={`group absolute flex h-full items-center select-none transition-opacity ${
        isTrackLocked ? "cursor-not-allowed opacity-50" : "cursor-move"
      } ${
        isSelected
          ? "border-2 border-primary bg-primary/30 shadow-md ring-2 ring-primary/50"
          : "border border-primary bg-primary/10"
      } ${isDragging ? "opacity-80 shadow-lg" : ""}`}
      style={{
        width: `${width}px`,
        left: `${left}px`,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Left trim handle */}
      <div
        ref={handleRef}
        onMouseDown={handleLeftMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-primary hover:w-2 transition-all"
        style={{ zIndex: 10 }}
      />

      {/* Clip content */}
      <div className="flex-1 px-2 text-xs overflow-hidden">
        <span className="truncate text-xs text-foreground block">
          {clipName}
        </span>
        <span className="text-xs text-muted-foreground">
          {trimmedDuration.toFixed(1)}s
        </span>
      </div>

      {/* Right trim handle */}
      <div
        onMouseDown={handleRightMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-ew-resize bg-primary hover:w-2 transition-all"
        style={{ zIndex: 10 }}
      />
    </div>
  );
}
