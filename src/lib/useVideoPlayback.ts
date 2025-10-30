import { useEffect, useRef, useCallback } from "react";
import { useClipsStore } from "@/store/clips";
import type { TimelineItem } from "@/types/timeline";

export function useVideoPlayback(
  activeItem: TimelineItem | undefined,
  playheadTime: number,
  isPlaying: boolean
) {
  const { clips } = useClipsStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingAttemptRef = useRef(false);

  // Get the selected clip
  const activeClipId = activeItem?.clipId;
  const selectedClip = clips.find((clip) => clip.id === activeClipId);

  // Safe play helper
  const safePlayVideo = useCallback(() => {
    if (
      !videoRef.current ||
      isPlayingAttemptRef.current ||
      !videoRef.current.paused
    )
      return;

    isPlayingAttemptRef.current = true;
    videoRef.current
      .play()
      .catch((error) => console.error("Video play failed:", error))
      .finally(() => {
        isPlayingAttemptRef.current = false;
      });
  }, []);

  // Format video source
  const formatVideoSrc = useCallback((path: string): string => {
    let src = path;
    if (src.includes("\\")) src = src.replace(/\\/g, "/");
    if (!src.startsWith("file://") && !src.startsWith("/")) {
      src = src.match(/^[A-Za-z]:\//) ? `file:///${src}` : `file:///${src}`;
    } else if (src.startsWith("/") && !src.startsWith("file://")) {
      src = `file://${src}`;
    }
    return src;
  }, []);

  // Main video sync effect - simplified
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Ensure we have content to show
    if (!selectedClip || !activeItem) {
      // No active content - pause video and stop playback if playing
      video.pause();
      return;
    }

    // Load correct source
    const videoSrc = formatVideoSrc(selectedClip.path);
    if (video.src !== videoSrc) {
      video.src = videoSrc;
      video.load();
    }

    // Calculate target time
    let targetTime = 0;
    if (activeItem) {
      const timeInClip =
        playheadTime - activeItem.startTime + activeItem.inTime;
      targetTime = Math.max(
        activeItem.inTime,
        Math.min(timeInClip, activeItem.outTime)
      );
    } else {
      targetTime = Math.max(
        0,
        Math.min(playheadTime, selectedClip.duration || 0)
      );
    }

    // Seek if needed
    if (Math.abs(video.currentTime - targetTime) > 0.1) {
      video.currentTime = targetTime;
    }

    // Handle playback
    if (isPlaying && video.paused) {
      safePlayVideo();
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }

    // Keep muted
    video.muted = true;
    video.volume = 0;
  }, [
    selectedClip,
    activeItem,
    playheadTime,
    isPlaying,
    formatVideoSrc,
    safePlayVideo,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

  return { videoRef, isTransitioning: false };
}
