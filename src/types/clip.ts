export interface Clip {
  id: string;
  path: string;
  name: string;
  duration: number;
  format: string;
  codec: string;
  resolution?: {
    width: number;
    height: number;
  };
  thumbnail?: string;
}
