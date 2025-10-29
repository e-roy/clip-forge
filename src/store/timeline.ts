import { create } from "zustand";
import type { TimelineItem } from "@/types/timeline";
import { useClipsStore } from "./clips";
import { useProjectStore } from "./project";

interface TimelineSnapshot {
  items: TimelineItem[];
  tracks: Array<{
    id: string;
    trackNumber: number;
    displayOrder: number;
    name: string;
    visible: boolean;
    locked: boolean;
    muted: boolean;
    volume: number;
  }>;
  duration: number;
  selectedItemId: string | null;
  masterVolume: number;
}

interface TimelineState {
  // Project settings
  fps: number;
  duration: number;
  pixelsPerSecond: number;

  // Playhead position in seconds
  playheadTime: number;

  // Master volume (0.0 to 1.0)
  masterVolume: number;

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
    displayOrder: number;
    name: string;
    visible: boolean;
    locked: boolean;
    muted: boolean;
    volume: number;
  }>;

  // Undo/Redo
  history: TimelineSnapshot[];
  historyIndex: number;

  // Actions
  setPlayheadTime: (time: number) => void;
  setPixelsPerSecond: (pps: number) => void;
  setMasterVolume: (volume: number) => void;
  addItem: (clipId: string, trackId?: number) => void;
  removeItem: (itemId: string, ripple?: boolean) => void;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  getItemsForTrack: (trackId: number) => TimelineItem[];
  getActiveItemAtTime: (time: number, trackId: number) => TimelineItem | null;
  getTopActiveItemAtTime: (time: number) => TimelineItem | null;
  getAllActiveItemsAtTime: (time: number) => TimelineItem[];
  selectItem: (itemId: string | null) => void;
  splitItemAtPlayhead: (itemId: string, playheadTime: number) => void;
  getNextItemAfterTime: (time: number, trackId: number) => TimelineItem | null;
  reorderItems: (itemIds: string[]) => void;
  toggleRippleDelete: () => void;
  addTrack: () => string;
  deleteTrack: (trackId: string) => void;
  reorderTracks: (newOrder: string[]) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  updateTrackName: (trackId: string, name: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  snapshot: () => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => {
  // Generate a unique ID for timeline items
  const generateItemId = () => crypto.randomUUID();

  // Generate a unique ID for tracks
  const generateTrackId = () => crypto.randomUUID();

  // Create initial tracks (V1 at top, V2 below)
  const track1 = {
    id: generateTrackId(),
    trackNumber: 1,
    displayOrder: 0,
    name: "V1",
    visible: true,
    locked: false,
    muted: false,
    volume: 1,
  };

  const track2 = {
    id: generateTrackId(),
    trackNumber: 2,
    displayOrder: 1,
    name: "V2",
    visible: true,
    locked: false,
    muted: false,
    volume: 1,
  };

  const initialSnapshot: TimelineSnapshot = {
    items: [],
    tracks: [track1, track2],
    duration: 0,
    selectedItemId: null,
    masterVolume: 1.0,
  };

  return {
    fps: 30,
    duration: 0,
    pixelsPerSecond: 60,
    playheadTime: 0,
    masterVolume: 1.0,
    items: [],
    selectedItemId: null,
    rippleDelete: false,
    tracks: [track1, track2],
    history: [initialSnapshot],
    historyIndex: 0,

    snapshot: () => {
      const state = get();
      const newSnapshot: TimelineSnapshot = {
        items: state.items,
        tracks: state.tracks,
        duration: state.duration,
        selectedItemId: state.selectedItemId,
        masterVolume: state.masterVolume,
      };

      set((prev) => {
        // Remove any future history if we're not at the end
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(newSnapshot);

        // Limit history to 50 entries
        if (newHistory.length > 50) {
          newHistory.shift();
          return { history: newHistory, historyIndex: 49 };
        }

        return { history: newHistory, historyIndex: newHistory.length - 1 };
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const snapshot = history[historyIndex - 1];
        set((prev) => ({
          items: snapshot.items,
          tracks: snapshot.tracks,
          duration: snapshot.duration,
          selectedItemId: snapshot.selectedItemId,
          masterVolume: snapshot.masterVolume,
          historyIndex: prev.historyIndex - 1,
        }));
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const snapshot = history[historyIndex + 1];
        set((prev) => ({
          items: snapshot.items,
          tracks: snapshot.tracks,
          duration: snapshot.duration,
          selectedItemId: snapshot.selectedItemId,
          masterVolume: snapshot.masterVolume,
          historyIndex: prev.historyIndex + 1,
        }));
      }
    },

    canUndo: () => {
      const { historyIndex } = get();
      return historyIndex > 0;
    },

    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    },

    setPlayheadTime: (time: number) => {
      const compositionDuration =
        useProjectStore.getState().compositionDurationSec;
      set({ playheadTime: Math.max(0, Math.min(time, compositionDuration)) });
    },

    addItem: (clipId: string, trackId: number = 1) => {
      const { items, tracks, duration, snapshot } = get();
      const clips = useClipsStore.getState().clips;
      const clip = clips.find((c) => c.id === clipId);

      if (!clip) return;

      const track = tracks.find((t) => t.trackNumber === trackId);
      if (!track) return;

      snapshot();

      // Add clip at playhead position
      const { playheadTime } = get();
      const startTime = playheadTime;

      const itemDuration = clip.duration;
      const newItem: TimelineItem = {
        id: generateItemId(),
        clipId,
        startTime,
        endTime: startTime + itemDuration,
        inTime: 0,
        outTime: itemDuration,
        trackId: track.trackNumber,
      };

      // Update global duration if this is the last item
      const newDuration = Math.max(duration, startTime + itemDuration);

      set({
        items: [...items, newItem],
        duration: newDuration,
      });

      // Auto-expand composition if needed
      useProjectStore.getState().autoExpandComposition(newItem.endTime);

      // Trigger save after significant action
      import("@/store/project").then(({ useProjectStore }) => {
        useProjectStore.getState().saveProject();
      });
    },

    setPixelsPerSecond: (pps: number) => {
      set({ pixelsPerSecond: Math.max(10, Math.min(pps, 240)) });
    },

    setMasterVolume: (volume: number) => {
      set({ masterVolume: Math.max(0, Math.min(volume, 1)) });
    },

    removeItem: (itemId: string, ripple = false) => {
      const { items, rippleDelete, selectedItemId, snapshot } = get();
      const itemToRemove = items.find((item) => item.id === itemId);
      if (!itemToRemove) return;

      snapshot();

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

      // Trigger save after significant action
      import("@/store/project").then(({ useProjectStore }) => {
        useProjectStore.getState().saveProject();
      });
    },

    selectItem: (itemId: string | null) => {
      set({ selectedItemId: itemId });
    },

    splitItemAtPlayhead: (itemId: string, playheadTime: number) => {
      const { items, snapshot } = get();
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Check if playhead is within item bounds
      if (playheadTime < item.startTime || playheadTime >= item.endTime) {
        return;
      }

      snapshot();

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

      // Trigger save after significant action
      import("@/store/project").then(({ useProjectStore }) => {
        useProjectStore.getState().saveProject();
      });
    },

    toggleRippleDelete: () => {
      const { rippleDelete } = get();
      set({ rippleDelete: !rippleDelete });
    },

    updateItem: (itemId: string, updates: Partial<TimelineItem>) => {
      const { items, snapshot } = get();

      // Only snapshot if this is actually changing something
      const item = items.find((i) => i.id === itemId);
      if (
        item &&
        Object.keys(updates).some(
          (key) => (item as any)[key] !== (updates as any)[key]
        )
      ) {
        snapshot();
      }

      const newItems = items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );

      // Recalculate duration based on all items
      const newDuration =
        newItems.length > 0
          ? Math.max(...newItems.map((item) => item.endTime))
          : 0;

      set({
        items: newItems,
        duration: newDuration,
      });

      // Auto-expand composition if needed
      if (newItems.length > 0) {
        const maxEnd = Math.max(...newItems.map((i) => i.endTime));
        useProjectStore.getState().autoExpandComposition(maxEnd);
      }
    },

    getItemsForTrack: (trackId: number) => {
      return get()
        .items.filter((item) => item.trackId === trackId)
        .sort((a, b) => a.startTime - b.startTime);
    },

    getActiveItemAtTime: (time: number, trackId: number) => {
      const { items, tracks } = get();
      const track = tracks.find((t) => t.trackNumber === trackId);

      // Don't return items on invisible tracks
      if (!track || !track.visible) return null;

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

    getTopActiveItemAtTime: (time: number) => {
      const { items, tracks } = get();

      // Find all tracks sorted by displayOrder (lowest first = top of UI), filtered by visibility
      const visibleTracks = tracks.filter((track) => track.visible);
      const sortedTracks = [...visibleTracks].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );

      // For each visible track (from top to bottom of UI), check if there's an item at this time
      for (const track of sortedTracks) {
        const item = items.find(
          (item) =>
            item.trackId === track.trackNumber &&
            time >= item.startTime &&
            time < item.endTime
        );

        if (item) {
          return item;
        }
      }

      return null;
    },

    getAllActiveItemsAtTime: (time: number) => {
      const { items, tracks } = get();

      // Find all tracks sorted by displayOrder (lowest first = top of UI), filtered by visibility
      const visibleTracks = tracks.filter((track) => track.visible);
      const sortedTracks = [...visibleTracks].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );

      const activeItems: TimelineItem[] = [];

      // For each visible track, find items that are active at this time
      for (const track of sortedTracks) {
        const item = items.find(
          (item) =>
            item.trackId === track.trackNumber &&
            time >= item.startTime &&
            time < item.endTime
        );

        if (item) {
          activeItems.push(item);
        }
      }

      return activeItems;
    },

    addTrack: () => {
      const { tracks, snapshot } = get();
      snapshot();

      const nextTrackNumber =
        tracks.length > 0
          ? Math.max(...tracks.map((t) => t.trackNumber)) + 1
          : 1;

      // Add new track at the top (displayOrder = 0, shifts all others down)
      const newTrack = {
        id: generateTrackId(),
        trackNumber: nextTrackNumber,
        displayOrder: 0,
        name: `V${nextTrackNumber}`,
        visible: true,
        locked: false,
        muted: false,
        volume: 1,
      };

      // Shift all existing tracks down
      const updatedTracks = tracks.map((track) => ({
        ...track,
        displayOrder: track.displayOrder + 1,
      }));

      set({
        tracks: [newTrack, ...updatedTracks],
      });

      return newTrack.id;
    },

    reorderTracks: (newOrder: string[]) => {
      const { tracks, snapshot } = get();
      snapshot();

      // Reorder tracks based on new displayOrder
      const updatedTracks = newOrder
        .map((trackId, index) => {
          const track = tracks.find((t) => t.id === trackId);
          if (track) {
            return { ...track, displayOrder: index };
          }
          return null;
        })
        .filter((track): track is NonNullable<typeof track> => track !== null);

      // Add any tracks not in the new order at the end
      const orderedTrackIds = new Set(newOrder);
      const remainingTracks = tracks
        .filter((t) => !orderedTrackIds.has(t.id))
        .map((t, index) => ({
          ...t,
          displayOrder: updatedTracks.length + index,
        }));

      set({
        tracks: [...updatedTracks, ...remainingTracks],
      });
    },

    deleteTrack: (trackId: string) => {
      const { tracks, items, snapshot } = get();

      // Don't allow deleting the last track
      if (tracks.length <= 1) return;

      snapshot();

      // Find the track to delete
      const trackToDelete = tracks.find((t) => t.id === trackId);
      if (!trackToDelete) return;

      // Remove all items from this track
      const trackNumber = trackToDelete.trackNumber;
      const remainingItems = items.filter(
        (item) => item.trackId !== trackNumber
      );

      // Remove the track
      const newTracks = tracks.filter((track) => track.id !== trackId);

      // Recalculate duration based on remaining items
      const newDuration =
        remainingItems.length > 0
          ? Math.max(...remainingItems.map((item) => item.endTime))
          : 0;

      set({
        tracks: newTracks,
        items: remainingItems,
        duration: newDuration,
      });

      // Trigger save after significant action
      import("@/store/project").then(({ useProjectStore }) => {
        useProjectStore.getState().saveProject();
      });
    },

    reorderItems: (_itemIds: string[]) => {
      // TODO: Implement reordering logic
      // For now, this is a placeholder
    },

    toggleTrackVisibility: (trackId: string) => {
      const { tracks, snapshot } = get();
      snapshot();
      const newTracks = tracks.map((track) =>
        track.id === trackId ? { ...track, visible: !track.visible } : track
      );
      set({ tracks: newTracks });
    },

    toggleTrackLock: (trackId: string) => {
      const { tracks, snapshot } = get();
      snapshot();
      const newTracks = tracks.map((track) =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      );
      set({ tracks: newTracks });
    },

    toggleTrackMute: (trackId: string) => {
      const { tracks, snapshot } = get();
      snapshot();
      const newTracks = tracks.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      );
      set({ tracks: newTracks });
    },

    updateTrackName: (trackId: string, name: string) => {
      const { tracks, snapshot } = get();
      snapshot();
      const newTracks = tracks.map((track) =>
        track.id === trackId ? { ...track, name } : track
      );
      set({ tracks: newTracks });
    },

    reset: () => {
      // Generate new initial tracks
      const newTrack1 = {
        id: generateTrackId(),
        trackNumber: 1,
        displayOrder: 0,
        name: "V1",
        visible: true,
        locked: false,
        muted: false,
        volume: 1,
      };

      const newTrack2 = {
        id: generateTrackId(),
        trackNumber: 2,
        displayOrder: 1,
        name: "V2",
        visible: true,
        locked: false,
        muted: false,
        volume: 1,
      };

      const newInitialSnapshot: TimelineSnapshot = {
        items: [],
        tracks: [newTrack1, newTrack2],
        duration: 0,
        selectedItemId: null,
        masterVolume: 1.0,
      };

      // Reset all state to initial values
      set({
        fps: 30,
        duration: 0,
        pixelsPerSecond: 60,
        playheadTime: 0,
        masterVolume: 1.0,
        items: [],
        selectedItemId: null,
        rippleDelete: false,
        tracks: [newTrack1, newTrack2],
        history: [newInitialSnapshot],
        historyIndex: 0,
      });
    },
  };
});
