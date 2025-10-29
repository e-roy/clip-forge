import { useEffect } from "react";
import { useTimelineStore } from "@/store/timeline";

export function usePlayheadSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isPlaying: boolean,
  isTransitioning: boolean
) {
  const {
    playheadTime,
    duration: timelineDuration,
    setPlayheadTime,
    getTopActiveItemAtTime,
  } = useTimelineStore();

  // Update timeline playhead during video playback using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    let animationFrameId: number;

    const updatePlayhead = () => {
      const video = videoRef.current;
      // Get current activeItem from store on each frame to avoid stale closure
      const currentActiveItem = getTopActiveItemAtTime(
        useTimelineStore.getState().playheadTime
      );
      if (!video || !currentActiveItem) return;

      // Get current video time relative to the clip's trim
      const videoTimeInClip = video.currentTime;

      // Calculate where the playhead should be based on video position
      const expectedPlayheadTime =
        currentActiveItem.startTime +
        (videoTimeInClip - currentActiveItem.inTime);

      // Skip all sync operations during transitions to prevent sync issues
      if (isTransitioning) {
        // During transition, don't do anything - let the video element drive timing
        // This prevents sync issues when switching between clips
        animationFrameId = requestAnimationFrame(updatePlayhead);
        return;
      }

      // Check if we've reached or passed the end of the current item
      // Add small buffer (50ms) to prevent premature switching and sync fighting
      if (expectedPlayheadTime >= currentActiveItem.endTime - 0.05) {
        // At or past end of current item
        // Check if there's more content ahead
        const nextPlayheadTime = currentActiveItem.endTime;

        if (nextPlayheadTime >= timelineDuration) {
          // End of timeline
          setPlayheadTime(timelineDuration);
          video.pause();
          return;
        }

        // Move to the end of this item (which will trigger loading the next item)
        setPlayheadTime(nextPlayheadTime);
      } else if (!video.paused && video.readyState >= 2) {
        // Normal playback - sync playhead to video
        // Only update if the difference is significant to avoid jitter
        const drift = Math.abs(playheadTime - expectedPlayheadTime);
        if (drift > 0.016) {
          // ~1 frame at 60fps
          setPlayheadTime(expectedPlayheadTime);
        }
      }

      // Continue the loop
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };

    animationFrameId = requestAnimationFrame(updatePlayhead);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    isPlaying,
    playheadTime,
    timelineDuration,
    setPlayheadTime,
    getTopActiveItemAtTime,
    isTransitioning,
    videoRef,
  ]);
}
