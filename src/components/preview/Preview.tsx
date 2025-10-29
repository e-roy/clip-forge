import { useCallback, useMemo, useState } from "react";
import { useUIStore } from "@/store/ui";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import { useVideoPlayback } from "@/lib/useVideoPlayback";
import { useAudioMixer } from "@/lib/useAudioMixer";
import { usePlayheadSync } from "@/lib/usePlayheadSync";
import { useKeyboardControls } from "@/lib/useKeyboardControls";
import { PreviewVideo } from "./PreviewVideo";
import { PreviewControls } from "./PreviewControls";

export function Preview() {
  const { selectedClipId } = useUIStore();
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fitToWindow, setFitToWindow] = useState(true);

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

  // Get all active items at the current playhead time (for audio mixing)
  const allActiveItems = useMemo(
    () => getAllActiveItemsAtTime(playheadTime),
    [getAllActiveItemsAtTime, playheadTime]
  );

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
    setPlayheadTime(Math.min(timelineDuration, playheadTime + 1));
  }, [playheadTime, timelineDuration, setPlayheadTime]);

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    if (!activeItem) return;

    const nextTime = activeItem.endTime;
    if (nextTime >= timelineDuration) {
      setPlayheadTime(timelineDuration);
      setIsPlaying(false);
    } else {
      setPlayheadTime(nextTime);
    }
  }, [activeItem, timelineDuration, setPlayheadTime]);

  return (
    <div className="flex h-full flex-col bg-secondary/20">
      <PreviewVideo
        videoRef={videoRef}
        selectedClip={selectedClip}
        activeItem={activeItem || undefined}
        fitToWindow={fitToWindow}
        onVideoEnded={handleVideoEnded}
      />
      <PreviewControls
        playheadTime={playheadTime}
        timelineDuration={timelineDuration}
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
