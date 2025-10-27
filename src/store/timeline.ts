import { create } from "zustand";
import type { TimelineItem } from "@/types/timeline";
import type { Clip } from "@/types/clip";
import { useClipsStore } from "./clips";

interface TimelineState {
  // Project settings
  fps: number;
  duration: number;

  // Playhead position in seconds
  playheadTime: number;

  // Timeline items
  items: TimelineItem[];

  // Track management
  tracks: Array<{
    id: string;
    trackNumber: number;
    locked: boolean;
    muted: boolean;
    volume: number;
  }>;

  // Actions
  setPlayheadTime: (time: number) => void;
  addItem: (clipId: string) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  getItemsForTrack: (trackId: number) => TimelineItem[];
  getActiveItemAtTime: (time: number, trackId: number) => TimelineItem | null;
  reorderItems: (itemIds: string[]) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => {
  // Generate a unique ID for timeline items
  const generateItemId = () => crypto.randomUUID();

  // Generate a unique ID for tracks
  const generateTrackId = () => crypto.randomUUID();

  // Create initial track
  const initialTrack = {
    id: generateTrackId(),
    trackNumber: 1,
    locked: false,
    muted: false,
    volume: 1,
  };

  return {
    fps: 30,
    duration: 0,
    playheadTime: 0,
    items: [],
    tracks: [initialTrack],

    setPlayheadTime: (time: number) => {
      const { duration } = get();
      set({ playheadTime: Math.max(0, Math.min(time, duration)) });
    },

    addItem: (clipId: string) => {
      const { items, tracks, duration, fps } = get();
      const clips = useClipsStore.getState().clips;
      const clip = clips.find((c) => c.id === clipId);

      if (!clip) return;

      const track = tracks[0]; // Use first track for now
      if (!track) return;

      // Calculate position (append at the end)
      const itemDuration = clip.duration;
      const newItem: TimelineItem = {
        id: generateItemId(),
        clipId,
        startTime: duration,
        endTime: duration + itemDuration,
        inTime: 0,
        outTime: itemDuration,
        trackId: track.trackNumber,
      };

      set({
        items: [...items, newItem],
        duration: duration + itemDuration,
      });
    },

    removeItem: (itemId: string) => {
      const { items } = get();
      set({ items: items.filter((item) => item.id !== itemId) });
      // TODO: Recalculate duration after removal
    },

    updateItem: (itemId: string, updates: Partial<TimelineItem>) => {
      set({
        items: get().items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      });
    },

    getItemsForTrack: (trackId: number) => {
      return get()
        .items.filter((item) => item.trackId === trackId)
        .sort((a, b) => a.startTime - b.startTime);
    },

    getActiveItemAtTime: (time: number, trackId: number) => {
      const { items } = get();
      const trackItems = items.filter((item) => item.trackId === trackId);

      return (
        trackItems.find(
          (item) => time >= item.startTime && time < item.endTime
        ) || null
      );
    },

    reorderItems: (itemIds: string[]) => {
      // TODO: Implement reordering logic
      // For now, this is a placeholder
    },
  };
});
