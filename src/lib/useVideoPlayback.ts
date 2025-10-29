import { useEffect, useRef, useState, useCallback } from "react";
import { useClipsStore } from "@/store/clips";
import type { TimelineItem } from "@/types/timeline";

export function useVideoPlayback(
  activeItem: TimelineItem | undefined,
  playheadTime: number,
  isPlaying: boolean
) {
  const { clips } = useClipsStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Track previous timeline item ID to detect changes (not just clip ID)
  const prevItemIdRef = useRef<string | undefined>(undefined);
  // Track if we're currently transitioning between clips
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Track the current loaded video source
  const currentVideoSourceRef = useRef<string>("");

  // Format video source helper
  const formatVideoSrc = useCallback((path: string): string => {
    let src = path;
    if (src.includes("\\")) {
      src = src.replace(/\\/g, "/");
    }
    if (!src.startsWith("file://") && !src.startsWith("/")) {
      if (src.match(/^[A-Za-z]:\//)) {
        src = `file:///${src}`;
      } else {
        src = `file:///${src}`;
      }
    } else if (src.startsWith("/") && !src.startsWith("file://")) {
      src = `file://${src}`;
    }
    return src;
  }, []);

  // Get the selected clip
  const activeClipId = activeItem?.clipId;
  const selectedClip = clips.find((clip) => clip.id === activeClipId);

  // Update video position to match playhead
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // If no clip is active, make sure video is paused
    if (!selectedClip || !activeItem) {
      if (!video.paused) {
        video.pause();
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
        setIsTransitioning(true);
        currentVideoSourceRef.current = videoSrc;

        // Set up one-time listener for when the video is ready
        const handleLoadedData = () => {
          // Ensure video stays muted (audio is handled by Web Audio API)
          video.muted = true;
          video.volume = 0;

          // Seek to the correct time
          video.currentTime = clampedTime;

          // If we should be playing, start playback immediately
          if (isPlaying) {
            // Use a small delay to ensure seeking completes
            setTimeout(() => {
              video.play().catch(() => {
                // Silently handle - playback will resume when video is ready
              });
              setIsTransitioning(false);
            }, 10);
          } else {
            setIsTransitioning(false);
          }
        };

        video.addEventListener("loadeddata", handleLoadedData, { once: true });

        // Also handle errors
        const handleError = () => {
          setIsTransitioning(false);
        };
        video.addEventListener("error", handleError, { once: true });

        // Change the source - this will trigger loading
        video.src = videoSrc;
        video.load();
      } else {
        // Same source, just seek to new position
        video.currentTime = clampedTime;

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
      }
    } else {
      // When playing, ensure video element is also playing
      if (video.paused && !isTransitioning) {
        video.play().catch((error) => {
          console.error("Failed to play video:", error);
        });
      }

      // Only force sync if there's a very large drift (avoid causing stutters)
      const drift = Math.abs(video.currentTime - clampedTime);
      if (drift > 0.5 && !isTransitioning) {
        video.currentTime = clampedTime;
      }
    }
  }, [selectedClip, activeItem, playheadTime, isPlaying, formatVideoSrc]);

  // Mute main video element always (audio is handled by hidden audio elements for mixing)
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = true;
    videoRef.current.volume = 0;
  }, []);

  return {
    videoRef,
    isTransitioning,
  };
}
