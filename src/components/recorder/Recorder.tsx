import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Monitor, Video, Mic, Circle, Square } from "lucide-react";

interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface RecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (filePath: string) => void;
  onRecordedCallback?: () => void;
}

export function Recorder({
  open,
  onOpenChange,
  onRecorded,
  onRecordedCallback,
}: RecorderProps) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const [isRecordingWebcam, setIsRecordingWebcam] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const webcamChunksRef = useRef<Blob[]>([]);
  const isRecordingScreenRef = useRef(false);
  const isRecordingWebcamRef = useRef(false);

  // Load desktop sources when dialog opens
  useEffect(() => {
    if (open) {
      loadSources();
    }
  }, [open]);

  const loadSources = async () => {
    try {
      const sources = await window.api.getDesktopSources();
      setSources(sources);
      if (sources.length > 0) {
        setSelectedSource(sources[0].id);
      }
    } catch (error) {
      console.error("Failed to load desktop sources:", error);
    }
  };

  const startScreenRecording = async () => {
    try {
      setIsLoading(true);

      // Get screen stream
      // Electron-specific constraint for desktop capture
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: selectedSource,
          },
        } as unknown as MediaTrackConstraints,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      screenStreamRef.current = stream;

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          screenChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(screenChunksRef.current, { type: "video/webm" });
        const arrayBuffer = await blob.arrayBuffer();

        const filename = `screen_recording_${Date.now()}.webm`;
        const filePath = await window.api.writeRecordingFile(
          arrayBuffer,
          filename
        );

        onRecorded(filePath);
        screenChunksRef.current = [];

        // Clean up stream
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }

        // Auto-close dialog if no more recordings
        if (!isRecordingWebcamRef.current) {
          onRecordedCallback?.();
        }
      };

      screenRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingScreen(true);
      isRecordingScreenRef.current = true;
    } catch (error) {
      console.error("Failed to start screen recording:", error);
      alert(
        "Failed to start screen recording. Make sure you selected a source."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startWebcamRecording = async () => {
    try {
      setIsLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true },
      });

      webcamStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          webcamChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(webcamChunksRef.current, { type: "video/webm" });
        const arrayBuffer = await blob.arrayBuffer();

        const filename = `webcam_recording_${Date.now()}.webm`;
        const filePath = await window.api.writeRecordingFile(
          arrayBuffer,
          filename
        );

        onRecorded(filePath);
        webcamChunksRef.current = [];

        // Clean up stream
        if (webcamStreamRef.current) {
          webcamStreamRef.current.getTracks().forEach((track) => track.stop());
          webcamStreamRef.current = null;
        }

        // Auto-close dialog if no more recordings
        if (!isRecordingScreenRef.current) {
          onRecordedCallback?.();
        }
      };

      webcamRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingWebcam(true);
      isRecordingWebcamRef.current = true;
    } catch (error) {
      console.error("Failed to start webcam recording:", error);
      alert(
        "Failed to start webcam recording. Make sure you granted camera/mic permissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stopScreenRecording = () => {
    if (screenRecorderRef.current) {
      screenRecorderRef.current.stop();
      setIsRecordingScreen(false);
      isRecordingScreenRef.current = false;
      screenRecorderRef.current = null;
    }
  };

  const stopWebcamRecording = () => {
    if (webcamRecorderRef.current) {
      webcamRecorderRef.current.stop();
      setIsRecordingWebcam(false);
      isRecordingWebcamRef.current = false;
      webcamRecorderRef.current = null;
    }
  };

  const handleStopAll = () => {
    stopScreenRecording();
    stopWebcamRecording();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopAll();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Screen or Webcam</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Screen Recording Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Screen Recording
            </h3>

            {sources.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className={`p-2 border rounded-md hover:border-primary transition-colors ${
                      selectedSource === source.id ? "border-primary" : ""
                    }`}
                    disabled={isRecordingScreen}
                  >
                    <img
                      src={source.thumbnail}
                      alt={source.name}
                      className="w-full h-auto rounded mb-1"
                    />
                    <p className="text-xs truncate">{source.name}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {!isRecordingScreen ? (
                <Button
                  onClick={startScreenRecording}
                  disabled={isLoading || !selectedSource || isRecordingWebcam}
                  className="flex-1"
                >
                  <Circle className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopScreenRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Screen
                </Button>
              )}
            </div>
          </div>

          {/* Webcam Recording Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Video className="h-4 w-4" />
              Webcam Recording
            </h3>

            <div className="flex gap-2">
              {!isRecordingWebcam ? (
                <Button
                  onClick={startWebcamRecording}
                  disabled={isLoading || isRecordingScreen}
                  className="flex-1"
                >
                  <Circle className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
                  Start Webcam
                </Button>
              ) : (
                <Button
                  onClick={stopWebcamRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Webcam
                </Button>
              )}
            </div>
          </div>

          {/* Recording Status */}
          {(isRecordingScreen || isRecordingWebcam) && (
            <div className="flex items-center justify-center gap-2 p-2 bg-red-500/10 rounded text-sm text-red-600">
              <Circle className="h-3 w-3 fill-red-500 animate-pulse" />
              Recording in progress...
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
