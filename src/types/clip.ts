export interface Clip {
  id: string;
  path: string;
  name: string;
  duration: number;
  format: string;
  codec: string;
  fileSize: number;
  resolution?: {
    width: number;
    height: number;
  };
  thumbnail?: string;
  audioSampleRate?: number;
  frameRate?: number;
}
