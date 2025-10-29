import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Circle, Square, Video } from "lucide-react";

interface RecordingPreviewProps {
  isRecording: boolean;
  isRecordingWebcam: boolean;
  screenVideoRef: RefObject<HTMLVideoElement | null>;
  webcamVideoRef: RefObject<HTMLVideoElement | null>;
  onStopRecording: () => void;
  onStartRecording?: () => void;
  onCancel?: () => void;
  canRecord?: boolean;
  isLoading?: boolean;
  activeTab?: "screen" | "window" | "camera";
  cameraOverlay?: boolean;
  onCameraOverlayChange?: (enabled: boolean) => void;
}

export function RecordingPreview({
  isRecording,
  isRecordingWebcam,
  screenVideoRef,
  webcamVideoRef,
  onStopRecording,
  onStartRecording,
  onCancel,
  canRecord = false,
  isLoading = false,
  activeTab,
  cameraOverlay = false,
  onCameraOverlayChange,
}: RecordingPreviewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="relative bg-black rounded-md overflow-hidden aspect-video shrink-0 mb-4">
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

      {/* Controls Row: Cancel (left), Camera Toggle (center), Record/Stop (right) */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        {/* Cancel Button - Left */}
        <div className="shrink-0">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isRecording || isRecordingWebcam}
              size="lg"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Camera Overlay Toggle - Center */}
        <div className="flex-1 flex justify-center">
          {!isRecording &&
            !isRecordingWebcam &&
            (activeTab === "screen" || activeTab === "window") &&
            onCameraOverlayChange && (
              <div className="flex items-center gap-2">
                <Video
                  className={`h-5 w-5 ${
                    cameraOverlay ? "text-primary" : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
                <Switch
                  checked={cameraOverlay}
                  onCheckedChange={onCameraOverlayChange}
                  disabled={isRecording}
                  aria-label="Include camera overlay"
                />
              </div>
            )}
        </div>

        {/* Record/Stop Button - Right */}
        <div className="shrink-0">
          {isRecording || isRecordingWebcam ? (
            <Button
              onClick={onStopRecording}
              variant="destructive"
              size="lg"
              className="w-48"
            >
              <Square className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          ) : (
            onStartRecording && (
              <Button
                onClick={onStartRecording}
                disabled={isLoading || !canRecord}
                variant="default"
                size="lg"
                className="w-48"
              >
                <Circle className="mr-2 h-5 w-5 fill-red-500 text-red-500" />
                Record
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
