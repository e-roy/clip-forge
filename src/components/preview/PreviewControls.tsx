import { useState, useEffect } from "react";
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
  // Detect if device supports touch (iPad, touch devices)
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if device supports hover - if not, it's a touch device
    const checkTouchDevice = () => {
      // Devices that support hover are desktop with mouse
      // Devices that don't support hover are touch devices (iPad, etc.)
      const prefersHover = window.matchMedia("(hover: hover)").matches;
      setIsTouchDevice(!prefersHover);
    };

    checkTouchDevice();
    // Listen for changes (window resize, orientation change)
    const mediaQuery = window.matchMedia("(hover: hover)");
    const handleChange = () => checkTouchDevice();
    mediaQuery.addEventListener("change", handleChange);
    window.addEventListener("resize", checkTouchDevice);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("resize", checkTouchDevice);
    };
  }, []);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-10 bg-background/20 backdrop-blur-sm p-4 transition-all duration-300 ease-in-out ${
        isTouchDevice
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
      }`}
    >
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
          <div className="ml-2 bg-background/50 rounded-md py-1 px-3">
            <div className="text-xs text-muted-foreground font-bold">
              {formatTime(playheadTime)} / {formatTime(timelineDuration)}
            </div>
          </div>
        </div>

        {/* Fit to Window Toggle */}
        <Toggle pressed={fitToWindow} onPressedChange={onFitToWindowChange}>
          <Maximize className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
}
