import { useState, useEffect, useRef, useMemo } from "react";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import type { TimelineItem } from "@/types/timeline";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inTimeValue, setInTimeValue] = useState(item.inTime.toFixed(2));
  const [outTimeValue, setOutTimeValue] = useState(item.outTime.toFixed(2));

  const handleRef = useRef<HTMLDivElement>(null);

  // Calculate display dimensions
  const trimmedDuration = item.outTime - item.inTime;
  const width = trimmedDuration * pixelsPerSecond;
  const left = item.startTime * pixelsPerSecond;

  // Update input values when item changes
  useEffect(() => {
    setInTimeValue(item.inTime.toFixed(2));
    setOutTimeValue(item.outTime.toFixed(2));
  }, [item.inTime, item.outTime]);

  const clipName = useMemo(() => {
    if (!clip) return "Unknown";
    return clip.name;
  }, [clip]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPopoverOpen(true);
  };

  const handleApply = () => {
    if (!clip) return;

    const newInTime = Math.max(
      0,
      Math.min(parseFloat(inTimeValue), clip.duration)
    );
    const newOutTime = Math.min(
      clip.duration,
      Math.max(parseFloat(outTimeValue), newInTime + 0.1)
    );

    updateItem(item.id, {
      inTime: newInTime,
      outTime: newOutTime,
      endTime: item.startTime + (newOutTime - newInTime),
    });

    setIsPopoverOpen(false);
  };

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
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className="group absolute flex h-full items-center border border-primary bg-primary/10 cursor-pointer"
          style={{
            width: `${width}px`,
            left: `${left}px`,
          }}
          onDoubleClick={handleDoubleClick}
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
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Trim Settings</h4>
            <p className="text-sm text-muted-foreground">
              Set precise in and out points for this clip.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="in-time">In Time (seconds)</Label>
              <Input
                id="in-time"
                type="number"
                step="0.01"
                min="0"
                max={clip.duration}
                value={inTimeValue}
                onChange={(e) => setInTimeValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Range: 0 - {clip.duration.toFixed(2)}s
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="out-time">Out Time (seconds)</Label>
              <Input
                id="out-time"
                type="number"
                step="0.01"
                min="0"
                max={clip.duration}
                value={outTimeValue}
                onChange={(e) => setOutTimeValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Range: 0 - {clip.duration.toFixed(2)}s
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPopoverOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
