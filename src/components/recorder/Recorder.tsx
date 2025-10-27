import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SourceSelector } from "./SourceSelector";
import { RecordingPreview } from "./RecordingPreview";

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
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingWebcam, setIsRecordingWebcam] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const webcamChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const isRecordingWebcamRef = useRef(false);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);

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

  const toggleWebcam = async () => {
    if (isRecordingWebcam) {
      stopWebcamRecording();
    } else {
      // If we're already recording screen, add webcam as overlay
      if (isRecording) {
        await addWebcamOverlay();
      } else {
        // Otherwise start webcam-only recording
        await startWebcamRecording();
      }
    }
  };

  const addWebcamOverlay = async () => {
    try {
      setIsLoading(true);
      setIsRecordingWebcam(true);
      isRecordingWebcamRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true },
      });

      webcamStreamRef.current = stream;

      setTimeout(() => {
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
          webcamVideoRef.current.onloadedmetadata = () => {
            if (webcamVideoRef.current) {
              webcamVideoRef.current.play().catch((err) => {
                console.error("Error playing webcam preview:", err);
              });
            }
          };
        }
      }, 50);

      // Start compositing if screen is recording
      if (isRecording && screenStreamRef.current) {
        startCompositeRecording();
      }
    } catch (error) {
      console.error("Failed to add webcam overlay:", error);
      setIsRecordingWebcam(false);
      isRecordingWebcamRef.current = false;
      alert("Failed to add webcam. Make sure you granted camera permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const startCompositeRecording = () => {
    if (
      !canvasRef.current ||
      !screenStreamRef.current ||
      !webcamStreamRef.current
    ) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match screen stream
    const screenTrack = screenStreamRef.current.getVideoTracks()[0];
    const settings = screenTrack.getSettings();
    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;

    // Calculate PiP dimensions (e.g., 20% of screen width)
    const pipWidth = canvas.width * 0.15;
    const pipHeight = (pipWidth * 3) / 4; // 4:3 aspect ratio
    const pipX = canvas.width - pipWidth - 20;
    const pipY = canvas.height - pipHeight - 20;

    // Animation loop to composite streams
    const drawFrame = () => {
      if (screenVideoRef.current && webcamVideoRef.current) {
        // Draw screen
        ctx.drawImage(
          screenVideoRef.current,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Draw webcam PiP with border
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4);
        ctx.drawImage(webcamVideoRef.current, pipX, pipY, pipWidth, pipHeight);
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    // Get composite stream and restart recording with it
    const compositeStream = canvas.captureStream(30);

    // Add audio from webcam if available
    const audioTracks = webcamStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      compositeStream.addTrack(audioTracks[0]);
    }

    compositeStreamRef.current = compositeStream;

    // Stop the old screen-only recorder if it exists
    const oldRecorder = screenRecorderRef.current;
    if (oldRecorder && oldRecorder.state !== "inactive") {
      // Prevent the onstop handler from firing
      oldRecorder.ondataavailable = null;
      oldRecorder.onstop = null;
      oldRecorder.stop();
    }

    // Clear chunks - we're starting a fresh composite recording
    screenChunksRef.current = [];

    // Start new recording with composite stream
    const recorder = new MediaRecorder(compositeStream, {
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

      const filename = `screen_with_camera_${Date.now()}.webm`;
      const filePath = await window.api.writeRecordingFile(
        arrayBuffer,
        filename
      );

      onRecorded(filePath);
      screenChunksRef.current = [];

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      if (compositeStreamRef.current) {
        compositeStreamRef.current.getTracks().forEach((track) => track.stop());
        compositeStreamRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      onRecordedCallback?.();
    };

    screenRecorderRef.current = recorder;
    recorder.start();
  };

  const startWebcamRecording = async () => {
    try {
      setIsLoading(true);
      setIsRecordingWebcam(true);
      isRecordingWebcamRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true },
      });

      webcamStreamRef.current = stream;

      setTimeout(() => {
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
          webcamVideoRef.current.onloadedmetadata = () => {
            if (webcamVideoRef.current) {
              webcamVideoRef.current.play().catch((err) => {
                console.error("Error playing webcam preview:", err);
              });
            }
          };
        }
      }, 50);

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          webcamChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(webcamChunksRef.current, {
          type: "video/webm",
        });
        const arrayBuffer = await blob.arrayBuffer();

        const filename = `webcam_recording_${Date.now()}.webm`;
        const filePath = await window.api.writeRecordingFile(
          arrayBuffer,
          filename
        );

        onRecorded(filePath);
        webcamChunksRef.current = [];

        if (webcamStreamRef.current) {
          webcamStreamRef.current.getTracks().forEach((track) => track.stop());
          webcamStreamRef.current = null;
        }

        if (!isRecordingRef.current) {
          onRecordedCallback?.();
        }
      };

      webcamRecorderRef.current = recorder;
      recorder.start();
    } catch (error) {
      console.error("Failed to start webcam recording:", error);
      setIsRecordingWebcam(false);
      isRecordingWebcamRef.current = false;
      alert(
        "Failed to start webcam recording. Make sure you granted camera/mic permissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setIsLoading(true);

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: selectedSource,
          },
        } as unknown as MediaTrackConstraints,
      };

      setIsRecording(true);
      isRecordingRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      screenStreamRef.current = stream;

      setTimeout(() => {
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.onloadedmetadata = () => {
            if (screenVideoRef.current) {
              screenVideoRef.current.play().catch((err) => {
                console.error("Error playing screen preview:", err);
              });
            }
          };
        }
      }, 50);

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

        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }

        if (!isRecordingWebcamRef.current) {
          onRecordedCallback?.();
        }
      };

      screenRecorderRef.current = recorder;
      recorder.start();
    } catch (error) {
      console.error("Failed to start screen recording:", error);
      setIsRecording(false);
      isRecordingRef.current = false;
      alert(
        "Failed to start screen recording. Make sure you selected a source."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (screenRecorderRef.current) {
      screenRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      screenRecorderRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }

    // If webcam was active during screen recording, clean it up too
    if (isRecordingWebcam) {
      stopWebcamRecording();
    }

    // Stop canvas compositing if active
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clean up composite stream
    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach((track) => track.stop());
      compositeStreamRef.current = null;
    }
  };

  const stopWebcamRecording = () => {
    // Stop webcam-only recording
    if (webcamRecorderRef.current) {
      webcamRecorderRef.current.stop();
      webcamRecorderRef.current = null;
    }

    // Clean up webcam stream
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }

    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }

    // Stop canvas compositing if active
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsRecordingWebcam(false);
    isRecordingWebcamRef.current = false;
  };

  const handleStopAll = () => {
    stopRecording();
    stopWebcamRecording();
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen && (isRecordingRef.current || isRecordingWebcamRef.current)) {
      if (window.confirm("Recording in progress. Stop and close?")) {
        handleStopAll();
        onOpenChange(false);
      } else {
        return;
      }
    } else {
      onOpenChange(newOpen);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopAll();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-6xl lg:max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Record Screen or Camera</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 py-4">
          <SourceSelector
            sources={sources}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            isRecording={isRecording}
            isRecordingWebcam={isRecordingWebcam}
            isLoading={isLoading}
            onStartRecording={startRecording}
            onToggleWebcam={toggleWebcam}
          />

          <RecordingPreview
            isRecording={isRecording}
            isRecordingWebcam={isRecordingWebcam}
            screenVideoRef={screenVideoRef}
            webcamVideoRef={webcamVideoRef}
            onStopRecording={stopRecording}
            onToggleWebcam={toggleWebcam}
          />
        </div>

        {/* Hidden canvas for compositing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
