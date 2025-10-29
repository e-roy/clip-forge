import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipForward,
  SkipBack,
} from "lucide-react";

interface PreviewControlsProps {
  playheadTime: number;
  timelineDuration: number;
  isPlaying: boolean;
  isMuted: boolean;
  masterVolume: number;
  fitToWindow: boolean;
  onTogglePlay: () => void;
  onSeek: (value: number[]) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onFitToWindowChange: (pressed: boolean) => void;
}

export function PreviewControls({
  playheadTime,
  timelineDuration,
  isPlaying,
  isMuted,
  masterVolume,
  fitToWindow,
  onTogglePlay,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onToggleMute,
  onVolumeChange,
  onFitToWindowChange,
}: PreviewControlsProps) {
  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-t border-border bg-background p-4">
      {/* Progress Bar */}
      <div className="mb-3">
        <Slider
          value={[playheadTime]}
          max={timelineDuration || 1}
          step={0.1}
          onValueChange={onSeek}
          className="w-full"
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onSkipBackward}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" onClick={onTogglePlay}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onSkipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Time Display */}
          <div className="ml-2 text-xs text-muted-foreground">
            {formatTime(playheadTime)} / {formatTime(timelineDuration)}
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleMute}>
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[masterVolume * 100]}
            max={100}
            step={1}
            onValueChange={onVolumeChange}
            className="w-20"
          />
        </div>

        {/* Fit to Window Toggle */}
        <Toggle pressed={fitToWindow} onPressedChange={onFitToWindowChange}>
          <Maximize className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
}
