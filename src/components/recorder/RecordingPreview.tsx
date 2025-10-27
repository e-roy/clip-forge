import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Circle, Square } from "lucide-react";

interface RecordingPreviewProps {
  isRecording: boolean;
  isRecordingWebcam: boolean;
  screenVideoRef: RefObject<HTMLVideoElement | null>;
  webcamVideoRef: RefObject<HTMLVideoElement | null>;
  onStopRecording: () => void;
  onToggleWebcam: () => void;
}

export function RecordingPreview({
  isRecording,
  isRecordingWebcam,
  screenVideoRef,
  webcamVideoRef,
  onStopRecording,
  onToggleWebcam,
}: RecordingPreviewProps) {
  return (
    <div className="flex-1 space-y-4">
      <div className="relative bg-black rounded-md overflow-hidden aspect-video">
        {/* Screen Preview */}
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          className="w-full h-full"
          style={{ display: isRecording ? "block" : "none" }}
        />

        {/* Webcam Preview (full or PiP) */}
        {isRecordingWebcam && !isRecording && (
          <video
            ref={webcamVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        )}

        {/* Webcam as PiP overlay when recording screen */}
        {isRecordingWebcam && isRecording && (
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-md overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={webcamVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Recording Indicator */}
        {(isRecording || isRecordingWebcam) && (
          <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm">
            <Circle className="h-3 w-3 fill-red-500 animate-pulse" />
            <span className="font-semibold">
              {isRecording && isRecordingWebcam
                ? "Recording Screen + Camera"
                : isRecording
                ? "Recording Screen"
                : "Recording Camera"}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        {isRecording && (
          <Button
            onClick={onStopRecording}
            variant="destructive"
            size="lg"
            className="w-48"
          >
            <Square className="mr-2 h-5 w-5" />
            Stop Recording
          </Button>
        )}
        {isRecordingWebcam && !isRecording && (
          <Button
            onClick={onToggleWebcam}
            variant="destructive"
            size="lg"
            className="w-48"
          >
            <Square className="mr-2 h-5 w-5" />
            Stop Camera
          </Button>
        )}
      </div>
    </div>
  );
}
