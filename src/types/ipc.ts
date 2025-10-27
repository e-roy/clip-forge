export interface ExportJob {
  outputPath: string;
  clips: Array<{
    path: string;
    inTime: number;
    outTime: number;
  }>;
}

export interface ExportProgress {
  jobId: string;
  progress: number;
  currentClip?: string;
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
  resolution?: {
    width: number;
    height: number;
  };
}
