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
import * as audioRegistry from "@/lib/audio-registry";

export function Preview() {
  const { selectedClipId } = useUIStore();
  const { clips } = useClipsStore();
  const {
    playheadTime,
    getTopActiveItemAtTime,
    getAllActiveItemsAtTime,
    setPlayheadTime,
    duration: timelineDuration,
    tracks,
    masterVolume,
    setMasterVolume,
  } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fitToWindow, setFitToWindow] = useState(true);

  // Get the topmost active item at the current playhead time (for video display)
  const activeItem = getTopActiveItemAtTime(playheadTime);
  const activeClipId = activeItem?.clipId || selectedClipId;
  const selectedClip = clips.find((clip) => clip.id === activeClipId);

  // Get all active items at the current playhead time (for audio mixing)
  const allActiveItems = getAllActiveItemsAtTime(playheadTime);

  // Track previous timeline item ID to detect changes (not just clip ID)
  const prevItemIdRef = useRef<string | undefined>(undefined);
  // Track if we're currently transitioning between clips
  const isTransitioningRef = useRef(false);
  // Track the current loaded video source
  const currentVideoSourceRef = useRef<string>("");

  // Web Audio API refs for mixing multiple audio sources
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioSourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(
    new Map()
  );
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const analyserNodesRef = useRef<Map<number, AnalyserNode>>(new Map());

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

  // Mute main video element always (audio is handled by hidden audio elements for mixing)
  useEffect(() => {
    if (!videoRef.current) return;

    // Always mute main video element and set volume to 0
    // Audio is handled by hidden audio elements connected to Web Audio API for proper mixing
    // This ensures consistent audio metering and prevents duplicate playback
    videoRef.current.muted = true;
    videoRef.current.volume = 0;

    // Note: masterVolume is applied to hidden audio elements, not video element
  }, []);

  // Initialize Web Audio Context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      audioRegistry.setAudioContext(audioContextRef.current);
    }

    return () => {
      // Clean up audio context on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        audioRegistry.setAudioContext(null);
      }
      audioRegistry.clearAnalyserNodes();
    };
  }, []);

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

  // Helper to calculate time in clip for an item
  const calculateTimeInClip = useCallback(
    (item: (typeof allActiveItems)[0], time: number) => {
      const timeInClip = time - item.startTime + item.inTime;
      return Math.max(item.inTime, Math.min(timeInClip, item.outTime));
    },
    []
  );

  // Manage audio elements for multi-track audio mixing
  useEffect(() => {
    if (!audioContextRef.current || !videoRef.current) return;
    const context = audioContextRef.current;

    // Clean up audio elements for muted tracks or items no longer active
    const activeItemIds = new Set(allActiveItems.map((item) => item.id));

    // First, clean up muted tracks and items no longer active
    audioElementRefs.current.forEach((audioEl, itemId) => {
      const gainNode = gainNodesRef.current.get(itemId);

      if (!activeItemIds.has(itemId)) {
        // Item no longer active - instant cutoff for smooth transitions
        if (gainNode) {
          gainNode.gain.cancelScheduledValues(context.currentTime);
          // Instant cutoff (0.001s) for smooth item transitions
          gainNode.gain.setValueAtTime(0, context.currentTime + 0.001);

          // Immediate cleanup without delay
          audioEl.pause();
          audioEl.src = "";
          audioElementRefs.current.delete(itemId);
          audioSourceNodesRef.current.delete(itemId);
          gainNodesRef.current.delete(itemId);
        } else {
          audioEl.pause();
          audioEl.src = "";
          audioElementRefs.current.delete(itemId);
          audioSourceNodesRef.current.delete(itemId);
          gainNodesRef.current.delete(itemId);
        }
        return;
      }

      const item = allActiveItems.find((i) => i.id === itemId);
      if (!item) return;

      const track = tracks.find((t) => t.trackNumber === item.trackId);
      if (track && track.muted && gainNode) {
        // Track became muted - instant cutoff
        gainNode.gain.cancelScheduledValues(context.currentTime);
        gainNode.gain.setValueAtTime(0, context.currentTime + 0.001);

        // Immediate cleanup without delay
        audioEl.pause();
        audioEl.src = "";
        audioElementRefs.current.delete(itemId);
        audioSourceNodesRef.current.delete(itemId);
        gainNodesRef.current.delete(itemId);
      }
    });

    // Create or update audio elements for unmuted active items
    allActiveItems.forEach((item) => {
      const track = tracks.find((t) => t.trackNumber === item.trackId);
      const clip = clips.find((c) => c.id === item.clipId);

      if (!clip || !track || track.muted) return;

      const isNewItem = !audioElementRefs.current.has(item.id);

      // Create audio element if it doesn't exist
      if (isNewItem) {
        const audioEl = document.createElement("audio");
        audioEl.src = formatVideoSrc(clip.path);
        audioEl.preload = "auto";
        audioEl.muted = isMuted;
        audioElementRefs.current.set(item.id, audioEl);

        // Create source node
        const sourceNode = context.createMediaElementSource(audioEl);
        audioSourceNodesRef.current.set(item.id, sourceNode);

        // Create or get analyser node for this track
        let analyserNode = analyserNodesRef.current.get(item.trackId);
        let isNewAnalyser = false;
        if (!analyserNode) {
          analyserNode = context.createAnalyser();
          analyserNode.fftSize = 256;
          analyserNode.smoothingTimeConstant = 0.3;
          analyserNodesRef.current.set(item.trackId, analyserNode);
          isNewAnalyser = true;
        }

        // Create gain node and connect - start immediately for smooth transitions
        const gainNode = context.createGain();
        // Instant start (0.001s) for seamless item transitions
        gainNode.gain.setValueAtTime(
          track.volume * masterVolume,
          context.currentTime
        );
        gainNodesRef.current.set(item.id, gainNode);

        sourceNode.connect(gainNode);
        gainNode.connect(analyserNode);

        // Only connect analyser to destination once per track
        if (isNewAnalyser) {
          analyserNode.connect(context.destination);
          // Register with global registry
          audioRegistry.setAnalyserNode(item.trackId, analyserNode);
        }

        // Once loaded, set to correct time and start playing if needed
        audioEl.addEventListener(
          "loadeddata",
          () => {
            // Read current playheadTime from store to ensure consistency
            const currentPlayheadTime =
              useTimelineStore.getState().playheadTime;
            const timeInClip = calculateTimeInClip(item, currentPlayheadTime);
            audioEl.currentTime = timeInClip;

            // Start playing immediately if we should be playing
            if (isPlaying) {
              audioEl.play().catch(() => {});
            }
          },
          { once: true }
        );

        // Also try to start playing immediately if already loaded
        if (audioEl.readyState >= 4) {
          const currentPlayheadTime = useTimelineStore.getState().playheadTime;
          const timeInClip = calculateTimeInClip(item, currentPlayheadTime);
          audioEl.currentTime = timeInClip;
          if (isPlaying) {
            audioEl.play().catch(() => {});
          }
        }
      }

      // Update gain node volume if changed (instant for smooth playback)
      const gainNode = gainNodesRef.current.get(item.id);
      if (gainNode) {
        // Instant update for volume changes
        gainNode.gain.setValueAtTime(
          track.volume * masterVolume,
          context.currentTime
        );
      }

      // Update mute state and ensure playback
      const audioEl = audioElementRefs.current.get(item.id);
      if (audioEl) {
        audioEl.muted = isMuted;

        // Ensure the audio element is at the correct position and playing state
        if (audioEl.readyState >= 2) {
          const timeInClip = calculateTimeInClip(item, playheadTime);
          const drift = Math.abs(audioEl.currentTime - timeInClip);

          // New items need immediate sync, existing items can have more tolerance
          const shouldSync = isNewItem ? drift > 0.001 : drift > 0.03;

          if (shouldSync) {
            audioEl.currentTime = timeInClip;
          }

          // Ensure playback state is synced
          if (isPlaying && audioEl.paused) {
            audioEl.play().catch(() => {});
          } else if (!isPlaying && !audioEl.paused) {
            audioEl.pause();
          }
        }
      }
    });

    // Resume audio context if suspended
    if (context.state === "suspended") {
      context.resume();
    }
  }, [
    allActiveItems,
    tracks,
    clips,
    isMuted,
    masterVolume,
    isPlaying,
    playheadTime,
    formatVideoSrc,
    calculateTimeInClip,
  ]);

  // Separate effect to sync audio playback position and state
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Sync playback state immediately when isPlaying changes
    audioElementRefs.current.forEach((audioEl, itemId) => {
      const item = allActiveItems.find((i) => i.id === itemId);
      if (!item) return;

      const track = tracks.find((t) => t.trackNumber === item.trackId);
      if (!track || track.muted) return;

      // Sync playback state
      if (isPlaying && audioEl.paused) {
        audioEl.play().catch(() => {});
      } else if (!isPlaying && !audioEl.paused) {
        audioEl.pause();
      }
    });

    // Use requestAnimationFrame to sync position during playback
    let rafId: number;
    if (isPlaying) {
      const syncLoop = () => {
        // Read current playheadTime from store on each frame to avoid stale closure
        const currentPlayheadTime = useTimelineStore.getState().playheadTime;

        audioElementRefs.current.forEach((audioEl, itemId) => {
          const item = allActiveItems.find((i) => i.id === itemId);
          if (!item) return;

          const track = tracks.find((t) => t.trackNumber === item.trackId);
          if (!track || track.muted) return;

          const timeInClip = calculateTimeInClip(item, currentPlayheadTime);

          // Only seek if the drift is significant (more than 0.03s, ~1 frame at 30fps)
          const drift = Math.abs(audioEl.currentTime - timeInClip);
          if (audioEl.readyState >= 2 && drift > 0.03) {
            audioEl.currentTime = timeInClip;
          }
        });

        if (isPlaying && video.paused === false) {
          rafId = requestAnimationFrame(syncLoop);
        }
      };
      rafId = requestAnimationFrame(syncLoop);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [allActiveItems, playheadTime, isPlaying, tracks, calculateTimeInClip]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioElementRefs.current.forEach((audioEl) => {
        audioEl.pause();
        audioEl.src = "";
      });
      audioElementRefs.current.clear();
      audioSourceNodesRef.current.clear();
      gainNodesRef.current.clear();
    };
  }, []);

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

  // Update timeline playhead during video playback using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    let animationFrameId: number;
    let lastUpdateTime = performance.now();

    const updatePlayhead = (currentTime: number) => {
      const video = videoRef.current;
      // Get current activeItem from store on each frame to avoid stale closure
      const currentActiveItem = getTopActiveItemAtTime(
        useTimelineStore.getState().playheadTime
      );
      if (!video || !currentActiveItem) return;

      // Calculate elapsed time since last update
      const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
      lastUpdateTime = currentTime;

      // Get current video time relative to the clip's trim
      const videoTimeInClip = video.currentTime;

      // Calculate where the playhead should be based on video position
      const expectedPlayheadTime =
        currentActiveItem.startTime +
        (videoTimeInClip - currentActiveItem.inTime);

      // Check if we've reached or passed the end of the current item
      if (expectedPlayheadTime >= currentActiveItem.endTime - 0.016) {
        // At or past end of current item
        // Check if there's more content ahead
        const nextPlayheadTime = currentActiveItem.endTime;

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
  }, [
    isPlaying,
    playheadTime,
    timelineDuration,
    setPlayheadTime,
    getTopActiveItemAtTime,
  ]);

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

  // Handle seek on timeline
  const handleSeek = (value: number[]) => {
    const newPlayheadTime = value[0];
    setPlayheadTime(newPlayheadTime);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setMasterVolume(newVolume);
  };

  // Handle mute toggle
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    // Main video element stays muted (audio is handled by hidden elements)
    // Mute/unmute all hidden audio elements
    audioElementRefs.current.forEach((audioEl) => {
      audioEl.muted = newMuteState;
    });
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
          onEnded={handleVideoEnded}
          onError={(e) => console.error("Video playback error:", e)}
          className={`${
            fitToWindow ? "max-h-full max-w-full" : "h-full w-full"
          } object-contain`}
          style={{ display: "block" }}
          controls={false}
          playsInline
          muted
          preload="auto"
        />
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background p-4">
        {/* Progress Bar */}
        <div className="mb-3">
          <Slider
            value={[playheadTime]}
            max={timelineDuration || 1}
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
                setPlayheadTime(Math.max(0, playheadTime - 1));
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
                setPlayheadTime(Math.min(timelineDuration, playheadTime + 1));
              }}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Time Display */}
            <div className="ml-2 text-xs text-muted-foreground">
              {formatTime(playheadTime)} / {formatTime(timelineDuration)}
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
              value={[masterVolume * 100]}
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
