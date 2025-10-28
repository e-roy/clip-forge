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
  resolution?: {
    width: number;
    height: number;
  };
}

// Result type for project operations
export interface Result {
  success: boolean;
  error?: string;
  data?: any;
}

// Collect assets result
export interface CollectResult {
  success: boolean;
  error?: string;
  collectedAssets?: string[];
}
