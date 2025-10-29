import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/store/timeline";
import * as audioRegistry from "@/lib/audio-registry";

interface AudioMeterProps {
  trackId: string;
  height: number;
  isMuted: boolean;
}

export function AudioMeter({ trackId, height, isMuted }: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Get trackNumber for this trackId
  const tracks = useTimelineStore((state) => state.tracks);
  const trackNumber = tracks.find((t) => t.id === trackId)?.trackNumber;

  useEffect(() => {
    if (!canvasRef.current || !trackNumber) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const meterHeight = height;
    const meterWidth = 20;

    const drawMeter = () => {
      // Try to get analyser node each frame in case it becomes available
      const analyserNode = audioRegistry.getAnalyserNode(trackNumber);

      if (analyserNode && !isMuted) {
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteTimeDomainData(dataArray);

        // Calculate RMS (Root Mean Square) for audio level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(rms * 1.5, 1); // Amplify and clamp to 1
        const fillHeight = level * meterHeight;

        // Clear canvas
        ctx.clearRect(0, 0, meterWidth, meterHeight);

        // Draw background (dark)
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, meterWidth, meterHeight);

        // Draw gradient if there's audio
        if (fillHeight > 0) {
          const gradient = ctx.createLinearGradient(0, 0, 0, meterHeight);
          gradient.addColorStop(0, "#ef4444"); // Red at top
          gradient.addColorStop(0.5, "#f59e0b"); // Orange in middle
          gradient.addColorStop(1, "#22c55e"); // Green at bottom

          ctx.fillStyle = gradient;
          ctx.fillRect(0, meterHeight - fillHeight, meterWidth, fillHeight);

          // Draw border
          ctx.strokeStyle = "#ffffff20";
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, meterWidth, meterHeight);
        } else {
          // Draw border even when no audio
          ctx.strokeStyle = "#ffffff20";
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, meterWidth, meterHeight);
        }
      } else {
        // Draw empty background when muted or no audio
        ctx.clearRect(0, 0, meterWidth, meterHeight);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, meterWidth, meterHeight);
        ctx.strokeStyle = "#ffffff20";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, meterWidth, meterHeight);
      }

      animationRef.current = requestAnimationFrame(drawMeter);
    };

    animationRef.current = requestAnimationFrame(drawMeter);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trackNumber, isMuted, height]);

  return (
    <canvas
      ref={canvasRef}
      width={20}
      height={height}
      style={{
        width: "20px",
        height: `${height}px`,
        borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    />
  );
}
