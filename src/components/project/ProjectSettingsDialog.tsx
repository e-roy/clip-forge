import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/project";

export function ProjectSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { compositionDurationSec, setCompositionDuration } = useProjectStore();
  const [value, setValue] = useState<number>(compositionDurationSec);

  useEffect(() => {
    if (open) setValue(compositionDurationSec);
  }, [open, compositionDurationSec]);

  const apply = () => {
    setCompositionDuration(Math.max(0, value));
    onOpenChange(false);
  };

  const presets = [30, 60, 120, 300];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">Composition duration (seconds)</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              className="h-8 w-28 rounded border border-border bg-background px-2 text-sm"
              value={Math.round(value)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setValue(v);
              }}
            />
            <div className="flex items-center gap-1">
              {presets.map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue(p)}
                >
                  {p}s
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
