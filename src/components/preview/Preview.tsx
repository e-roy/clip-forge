import { useEffect, useRef, useState, useCallback } from "react";
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
  const {
    playheadTime,
    getTopActiveItemAtTime,
    setPlayheadTime,
    duration: timelineDuration,
  } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [fitToWindow, setFitToWindow] = useState(true);

  // Get the topmost active item at the current playhead time
  const activeItem = getTopActiveItemAtTime(playheadTime);
  const activeClipId = activeItem?.clipId || selectedClipId;
  const selectedClip = clips.find((clip) => clip.id === activeClipId);

  // Track previous timeline item ID to detect changes (not just clip ID)
  const prevItemIdRef = useRef<string | undefined>(undefined);
  // Track if we're currently transitioning between clips
  const isTransitioningRef = useRef(false);
  // Track the current loaded video source
  const currentVideoSourceRef = useRef<string>("");

  // Update video position to match playhead
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // If no clip is active, make sure video is paused
    if (!selectedClip || !activeItem) {
      if (!video.paused) {
        video.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Calculate what time in the clip the playhead is at
    const timeInClip = playheadTime - activeItem.startTime + activeItem.inTime;

    // Clamp to the trimmed range (inTime to outTime)
    const clampedTime = Math.max(
      activeItem.inTime,
      Math.min(timeInClip, activeItem.outTime)
    );

    const videoSrc = formatVideoSrc(selectedClip.path);

    // If timeline item changed (even if same source clip), reposition video
    if (prevItemIdRef.current !== activeItem.id) {
      prevItemIdRef.current = activeItem.id;

      // Check if we need to change the video source
      const needsSourceChange = currentVideoSourceRef.current !== videoSrc;

      if (needsSourceChange) {
        isTransitioningRef.current = true;
        currentVideoSourceRef.current = videoSrc;

        // Set up one-time listener for when the video is ready
        const handleLoadedData = () => {
          // Seek to the correct time
          video.currentTime = clampedTime;
          setCurrentTime(clampedTime);

          // If we should be playing, start playback immediately
          if (isPlaying) {
            // Use a small delay to ensure seeking completes
            setTimeout(() => {
              video.play().catch(() => {
                // Silently handle - playback will resume when video is ready
              });
              isTransitioningRef.current = false;
            }, 10);
          } else {
            isTransitioningRef.current = false;
          }
        };

        video.addEventListener("loadeddata", handleLoadedData, { once: true });

        // Also handle errors
        const handleError = () => {
          isTransitioningRef.current = false;
        };
        video.addEventListener("error", handleError, { once: true });

        // Change the source - this will trigger loading
        video.src = videoSrc;
        video.load();
      } else {
        // Same source, just seek to new position
        video.currentTime = clampedTime;
        setCurrentTime(clampedTime);

        // Ensure playback continues if we should be playing
        if (isPlaying && video.paused) {
          video.play().catch((error) => {
            console.error("Failed to resume playback:", error);
          });
        }
      }

      return;
    }

    // Only sync video when NOT playing, or if there's a large discrepancy
    if (!isPlaying) {
      // When paused, keep video synced with playhead
      const drift = Math.abs(video.currentTime - clampedTime);
      if (drift > 0.05) {
        video.currentTime = clampedTime;
        setCurrentTime(clampedTime);
      }
    } else {
      // When playing, ensure video element is also playing
      if (video.paused && !isTransitioningRef.current) {
        video.play().catch((error) => {
          console.error("Failed to play video:", error);
        });
      }

      // Only force sync if there's a very large drift (avoid causing stutters)
      // The requestAnimationFrame loop will handle normal sync
      const drift = Math.abs(video.currentTime - clampedTime);
      if (drift > 0.5 && !isTransitioningRef.current) {
        video.currentTime = clampedTime;
      }
    }
  }, [selectedClip, activeItem, playheadTime, isPlaying]);

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

  // Handle time updates from video element
  const handleTimeUpdate = () => {
    if (videoRef.current && selectedClip) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Update timeline playhead during video playback using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !videoRef.current || !activeItem) return;

    let animationFrameId: number;
    let lastUpdateTime = performance.now();

    const updatePlayhead = (currentTime: number) => {
      const video = videoRef.current;
      if (!video || !activeItem) return;

      // Calculate elapsed time since last update
      const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
      lastUpdateTime = currentTime;

      // Get current video time relative to the clip's trim
      const videoTimeInClip = video.currentTime;

      // Calculate where the playhead should be based on video position
      const expectedPlayheadTime =
        activeItem.startTime + (videoTimeInClip - activeItem.inTime);

      // Check if we've reached or passed the end of the current item
      if (expectedPlayheadTime >= activeItem.endTime - 0.016) {
        // At or past end of current item
        // Check if there's more content ahead
        const nextPlayheadTime = activeItem.endTime;

        if (nextPlayheadTime >= timelineDuration) {
          // End of timeline
          setPlayheadTime(timelineDuration);
          setIsPlaying(false);
          if (video && !video.paused) {
            video.pause();
          }
          return;
        }

        // Move to the end of this item (which will trigger loading the next item)
        setPlayheadTime(nextPlayheadTime);
      } else if (
        !isTransitioningRef.current &&
        !video.paused &&
        video.readyState >= 2
      ) {
        // Normal playback - sync playhead to video
        // Only update if the difference is significant to avoid jitter
        const drift = Math.abs(playheadTime - expectedPlayheadTime);
        if (drift > 0.016) {
          // ~1 frame at 60fps
          setPlayheadTime(expectedPlayheadTime);
        }
      } else if (isTransitioningRef.current) {
        // During transition, keep advancing playhead
        const nextTime = playheadTime + deltaTime;
        if (nextTime >= timelineDuration) {
          setPlayheadTime(timelineDuration);
          setIsPlaying(false);
          return;
        }
        setPlayheadTime(nextTime);
      }

      // Continue the loop
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };

    animationFrameId = requestAnimationFrame(updatePlayhead);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playheadTime, timelineDuration, setPlayheadTime, activeItem]);

  // Handle video ended - should not happen in continuous playback mode
  // But we handle it just in case
  const handleVideoEnded = useCallback(() => {
    // Video element ended - we should advance to the next item if available
    if (!activeItem) return;

    const nextTime = activeItem.endTime;
    if (nextTime >= timelineDuration) {
      // End of timeline
      setPlayheadTime(timelineDuration);
      setIsPlaying(false);
    } else {
      // Move playhead to the end of this item to trigger next item
      setPlayheadTime(nextTime);
    }
  }, [activeItem, timelineDuration, setPlayheadTime, setIsPlaying]);

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
          togglePlay();
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          // Move playhead back 1 second on timeline
          setPlayheadTime(Math.max(0, playheadTime - 1));
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          // Move playhead forward 1 second on timeline
          setPlayheadTime(Math.min(timelineDuration, playheadTime + 1));
          break;
        }
        case ",": {
          e.preventDefault();
          // Move playhead back 1 frame (~0.033s at 30fps)
          setPlayheadTime(Math.max(0, playheadTime - 0.033));
          break;
        }
        case ".": {
          e.preventDefault();
          // Move playhead forward 1 frame
          setPlayheadTime(Math.min(timelineDuration, playheadTime + 0.033));
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playheadTime, timelineDuration, setPlayheadTime, togglePlay]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper function to format video source paths
  const formatVideoSrc = (path: string): string => {
    let src = path;

    // Convert Windows backslashes to forward slashes
    if (src.includes("\\")) {
      src = src.replace(/\\/g, "/");
    }

    // Add file:// protocol if not already present
    if (!src.startsWith("file://") && !src.startsWith("/")) {
      // For Windows absolute paths (C:/Users/...), add three slashes
      if (src.match(/^[A-Za-z]:\//)) {
        src = `file:///${src}`;
      } else {
        src = `file:///${src}`;
      }
    } else if (src.startsWith("/") && !src.startsWith("file://")) {
      src = `file://${src}`;
    }

    return src;
  };

  // Note: Video source is managed in the main playhead sync effect above

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
    <div className="flex h-full flex-col bg-secondary/20">
      {/* Video Player */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        {/* Video */}
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleDurationChange}
          onEnded={handleVideoEnded}
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
