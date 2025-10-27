import { useTimelineStore } from "@/store/timeline";
import { useUIStore } from "@/store/ui";
import { TrackItem } from "./TrackItem";

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
  const { getItemsForTrack, playheadTime, selectedItemId, duration } =
    useTimelineStore();
  const { showGrid } = useUIStore();
  const items = getItemsForTrack(trackId);

  // Generate grid lines
  const gridLines: number[] = [];
  if (showGrid) {
    for (let time = 0; time <= duration; time += snapGrid) {
      gridLines.push(time);
    }
  }

  return (
    <div
      className="relative border-b border-border"
      style={{ height: `${height}px` }}
    >
      {/* Grid lines */}
      {gridLines.map((time) => (
        <div
          key={`grid-${time}`}
          className="absolute h-full border-l border-border opacity-50 pointer-events-none"
          style={{ left: `${time * pixelsPerSecond}px` }}
        />
      ))}

      <div
        className="absolute h-full border-l-2 border-dashed border-primary opacity-50"
        style={{ left: `${playheadTime * pixelsPerSecond}px` }}
      />

      {items.map((item) => (
        <TrackItem
          key={item.id}
          item={item}
          pixelsPerSecond={pixelsPerSecond}
          isSelected={selectedItemId === item.id}
          snapGrid={snapGrid}
        />
      ))}
    </div>
  );
}
