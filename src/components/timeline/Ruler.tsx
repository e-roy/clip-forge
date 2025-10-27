import { useCallback } from "react";
import { useTimelineStore } from "@/store/timeline";

interface RulerProps {
  width: number;
  pixelsPerSecond: number;
}

export function Ruler({ pixelsPerSecond }: RulerProps) {
  const { playheadTime, duration, setPlayheadTime } = useTimelineStore();

  // Calculate major tick intervals (every second, 5 seconds, etc.)
  const getTickInterval = () => {
    if (duration <= 10) return 1; // 1 second
    if (duration <= 60) return 5; // 5 seconds
    if (duration <= 300) return 15; // 15 seconds
    return 60; // 1 minute
  };

  const tickInterval = getTickInterval();
  const ticks: number[] = [];

  for (let time = 0; time <= duration; time += tickInterval) {
    ticks.push(time);
  }

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = x / pixelsPerSecond;
      setPlayheadTime(newTime);
    },
    [pixelsPerSecond, setPlayheadTime]
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return secs.toString();
  };

  return (
    <div
      className="relative h-8 cursor-pointer select-none bg-muted"
      onClick={handleClick}
    >
      {/* Time ticks */}
      {ticks.map((time) => (
        <div
          key={time}
          className="absolute h-full border-l border-border"
          style={{ left: `${time * pixelsPerSecond}px` }}
        >
          <div className="ml-1 mt-1 text-xs text-muted-foreground">
            {formatTime(time)}
          </div>
        </div>
      ))}

      {/* Playhead */}
      <div
        className="absolute h-full w-0.5 bg-primary"
        style={{ left: `${playheadTime * pixelsPerSecond}px` }}
      >
        <div className="absolute top-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary" />
      </div>
    </div>
  );
}
