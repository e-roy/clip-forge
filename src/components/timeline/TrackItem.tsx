import { useState, useEffect, useRef, useMemo } from "react";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import type { TimelineItem } from "@/types/timeline";

interface TrackItemProps {
  item: TimelineItem;
  pixelsPerSecond: number;
}

export function TrackItem({ item, pixelsPerSecond }: TrackItemProps) {
  const { clips } = useClipsStore();
  const { updateItem } = useTimelineStore();
  const clip = clips.find((c) => c.id === item.clipId);

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartInTime, setDragStartInTime] = useState(0);
  const [dragStartOutTime, setDragStartOutTime] = useState(0);

  const handleRef = useRef<HTMLDivElement>(null);

  // Calculate display dimensions
  const trimmedDuration = item.outTime - item.inTime;
  const width = trimmedDuration * pixelsPerSecond;
  const left = item.startTime * pixelsPerSecond;

  const clipName = useMemo(() => {
    if (!clip) return "Unknown";
    return clip.name;
  }, [clip]);

  // Handle mouse move for dragging
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
    e.stopPropagation();
    setIsDraggingLeft(true);
    setDragStartX(e.clientX);
    setDragStartInTime(item.inTime);
  };

  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingRight(true);
    setDragStartX(e.clientX);
    setDragStartOutTime(item.outTime);
  };

  if (!clip) return null;

  return (
    <div
      className="group absolute flex h-full items-center border border-primary bg-primary/10"
      style={{
        width: `${width}px`,
        left: `${left}px`,
      }}
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
