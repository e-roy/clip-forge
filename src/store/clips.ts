import { create } from "zustand";
import type { Clip } from "@/types/clip";
import type { ClipMeta } from "../../electron/types";

interface ClipsState {
  clips: Clip[];
  addClips: (metas: ClipMeta[]) => void;
  removeClip: (id: string) => void;
  clearClips: () => void;
}

export const useClipsStore = create<ClipsState>((set) => ({
  clips: [],
  addClips: (metas: ClipMeta[]) => {
    const newClips: Clip[] = metas.map((meta) => ({
      id: crypto.randomUUID(),
      path: meta.path,
      name: meta.path.split(/[\\/]/).pop() || "Untitled",
      duration: meta.duration,
      format: meta.format,
      codec: meta.codec,
      fileSize: meta.fileSize,
      resolution: meta.resolution,
      thumbnail: meta.thumbnail,
    }));
    set((state) => ({ clips: [...state.clips, ...newClips] }));
  },
  removeClip: (id: string) => {
    set((state) => ({ clips: state.clips.filter((c) => c.id !== id) }));
  },
  clearClips: () => {
    set({ clips: [] });
  },
}));
