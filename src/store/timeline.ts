import { create } from "zustand";
import type { TimelineItem } from "@/types/timeline";
import { useClipsStore } from "./clips";

interface TimelineState {
  // Project settings
  fps: number;
  duration: number;
  pixelsPerSecond: number;

  // Playhead position in seconds
  playheadTime: number;

  // Timeline items
  items: TimelineItem[];

  // Selection state
  selectedItemId: string | null;

  // Ripple mode
  rippleDelete: boolean;

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
  setPixelsPerSecond: (pps: number) => void;
  addItem: (clipId: string) => void;
  removeItem: (itemId: string, ripple?: boolean) => void;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  getItemsForTrack: (trackId: number) => TimelineItem[];
  getActiveItemAtTime: (time: number, trackId: number) => TimelineItem | null;
  selectItem: (itemId: string | null) => void;
  splitItemAtPlayhead: (itemId: string, playheadTime: number) => void;
  getNextItemAfterTime: (time: number, trackId: number) => TimelineItem | null;
  reorderItems: (itemIds: string[]) => void;
  toggleRippleDelete: () => void;
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
    pixelsPerSecond: 60,
    playheadTime: 0,
    items: [],
    selectedItemId: null,
    rippleDelete: false,
    tracks: [initialTrack],

    setPlayheadTime: (time: number) => {
      const { duration } = get();
      set({ playheadTime: Math.max(0, Math.min(time, duration)) });
    },

    addItem: (clipId: string) => {
      const { items, tracks, duration } = get();
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

    setPixelsPerSecond: (pps: number) => {
      set({ pixelsPerSecond: Math.max(10, Math.min(pps, 240)) });
    },

    removeItem: (itemId: string, ripple = false) => {
      const { items, rippleDelete, selectedItemId } = get();
      const itemToRemove = items.find((item) => item.id === itemId);
      if (!itemToRemove) return;

      const shouldRipple = ripple || rippleDelete;

      if (shouldRipple) {
        // Calculate gap to close
        const gapEnd = itemToRemove.endTime;
        const gapDuration = itemToRemove.endTime - itemToRemove.startTime;

        // Shift all items after this one to the left
        const remainingItems = items
          .filter((item) => item.id !== itemId)
          .map((item) => {
            if (item.startTime >= gapEnd) {
              return {
                ...item,
                startTime: item.startTime - gapDuration,
                endTime: item.endTime - gapDuration,
              };
            }
            return item;
          });

        // Recalculate duration
        const newDuration =
          remainingItems.length > 0
            ? Math.max(...remainingItems.map((item) => item.endTime))
            : 0;

        set({
          items: remainingItems,
          duration: newDuration,
          selectedItemId: selectedItemId === itemId ? null : selectedItemId,
        });
      } else {
        // Just remove the item
        const remainingItems = items.filter((item) => item.id !== itemId);

        const newDuration =
          remainingItems.length > 0
            ? Math.max(...remainingItems.map((item) => item.endTime))
            : 0;

        set({
          items: remainingItems,
          duration: newDuration,
          selectedItemId: selectedItemId === itemId ? null : selectedItemId,
        });
      }
    },

    selectItem: (itemId: string | null) => {
      set({ selectedItemId: itemId });
    },

    splitItemAtPlayhead: (itemId: string, playheadTime: number) => {
      const { items } = get();
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Check if playhead is within item bounds
      if (playheadTime < item.startTime || playheadTime >= item.endTime) {
        return;
      }

      // Calculate relative time within the clip
      const clipTimeAtSplit = item.inTime + (playheadTime - item.startTime);

      // Create first half (keep existing start)
      const firstHalf: TimelineItem = {
        ...item,
        endTime: playheadTime,
        outTime: clipTimeAtSplit,
      };

      // Create second half (new item)
      const secondHalf: TimelineItem = {
        ...item,
        id: generateItemId(),
        startTime: playheadTime,
        inTime: clipTimeAtSplit,
      };

      // Replace original item with the two halves
      const newItems = items
        .filter((i) => i.id !== itemId)
        .concat(firstHalf, secondHalf);

      set({ items: newItems, selectedItemId: secondHalf.id });
    },

    toggleRippleDelete: () => {
      const { rippleDelete } = get();
      set({ rippleDelete: !rippleDelete });
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

    getNextItemAfterTime: (time: number, trackId: number) => {
      const { items } = get();
      const trackItems = items
        .filter((item) => item.trackId === trackId)
        .sort((a, b) => a.startTime - b.startTime);

      return trackItems.find((item) => item.startTime > time) || null;
    },

    reorderItems: (_itemIds: string[]) => {
      // TODO: Implement reordering logic
      // For now, this is a placeholder
    },
  };
});
