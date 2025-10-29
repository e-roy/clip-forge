import { PlayIcon } from "lucide-react";
import type { TimelineItem } from "@/types/timeline";

interface PreviewVideoProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  selectedClip: { id: string; path: string } | undefined;
  activeItem: TimelineItem | undefined;
  fitToWindow: boolean;
  onVideoEnded: () => void;
}

export function PreviewVideo({
  videoRef,
  selectedClip,
  // activeItem,
  fitToWindow,
  onVideoEnded,
}: PreviewVideoProps) {
  // No clip selected state
  if (!selectedClip) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary/20">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <PlayIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a clip to preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-secondary/20">
      {/* Video Player */}
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden ${
          fitToWindow ? "" : "p-4"
        }`}
      >
        {/* Video */}
        <video
          ref={videoRef}
          onEnded={onVideoEnded}
          onError={(e) => console.error("Video playback error:", e)}
          className={`${
            fitToWindow
              ? "h-full w-full object-cover"
              : "max-h-full max-w-full object-contain"
          }`}
          style={{ display: "block" }}
          controls={false}
          playsInline
          muted
          preload="auto"
        />
      </div>
    </div>
  );
}
