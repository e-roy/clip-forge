export interface TimelineItem {
  id: string;
  clipId: string;
  startTime: number;
  endTime: number;
  inTime: number;
  outTime: number;
  trackId: number;
}

export interface TimelineTrack {
  id: string;
  trackNumber: number;
  locked: boolean;
  muted: boolean;
  volume: number;
}

export interface Project {
  fps: number;
  duration: number;
}
