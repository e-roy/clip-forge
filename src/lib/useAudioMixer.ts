import { useEffect, useRef } from "react";
import { useClipsStore } from "@/store/clips";
import { useTimelineStore } from "@/store/timeline";
import * as audioRegistry from "@/lib/audio-registry";
import type { TimelineItem } from "@/types/timeline";

export function useAudioMixer(
  allActiveItems: TimelineItem[],
  playheadTime: number,
  isPlaying: boolean,
  isMuted: boolean,
  masterVolume: number,
  isTransitioning: boolean
) {
  const { clips } = useClipsStore();
  const { tracks } = useTimelineStore();

  // Web Audio API refs for mixing multiple audio sources
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioSourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(
    new Map()
  );
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const analyserNodesRef = useRef<Map<number, AnalyserNode>>(new Map());

  // Format video source helper
  const formatVideoSrc = (path: string): string => {
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
  };

  // Helper to calculate time in clip for an item
  const calculateTimeInClip = (item: TimelineItem, time: number) => {
    const timeInClip = time - item.startTime + item.inTime;
    return Math.max(item.inTime, Math.min(timeInClip, item.outTime));
  };

  // Helper to round to audio sample boundaries (48kHz = 0.0000208333s per sample)
  // This prevents clocking errors when seeking
  const roundToSampleBoundary = (time: number): number => {
    const sampleRate = 48000;
    const samples = Math.round(time * sampleRate);
    return samples / sampleRate;
  };

  // Initialize Web Audio Context with standard sample rate (48kHz for video)
  useEffect(() => {
    if (!audioContextRef.current) {
      // Use 48kHz sample rate which is standard for video formats
      // This helps prevent sample rate mismatch issues when mixing different clips
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
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

  // Manage audio elements for multi-track audio mixing
  useEffect(() => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;

    // Clean up audio elements for muted tracks or items no longer active
    const activeItemIds = new Set(allActiveItems.map((item) => item.id));

    // First, clean up muted tracks and items no longer active
    const itemsToCleanup: string[] = [];

    audioElementRefs.current.forEach((audioEl, itemId) => {
      const gainNode = gainNodesRef.current.get(itemId);

      if (!activeItemIds.has(itemId)) {
        // Item no longer active - fade out smoothly
        if (gainNode) {
          gainNode.gain.cancelScheduledValues(context.currentTime);
          // Smooth fade out over 100ms to avoid clicks
          const currentGain = gainNode.gain.value;
          gainNode.gain.setValueAtTime(currentGain, context.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.1);

          // Don't pause yet - let the fade complete first
          itemsToCleanup.push(itemId);
        } else {
          // No gain node - disconnect and cleanup immediately
          const sourceNode = audioSourceNodesRef.current.get(itemId);
          if (sourceNode) {
            sourceNode.disconnect();
          }

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
        // Track became muted - smooth fade out
        gainNode.gain.cancelScheduledValues(context.currentTime);
        const currentGain = gainNode.gain.value;
        gainNode.gain.setValueAtTime(currentGain, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.1);

        // Don't pause yet - let the fade complete first
        itemsToCleanup.push(itemId);
      }
    });

    // Clean up faded out items after a delay
    if (itemsToCleanup.length > 0) {
      setTimeout(() => {
        itemsToCleanup.forEach((itemId) => {
          const audioEl = audioElementRefs.current.get(itemId);
          const sourceNode = audioSourceNodesRef.current.get(itemId);
          const gainNode = gainNodesRef.current.get(itemId);

          // Pause and stop the audio element first
          if (audioEl) {
            audioEl.pause();
            audioEl.src = "";
          }

          // Properly disconnect nodes after audio is stopped to avoid noise
          if (gainNode) {
            gainNode.disconnect(); // Disconnect gain from analyser
          }
          if (sourceNode) {
            sourceNode.disconnect(); // Disconnect source from gain
          }

          audioElementRefs.current.delete(itemId);
          audioSourceNodesRef.current.delete(itemId);
          gainNodesRef.current.delete(itemId);
        });
      }, 150); // Give time for fade out to complete (100ms fade + 50ms buffer)
    }

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

        // Create gain node and connect - fade in for smooth transitions
        const gainNode = context.createGain();
        // Smooth fade in over 100ms to match fade out duration
        // Start slightly in the past to ensure no clicks
        const now = context.currentTime;
        gainNode.gain.setValueAtTime(0, now - 0.001);
        gainNode.gain.linearRampToValueAtTime(
          track.volume * masterVolume,
          now + 0.1
        );
        gainNodesRef.current.set(item.id, gainNode);

        // Connect nodes - this creates the audio graph
        sourceNode.connect(gainNode);
        gainNode.connect(analyserNode);

        // Only connect analyser to destination once per track
        if (isNewAnalyser) {
          analyserNode.connect(context.destination);
          // Register with global registry
          audioRegistry.setAnalyserNode(item.trackId, analyserNode);
        }

        // Once loaded, set to correct time and start playing if needed
        // Use 'loadeddata' to ensure audio is ready before playing
        audioEl.addEventListener(
          "loadeddata",
          () => {
            // Read current playheadTime from store to ensure consistency
            const currentPlayheadTime =
              useTimelineStore.getState().playheadTime;
            const timeInClip = calculateTimeInClip(item, currentPlayheadTime);
            audioEl.currentTime = roundToSampleBoundary(timeInClip);

            // Start playing after a small delay to match video timing
            // This ensures audio and video start synchronized
            if (isPlaying) {
              setTimeout(() => {
                audioEl.play().catch(() => {});
              }, 10);
            }
          },
          { once: true }
        );

        // Also try to start playing immediately if already loaded
        if (audioEl.readyState >= 4) {
          const currentPlayheadTime = useTimelineStore.getState().playheadTime;
          const timeInClip = calculateTimeInClip(item, currentPlayheadTime);
          audioEl.currentTime = roundToSampleBoundary(timeInClip);
          if (isPlaying) {
            // Small delay to match video timing and ensure AudioContext has processed
            setTimeout(() => {
              audioEl.play().catch(() => {});
            }, 10);
          }
        }
      }

      // Update gain node volume if changed
      const gainNode = gainNodesRef.current.get(item.id);
      if (gainNode && !isNewItem) {
        // Check if volume actually changed to avoid unnecessary updates
        const targetVolume = track.volume * masterVolume;
        const currentVolume = gainNode.gain.value;
        if (Math.abs(currentVolume - targetVolume) > 0.01) {
          // For existing items, smooth volume changes to avoid clicks
          gainNode.gain.cancelScheduledValues(context.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            targetVolume,
            context.currentTime + 0.1
          );
        }
      }

      // Update mute state and ensure playback
      const audioEl = audioElementRefs.current.get(item.id);
      if (audioEl) {
        audioEl.muted = isMuted;

        // Ensure the audio element is at the correct position and playing state
        if (audioEl.readyState >= 2) {
          const timeInClip = calculateTimeInClip(item, playheadTime);
          const roundedTimeInClip = roundToSampleBoundary(timeInClip);
          const drift = Math.abs(audioEl.currentTime - roundedTimeInClip);

          // Reduce sync aggressiveness to avoid stuttering (increased threshold to 0.1s)
          const shouldSync = isNewItem ? drift > 0.1 : drift > 0.1;

          if (shouldSync) {
            audioEl.currentTime = roundedTimeInClip;
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
  ]);

  // Separate effect to sync audio playback position and state
  useEffect(() => {
    if (!audioContextRef.current) return;

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
    // Skip during transitions to avoid fighting with video loading
    let rafId: number;
    if (isPlaying && !isTransitioning) {
      const syncLoop = () => {
        // Read current playheadTime from store on each frame to avoid stale closure
        const currentPlayheadTime = useTimelineStore.getState().playheadTime;

        audioElementRefs.current.forEach((audioEl, itemId) => {
          const item = allActiveItems.find((i) => i.id === itemId);
          if (!item) return;

          const track = tracks.find((t) => t.trackNumber === item.trackId);
          if (!track || track.muted) return;

          const timeInClip = calculateTimeInClip(item, currentPlayheadTime);
          const roundedTimeInClip = roundToSampleBoundary(timeInClip);

          // Reduce sync aggressiveness to avoid stuttering (increased threshold to 0.1s)
          const drift = Math.abs(audioEl.currentTime - roundedTimeInClip);
          if (audioEl.readyState >= 2 && drift > 0.1) {
            audioEl.currentTime = roundedTimeInClip;
          }
        });

        if (isPlaying && !isTransitioning) {
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
  }, [allActiveItems, isPlaying, tracks, isTransitioning]);

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
}
