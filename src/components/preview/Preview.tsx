import { useEffect, useRef, useState } from "react";
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
import { useUIStore } from "@/store/ui";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import { PlayIcon } from "lucide-react";

export function Preview() {
  const { selectedClipId } = useUIStore();
  const { clips } = useClipsStore();
  const { playheadTime, getActiveItemAtTime } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [fitToWindow, setFitToWindow] = useState(true);

  // Get the active item from the timeline or the selected clip
  const activeItem = getActiveItemAtTime(playheadTime, 1);
  const activeClipId = activeItem?.clipId || selectedClipId;
  const selectedClip = clips.find((clip) => clip.id === activeClipId);

  // Update video source when clip changes
  useEffect(() => {
    if (videoRef.current && selectedClip) {
      videoRef.current.load();
      setIsPlaying(false);

      // If we have an active item, calculate the time within the clip
      if (activeItem) {
        const timeInClip =
          playheadTime - activeItem.startTime + activeItem.inTime;
        const clampedTime = Math.max(
          0,
          Math.min(timeInClip, selectedClip.duration)
        );
        setCurrentTime(clampedTime);
        videoRef.current.currentTime = clampedTime;
      } else {
        setCurrentTime(0);
        videoRef.current.currentTime = 0;
      }
    }
  }, [activeClipId, selectedClip, activeItem, playheadTime]);

  // Sync state with video element play/pause events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [activeClipId]);

  // Handle time updates
  const handleTimeUpdate = () => {
    if (videoRef.current && selectedClip) {
      // Don't update if we have an active item (playhead controls it)
      if (!activeItem) {
        setCurrentTime(videoRef.current.currentTime);
      }
    }
  };

  // Handle duration change
  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Handle play/pause
  const togglePlay = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      await videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle seek
  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0] / 100;
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ": {
          e.preventDefault();
          if (videoRef.current) {
            // Read playing state directly from video element
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 1
            );
          }
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration,
              videoRef.current.currentTime + 1
            );
          }
          break;
        }
        case ",": {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 0.033
            );
          }
          break;
        }
        case ".": {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration,
              videoRef.current.currentTime + 0.033
            );
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  // Format file path for video element
  // For Electron with webSecurity: false, we can use direct paths
  // But we need to handle Windows paths properly
  let videoSrc = selectedClip.path;

  // Convert Windows backslashes to forward slashes
  if (videoSrc.includes("\\")) {
    videoSrc = videoSrc.replace(/\\/g, "/");
  }

  // Add file:// protocol if not already present
  if (!videoSrc.startsWith("file://") && !videoSrc.startsWith("/")) {
    // For Windows absolute paths (C:/Users/...), add three slashes
    if (videoSrc.match(/^[A-Za-z]:\//)) {
      videoSrc = `file:///${videoSrc}`;
    } else {
      videoSrc = `file:///${videoSrc}`;
    }
  } else if (videoSrc.startsWith("/") && !videoSrc.startsWith("file://")) {
    videoSrc = `file://${videoSrc}`;
  }

  return (
    <div className="flex h-full flex-col bg-secondary/20">
      {/* Video Player */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <video
          ref={videoRef}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleDurationChange}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => console.error("Video playback error:", e)}
          className={`${
            fitToWindow ? "max-h-full max-w-full" : "h-full w-full"
          } object-contain`}
          style={{ display: "block" }}
          controls={false}
          playsInline
        />
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background p-4">
        {/* Progress Bar */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, currentTime - 1);
                }
              }}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.min(
                    duration,
                    currentTime + 1
                  );
                }
              }}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Time Display */}
            <div className="ml-2 text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>

          {/* Fit to Window Toggle */}
          <Toggle pressed={fitToWindow} onPressedChange={setFitToWindow}>
            <Maximize className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
    </div>
  );
}
