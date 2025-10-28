import { Eye, EyeOff, Lock, LockOpen, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrackControlsProps {
  trackId: string;
  height: number;
  isVisible?: boolean;
  isLocked?: boolean;
  isMuted?: boolean;
}

export function TrackControls({
  //   trackId,
  height,
  isVisible = true,
  isLocked = false,
  isMuted = false,
}: TrackControlsProps) {
  return (
    <div
      className="flex items-center justify-center gap-1 border-b border-border"
      style={{ height: `${height}px` }}
    >
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-7 w-7 p-0 opacity-40"
        title="Show/hide track"
      >
        {isVisible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-7 w-7 p-0 opacity-40"
        title="Lock track"
      >
        {isLocked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <LockOpen className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-7 w-7 p-0 opacity-40"
        title="Mute track"
      >
        {isMuted ? (
          <VolumeX className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
