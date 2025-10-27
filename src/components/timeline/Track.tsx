import { useTimelineStore } from "@/store/timeline";
import { TrackItem } from "./TrackItem";

interface TrackProps {
  trackId: number;
  pixelsPerSecond: number;
  height: number;
}

export function Track({ trackId, pixelsPerSecond, height }: TrackProps) {
  const { getItemsForTrack, getActiveItemAtTime, playheadTime } =
    useTimelineStore();
  const items = getItemsForTrack(trackId);
  const activeItem = getActiveItemAtTime(playheadTime, trackId);

  return (
    <div
      className="relative border-b border-border"
      style={{ height: `${height}px` }}
    >
      <div
        className="absolute h-full border-l-2 border-dashed border-primary opacity-50"
        style={{ left: `${playheadTime * pixelsPerSecond}px` }}
      />

      {items.map((item) => (
        <TrackItem
          key={item.id}
          item={item}
          pixelsPerSecond={pixelsPerSecond}
        />
      ))}
    </div>
  );
}
