export interface ExportJob {
  outputPath: string;
  resolution: "720p" | "1080p" | "source";
  fps: number;
  bitrateKbps: number;
  clips: Array<{
    path: string;
    inTime: number;
    outTime: number;
    startTime: number;
    endTime: number;
    trackId: number;
  }>;
}

export interface ExportProgress {
  jobId: string;
  progress: number;
  currentClip?: string;
  elapsed?: number; // seconds
  eta?: number; // seconds
}

export interface ExportResult {
  jobId: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface ClipMeta {
  path: string;
  duration: number;
  format: string;
  codec: string;
  fileSize: number;
  resolution?: {
    width: number;
    height: number;
  };
  thumbnail?: string;
}

// Define the IPC API surface exposed via contextBridge
export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface ElectronAPI {
  openFileDialog: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: string[];
  }) => Promise<string[]>;
  saveFileDialog: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
    defaultPath?: string;
  }) => Promise<string>;
  getMediaInfo: (paths: string[]) => Promise<ClipMeta[]>;
  exportVideo: (payload: ExportJob) => Promise<{ jobId: string }>;
  onExportProgress: (callback: (progress: ExportProgress) => void) => void;
  onExportDone: (callback: (result: ExportResult) => void) => void;
  getAppVersion: () => Promise<string>;
  getDesktopSources: () => Promise<DesktopSource[]>;
  writeRecordingFile: (data: ArrayBuffer, filename: string) => Promise<string>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
