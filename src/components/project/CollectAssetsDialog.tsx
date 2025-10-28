import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface CollectAssetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  currentFile?: string;
  onComplete: () => void;
  error?: string;
}

export function CollectAssetsDialog({
  open,
  onOpenChange,
  progress,
  currentFile,
  onComplete,
  error,
}: CollectAssetsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collecting Assets</DialogTitle>
          <DialogDescription>
            Copying media files into the project assets folder...
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {currentFile && (
            <div className="text-sm text-muted-foreground truncate">
              {currentFile}
            </div>
          )}
          <Progress value={progress} />
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          {progress === 100 && !error && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="h-4 w-4" />
              <span>All assets collected successfully!</span>
            </div>
          )}
          {progress === 100 && (
            <Button onClick={onComplete} className="w-full">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
