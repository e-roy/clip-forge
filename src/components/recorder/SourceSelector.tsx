import { Button } from "@/components/ui/button";
import { Video, Circle } from "lucide-react";

interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface SourceSelectorProps {
  sources: DesktopSource[];
  selectedSource: string;
  onSelectSource: (sourceId: string) => void;
  isRecording: boolean;
  isRecordingWebcam: boolean;
  isLoading: boolean;
  onStartRecording: () => void;
  onToggleWebcam: () => void;
}

export function SourceSelector({
  sources,
  selectedSource,
  onSelectSource,
  isRecording,
  isRecordingWebcam,
  isLoading,
  onStartRecording,
  onToggleWebcam,
}: SourceSelectorProps) {
  return (
    <div className="w-80 space-y-4">
      {!isRecording && sources.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Screen Sources</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSelectSource(source.id)}
                className={`w-full p-2 border rounded-md hover:border-primary transition-colors ${
                  selectedSource === source.id ? "border-primary" : ""
                }`}
                disabled={isRecording}
              >
                <img
                  src={source.thumbnail}
                  alt={source.name}
                  className="w-full h-auto rounded mb-1"
                />
                <p className="text-xs truncate text-left">{source.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {isRecording && (
        <div className="text-sm text-muted-foreground">
          Recording in progress...
        </div>
      )}

      {/* Recording Mode Selection */}
      {!isRecording && (
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-2">Recording Mode</h3>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              {selectedSource ? "Screen selected" : "No screen selected"}
            </div>
            <Button
              onClick={onStartRecording}
              disabled={isLoading || !selectedSource}
              className="w-full justify-start"
              variant="default"
            >
              <Circle className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
              Record Screen
            </Button>
            <Button
              onClick={onToggleWebcam}
              disabled={isLoading}
              className="w-full justify-start"
              variant="outline"
            >
              <Video className="mr-2 h-4 w-4" />
              Record Camera Only
            </Button>
          </div>
        </div>
      )}

      {/* Webcam Toggle During Recording */}
      {isRecording && (
        <div className="flex flex-col gap-2 pt-4 border-t">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Camera Overlay</label>
            <Button
              variant={isRecordingWebcam ? "destructive" : "outline"}
              size="sm"
              onClick={onToggleWebcam}
              disabled={isLoading}
            >
              {isRecordingWebcam ? (
                <>
                  <Video className="h-3 w-3 mr-1" />
                  On
                </>
              ) : (
                <>
                  <Video className="h-3 w-3 mr-1" />
                  Off
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
