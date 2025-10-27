import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTimelineStore } from "@/store/timeline";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartExport: (settings: {
    outputPath: string;
    resolution: "720p" | "1080p" | "source";
    fps: number;
    bitrateKbps: number;
  }) => void;
}

export function ExportDialog({
  open,
  onOpenChange,
  onStartExport,
}: ExportDialogProps) {
  const { items } = useTimelineStore();
  const [resolution, setResolution] = useState<"720p" | "1080p" | "source">(
    "1080p"
  );
  const [fps, setFps] = useState(30);
  const [bitrateKbps, setBitrateKbps] = useState(5000);
  const [outputPath, setOutputPath] = useState("");

  const handleExport = async () => {
    if (!outputPath) {
      alert("Please select an output path");
      return;
    }

    onStartExport({
      outputPath,
      resolution,
      fps,
      bitrateKbps,
    });
    onOpenChange(false);
  };

  const handleSelectOutput = async () => {
    const result = await window.api.saveFileDialog({
      defaultPath: `export_${Date.now()}.mp4`,
      filters: [{ name: "Video Files", extensions: ["mp4"] }],
    });
    if (result) {
      setOutputPath(result);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Output Path</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="Select output path..."
                readOnly
              />
              <Button onClick={handleSelectOutput} variant="outline">
                Browse
              </Button>
            </div>
          </div>

          <div>
            <Label>Resolution</Label>
            <select
              value={resolution}
              onChange={(e) =>
                setResolution(e.target.value as "720p" | "1080p" | "source")
              }
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="720p">720p (1280x720)</option>
              <option value="1080p">1080p (1920x1080)</option>
              <option value="source">Source (Original)</option>
            </select>
          </div>

          <div>
            <Label>FPS</Label>
            <Input
              type="number"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              min="24"
              max="60"
            />
          </div>

          <div>
            <Label>Bitrate (kbps)</Label>
            <Input
              type="number"
              value={bitrateKbps}
              onChange={(e) => setBitrateKbps(Number(e.target.value))}
              min="1000"
              max="20000"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "clip" : "clips"} on timeline
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!outputPath}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
