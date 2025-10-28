import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveArchive: () => void;
  isComplete: boolean;
  outputPath?: string;
}

export function ArchiveDialog({
  open,
  onOpenChange,
  onSaveArchive,
  isComplete,
  outputPath,
}: ArchiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Archive</DialogTitle>
          <DialogDescription>
            Create a portable archive of your project and all its assets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isComplete && (
            <Button onClick={onSaveArchive} className="w-full">
              Choose Archive Location
            </Button>
          )}
          {isComplete && outputPath && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Check className="h-4 w-4" />
                <span>Archive created successfully!</span>
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {outputPath}
              </div>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
