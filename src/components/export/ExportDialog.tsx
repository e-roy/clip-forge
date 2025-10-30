import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTimelineStore } from "@/store/timeline";
import { useUIStore } from "@/store/ui";
import { Card } from "@/components/ui/card";

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

const PRESETS = {
  youtube1080p: {
    name: "YouTube 1080p",
    resolution: "1080p" as const,
    fps: 30,
    bitrateKbps: 8000,
  },
  youtube720p: {
    name: "YouTube 720p",
    resolution: "720p" as const,
    fps: 30,
    bitrateKbps: 5000,
  },
  source: {
    name: "Source Quality",
    resolution: "source" as const,
    fps: 30,
    bitrateKbps: 10000,
  },
};

export function ExportDialog({
  open,
  onOpenChange,
  onStartExport,
}: ExportDialogProps) {
  const { items } = useTimelineStore();
  const { setAlertDialog } = useUIStore();
  const [resolution, setResolution] = useState<"720p" | "1080p" | "source">(
    "1080p"
  );
  const [fps, setFps] = useState(30);
  const [bitrateKbps, setBitrateKbps] = useState(5000);
  const [outputPath, setOutputPath] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const applyPreset = (preset: {
    name: string;
    resolution: "720p" | "1080p" | "source";
    fps: number;
    bitrateKbps: number;
  }) => {
    setResolution(preset.resolution);
    setFps(preset.fps);
    setBitrateKbps(preset.bitrateKbps);
    setSelectedPreset(preset.name);
  };

  const handleExport = async () => {
    if (!outputPath) {
      setAlertDialog("Output Path Required", "Please select an output path");
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
          <DialogDescription> </DialogDescription>
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
            <Label>Presets</Label>
            <div className="flex gap-2 mt-1">
              <Card
                className={`p-3 cursor-pointer flex-1 transition-colors ${
                  selectedPreset === PRESETS.youtube1080p.name
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => applyPreset(PRESETS.youtube1080p)}
              >
                <div className="text-sm font-medium">
                  {PRESETS.youtube1080p.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  1080p • 30fps • 8 Mbps
                </div>
              </Card>
              <Card
                className={`p-3 cursor-pointer flex-1 transition-colors ${
                  selectedPreset === PRESETS.youtube720p.name
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => applyPreset(PRESETS.youtube720p)}
              >
                <div className="text-sm font-medium">
                  {PRESETS.youtube720p.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  720p • 30fps • 5 Mbps
                </div>
              </Card>
              <Card
                className={`p-3 cursor-pointer flex-1 transition-colors ${
                  selectedPreset === PRESETS.source.name
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => applyPreset(PRESETS.source)}
              >
                <div className="text-sm font-medium">{PRESETS.source.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Original • 30fps • 10 Mbps
                </div>
              </Card>
            </div>
          </div>

          <div>
            <Label>Resolution</Label>
            <select
              value={resolution}
              onChange={(e) => {
                setResolution(e.target.value as "720p" | "1080p" | "source");
                setSelectedPreset(null);
              }}
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
              onChange={(e) => {
                setFps(Number(e.target.value));
                setSelectedPreset(null);
              }}
              min="24"
              max="60"
            />
          </div>

          <div>
            <Label>Bitrate (kbps)</Label>
            <Input
              type="number"
              value={bitrateKbps}
              onChange={(e) => {
                setBitrateKbps(Number(e.target.value));
                setSelectedPreset(null);
              }}
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
