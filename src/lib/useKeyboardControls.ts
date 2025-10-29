import { useEffect } from "react";
import { useTimelineStore } from "@/store/timeline";

export function useKeyboardControls(
  togglePlay: () => void,
  playheadTime: number
) {
  const { setPlayheadTime, duration: timelineDuration } = useTimelineStore();

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
}
