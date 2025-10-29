import { useCallback, useState, useEffect } from "react";
import { useTimelineStore } from "@/store/timeline";
import { useUIStore } from "@/store/ui";
import { getTickInterval, getTimeUnit } from "@/lib/timeline-helpers";

interface RulerProps {
  width: number;
  pixelsPerSecond: number;
  snapGrid: number;
}

export function Ruler({ pixelsPerSecond, snapGrid }: RulerProps) {
  const { playheadTime, duration, setPlayheadTime, fps } = useTimelineStore();
  const { showGrid } = useUIStore();
  const [isScrubbing, setIsScrubbing] = useState(false);

  const tickInterval = getTickInterval(pixelsPerSecond, duration);
  const timeUnit = getTimeUnit(pixelsPerSecond);
  const ticks: number[] = [];
  const gridLines: number[] = [];

  for (let time = 0; time <= duration; time += tickInterval) {
    ticks.push(time);
  }

  // Add grid lines for snapping
  for (let time = 0; time <= duration; time += snapGrid) {
    gridLines.push(time);
  }

  const updatePlayheadTime = useCallback(
    (e: MouseEvent) => {
      const rulerElement = document.querySelector(
        "[data-ruler]"
      ) as HTMLDivElement;
      if (!rulerElement) return;

      const rect = rulerElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
      setPlayheadTime(newTime);
    },
    [pixelsPerSecond, setPlayheadTime, duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsScrubbing(true);
      updatePlayheadTime(e.nativeEvent);
    },
    [updatePlayheadTime]
  );

  // Handle scrubbing when dragging outside the ruler
  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePlayheadTime(e);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, updatePlayheadTime]);

  const formatTime = (seconds: number): string => {
    if (timeUnit === "f") {
      // Show frames
      const frames = Math.floor(seconds * fps);
      return `${frames}f`;
    }
    if (timeUnit === "m") {
      // Show minutes
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      if (mins > 0) {
        return `${mins}m${secs > 0 ? `${secs}s` : ""}`;
      }
      return secs > 0 ? `${secs}s` : "0s";
    }
    // Show seconds
    return `${Math.floor(seconds)}s`;
  };

  return (
    <div
      data-ruler
      className="relative h-8 cursor-pointer select-none bg-muted"
      onMouseDown={handleMouseDown}
      style={{ cursor: isScrubbing ? "grabbing" : "grab" }}
    >
      {/* Grid lines */}
      {showGrid &&
        gridLines
          .filter((time) => !ticks.includes(time))
          .map((time) => (
            <div
              key={`grid-${time}`}
              className="absolute h-full border-l border-border opacity-30"
              style={{ left: `${time * pixelsPerSecond}px` }}
            />
          ))}

      {/* Major tick lines - more visible */}
      {ticks.map((time) => (
        <div
          key={time}
          className="absolute h-full border-l-4 border-border z-10 bg-muted"
          style={{ left: `${time * pixelsPerSecond}px` }}
        >
          <div className="ml-1 mt-1 text-xs text-muted-foreground font-medium">
            {formatTime(time)}
          </div>
        </div>
      ))}

      {/* Playhead */}
      <div
        className="absolute h-full w-0.5 bg-primary z-20"
        style={{ left: `${playheadTime * pixelsPerSecond}px` }}
      >
        <div className="absolute top-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary" />
      </div>
    </div>
  );
}
