import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

interface ExportProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

const formatTime = (seconds?: number) => {
  if (seconds === undefined) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

export function ExportProgress({
  open,
  onOpenChange,
  onClose,
}: ExportProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"exporting" | "success" | "error">(
    "exporting"
  );
  const [error, setError] = useState<string>("");
  const [outputPath, setOutputPath] = useState<string>("");
  const [elapsed, setElapsed] = useState<number>(0);
  const [eta, setEta] = useState<number | undefined>(undefined);
  const [currentClip, setCurrentClip] = useState<string>("");

  useEffect(() => {
    const handleProgress = (data: {
      jobId: string;
      progress: number;
      currentClip?: string;
      elapsed?: number;
      eta?: number;
    }) => {
      setProgress(data.progress);
      if (data.elapsed !== undefined) setElapsed(data.elapsed);
      if (data.eta !== undefined) setEta(data.eta);
      if (data.currentClip) setCurrentClip(data.currentClip);
    };

    const handleDone = (result: {
      jobId: string;
      success: boolean;
      outputPath?: string;
      error?: string;
    }) => {
      if (result.success) {
        setStatus("success");
        setOutputPath(result.outputPath || "");
      } else {
        setStatus("error");
        setError(result.error || "Unknown error");
      }
    };

    // Only set up listeners if API is available
    if (window.api) {
      window.api.onExportProgress((data) => handleProgress(data));
      window.api.onExportDone((result) => handleDone(result));
    }
  }, []);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTimeout(() => {
        setProgress(0);
        setStatus("exporting");
        setError("");
        setOutputPath("");
        setElapsed(0);
        setEta(undefined);
        setCurrentClip("");
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {status === "exporting" && "Exporting Video..."}
            {status === "success" && "Export Complete"}
            {status === "error" && "Export Failed"}
          </DialogTitle>
          <DialogDescription> </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "exporting" && (
            <>
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentClip || "Encoding video..."}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Elapsed: {formatTime(elapsed)}</span>
                  {eta !== undefined && <span>ETA: {formatTime(eta)}</span>}
                </div>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex items-center justify-center">
                <Check className="h-12 w-12 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your video has been exported successfully!
                </p>
                {outputPath && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {outputPath}
                  </p>
                )}
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex items-center justify-center">
                <X className="h-12 w-12 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600">Export failed</p>
                {error && (
                  <p className="text-xs text-muted-foreground">{error}</p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {status === "success" && <Button onClick={onClose}>Close</Button>}
          {status === "error" && (
            <Button onClick={onClose} variant="destructive">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
