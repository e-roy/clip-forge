import { useMemo } from "react";
import { useClipsStore } from "@/store/clips";
import type { TimelineItem } from "@/types/timeline";

interface TrackItemProps {
  item: TimelineItem;
  pixelsPerSecond: number;
}

export function TrackItem({ item, pixelsPerSecond }: TrackItemProps) {
  const { clips } = useClipsStore();
  const clip = clips.find((c) => c.id === item.clipId);

  const width = (item.endTime - item.startTime) * pixelsPerSecond;
  const left = item.startTime * pixelsPerSecond;

  const clipName = useMemo(() => {
    if (!clip) return "Unknown";
    return clip.name;
  }, [clip]);

  if (!clip) return null;

  return (
    <div
      className="absolute flex h-full items-center border border-primary bg-primary/10 px-2 text-xs"
      style={{
        width: `${width}px`,
        left: `${left}px`,
      }}
    >
      <span className="truncate text-xs text-foreground">{clipName}</span>
    </div>
  );
}
