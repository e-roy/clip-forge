import { useCallback, useEffect, useMemo, useState } from "react";
import { useUIStore } from "@/store/ui";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import { useProjectStore } from "@/store/project";
import { useVideoPlayback } from "@/lib/useVideoPlayback";
import { useAudioMixer } from "@/lib/useAudioMixer";
import { usePlayheadSync } from "@/lib/usePlayheadSync";
import { useKeyboardControls } from "@/lib/useKeyboardControls";
import { PreviewVideo } from "./PreviewVideo";
import { PreviewControls } from "./PreviewControls";

export function Preview() {
  const { selectedClipId, fitToWindow, setFitToWindow } = useUIStore();
  const { clips } = useClipsStore();
  const {
    playheadTime,
    getTopActiveItemAtTime,
    getAllActiveItemsAtTime,
    setPlayheadTime,
    duration: timelineDuration,
    masterVolume,
    setMasterVolume,
  } = useTimelineStore();
  const { compositionDurationSec } = useProjectStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Get the topmost active item at the current playhead time (for video display)
  const activeItem = useMemo(
    () => getTopActiveItemAtTime(playheadTime),
    [getTopActiveItemAtTime, playheadTime]
  );
  const activeClipId = activeItem?.clipId || selectedClipId;
  const selectedClip = useMemo(
    () => clips.find((clip) => clip.id === activeClipId),
    [clips, activeClipId]
  );

  // When we have a selected clip but no active timeline item, ensure playhead is valid
  useEffect(() => {
    if (selectedClip && !activeItem && selectedClipId) {
      // If playhead is at 0 and we have a clip, it's probably newly loaded
      // Move playhead inside the clip so it becomes active
      if (
        playheadTime === 0 &&
        selectedClip.duration &&
        selectedClip.duration > 0
      ) {
        setPlayheadTime(0.1); // Move slightly inside to activate it
      }
    }
  }, [selectedClip, activeItem, selectedClipId, playheadTime, setPlayheadTime]);

  // Get all active items at the current playhead time (for audio mixing)
  const allActiveItems = useMemo(
    () => getAllActiveItemsAtTime(playheadTime),
    [getAllActiveItemsAtTime, playheadTime]
  );

  // Stop playback if we're playing but have no active content
  useEffect(() => {
    if (isPlaying && !activeItem) {
      setIsPlaying(false);
    }
  }, [isPlaying, activeItem, setIsPlaying]);

  // Use custom hooks for video playback and audio mixing
  const { videoRef, isTransitioning } = useVideoPlayback(
    activeItem || undefined,
    playheadTime,
    isPlaying
  ) as {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isTransitioning: boolean;
  };

  // Audio mixing via Web Audio API
  useAudioMixer(
    allActiveItems,
    playheadTime,
    isPlaying,
    isMuted,
    masterVolume,
    isTransitioning
  );

  // Sync playhead during playback
  usePlayheadSync(videoRef, isPlaying, isTransitioning);

  // Handle play/pause
  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      await videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, videoRef]);

  // Keyboard controls
  useKeyboardControls(togglePlay, playheadTime);

  // Handle seek on timeline
  const handleSeek = useCallback(
    (value: number[]) => {
      const newPlayheadTime = value[0];
      setPlayheadTime(newPlayheadTime);
    },
    [setPlayheadTime]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0] / 100;
      setMasterVolume(newVolume);
    },
    [setMasterVolume]
  );

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Handle skip backward
  const handleSkipBackward = useCallback(() => {
    setPlayheadTime(Math.max(0, playheadTime - 1));
  }, [playheadTime, setPlayheadTime]);

  // Handle skip forward
  const handleSkipForward = useCallback(() => {
    const end = Math.max(timelineDuration, compositionDurationSec);
    setPlayheadTime(Math.min(end, playheadTime + 1));
  }, [playheadTime, timelineDuration, compositionDurationSec, setPlayheadTime]);

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    if (!activeItem) return;

    const nextTime = activeItem.endTime;
    const end = Math.max(timelineDuration, compositionDurationSec);

    // Move to clip end
    setPlayheadTime(Math.min(nextTime, end));

    // Stop if at project end, otherwise continue (next check will stop if no content)
    if (nextTime >= end) {
      setIsPlaying(false);
    }
  }, [activeItem, timelineDuration, compositionDurationSec, setPlayheadTime]);

  return (
    <div className="group relative h-full w-full overflow-hidden bg-secondary/20">
      <PreviewVideo
        videoRef={videoRef}
        selectedClip={selectedClip}
        activeItem={activeItem || undefined}
        fitToWindow={fitToWindow}
        onVideoEnded={handleVideoEnded}
      />
      <PreviewControls
        playheadTime={playheadTime}
        timelineDuration={Math.max(timelineDuration, compositionDurationSec)}
        isPlaying={isPlaying}
        isMuted={isMuted}
        masterVolume={masterVolume}
        fitToWindow={fitToWindow}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onSkipBackward={handleSkipBackward}
        onSkipForward={handleSkipForward}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onFitToWindowChange={setFitToWindow}
      />
    </div>
  );
}
