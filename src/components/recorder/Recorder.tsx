import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUIStore } from "@/store/ui";
import { SourceSelector } from "./SourceSelector";
import { RecordingPreview } from "./RecordingPreview";
import type { DesktopSource } from "@/types/ipc";

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
  const { setAlertDialog } = useUIStore();
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"screen" | "window" | "camera">(
    "screen"
  );
  const [cameraOverlay, setCameraOverlay] = useState(false);
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
      loadCameraDevices();
      // Reset states when dialog opens
      setCameraOverlay(false);
      setActiveTab("screen");
    } else {
      // Reset states when dialog closes
      setCameraOverlay(false);
      setSelectedSource("");
    }
  }, [open]);

  const loadSources = async () => {
    try {
      const sources = await window.api.getDesktopSources();
      setSources(sources);
      // Select first source of current tab type
      const tabSources = sources.filter((s) => s.type === activeTab);
      if (tabSources.length > 0) {
        setSelectedSource(tabSources[0].id);
      } else {
        setSelectedSource("");
      }
    } catch (error) {
      console.error("Failed to load desktop sources:", error);
    }
  };

  const loadCameraDevices = async () => {
    try {
      // Enumerate devices without requesting permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setCameraDevices(cameras);

      // Select first camera if available and camera tab is active
      if (cameras.length > 0 && activeTab === "camera" && !selectedSource) {
        setSelectedSource(cameras[0].deviceId);
      }
    } catch (error) {
      console.error("Failed to load camera devices:", error);
      setCameraDevices([]);
    }
  };

  // Update selected source when tab changes
  useEffect(() => {
    if (!isRecording) {
      if (activeTab === "camera") {
        // Handle camera tab - select first camera if available
        if (cameraDevices.length > 0) {
          const currentDevice = cameraDevices.find(
            (d) => d.deviceId === selectedSource
          );
          if (!currentDevice) {
            setSelectedSource(cameraDevices[0].deviceId);
          }
        } else {
          setSelectedSource("");
        }
      } else {
        // Handle screen/window tabs
        if (sources.length > 0) {
          const tabSources = sources.filter((s) => s.type === activeTab);
          if (tabSources.length > 0) {
            // Keep current selection if it's valid for new tab, otherwise select first
            const currentSource = sources.find((s) => s.id === selectedSource);
            if (currentSource && currentSource.type === activeTab) {
              // Keep current selection
            } else {
              setSelectedSource(tabSources[0].id);
            }
          } else {
            setSelectedSource("");
          }
        }
      }
    }
  }, [activeTab, sources, cameraDevices, isRecording, selectedSource]);

  // Unified recording handler
  const handleStartRecording = async () => {
    if (activeTab === "camera") {
      // Camera-only recording
      await startWebcamRecording();
    } else if (activeTab === "screen" || activeTab === "window") {
      // Screen/window recording
      const recordingStarted = await startScreenOrWindowRecording();
      // If camera overlay is enabled, add it after screen recording starts
      if (cameraOverlay && recordingStarted) {
        // Wait a bit for the screen stream to be ready
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (isRecordingRef.current && screenStreamRef.current) {
          await addWebcamOverlay();
        }
      }
    }
  };

  const addWebcamOverlay = async () => {
    try {
      setIsLoading(true);
      setIsRecordingWebcam(true);
      isRecordingWebcamRef.current = true;

      const videoConstraints: MediaTrackConstraints = {
        width: 1280,
        height: 720,
      };

      // Use selected camera device ID if available
      if (selectedSource && activeTab === "camera") {
        videoConstraints.deviceId = { exact: selectedSource };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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

      // Start compositing if screen is recording (will retry until ready)
      if (isRecordingRef.current && screenStreamRef.current) {
        setTimeout(() => {
          startCompositeRecording();
        }, 200); // Give time for video elements to load
      }
    } catch (error) {
      console.error("Failed to add webcam overlay:", error);
      setIsRecordingWebcam(false);
      isRecordingWebcamRef.current = false;
      setAlertDialog(
        "Webcam Error",
        "Failed to add webcam. Make sure you granted camera permissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startCompositeRecording = () => {
    if (
      !canvasRef.current ||
      !screenStreamRef.current ||
      !webcamStreamRef.current ||
      !screenVideoRef.current ||
      !webcamVideoRef.current ||
      screenVideoRef.current.readyState < 2 || // HAVE_CURRENT_DATA
      webcamVideoRef.current.readyState < 2
    ) {
      // Retry after a short delay
      setTimeout(startCompositeRecording, 100);
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
      try {
        compositeStream.addTrack(audioTracks[0]);
      } catch (error) {
        console.error("Failed to add webcam audio track:", error);
      }
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
    // Try different codecs for better compatibility with composited streams
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm"; // Fallback to basic webm
      }
    }
    const recorder = new MediaRecorder(compositeStream, {
      mimeType,
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        screenChunksRef.current.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      console.error("Composite recording error:", event.error);
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

    try {
      recorder.start();
    } catch (error) {
      console.error("Failed to start composite recording:", error);
      // Show error to user and stop
      setAlertDialog(
        "Recording Error",
        "Failed to start camera overlay recording. Please try recording screen only."
      );
      setIsRecordingWebcam(false);
      isRecordingWebcamRef.current = false;
      return;
    }
  };

  const startWebcamRecording = async () => {
    try {
      setIsLoading(true);
      setIsRecordingWebcam(true);
      isRecordingWebcamRef.current = true;

      const videoConstraints: MediaTrackConstraints = {
        width: 1280,
        height: 720,
      };

      // Use selected camera device ID if available
      if (selectedSource && activeTab === "camera") {
        videoConstraints.deviceId = { exact: selectedSource };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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
      setAlertDialog(
        "Webcam Recording Error",
        "Failed to start webcam recording. Make sure you granted camera/mic permissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startScreenOrWindowRecording = async (): Promise<boolean> => {
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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setIsRecording(true);
      isRecordingRef.current = true;
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
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Failed to start screen recording:", error);
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsLoading(false);
      setAlertDialog(
        "Screen Recording Error",
        "Failed to start screen recording. Make sure you selected a source."
      );
      return false;
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
      <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-6xl lg:max-w-7xl flex flex-col p-6">
        <DialogHeader className="pb-4">
          <DialogTitle>Record Screen or Camera</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
          <SourceSelector
            sources={sources}
            cameraDevices={cameraDevices}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isRecording={isRecording}
          />

          <RecordingPreview
            isRecording={isRecording}
            isRecordingWebcam={isRecordingWebcam}
            screenVideoRef={screenVideoRef}
            webcamVideoRef={webcamVideoRef}
            onStopRecording={handleStopAll}
            onStartRecording={handleStartRecording}
            onCancel={() => handleDialogOpenChange(false)}
            canRecord={
              (activeTab === "camera" &&
                !!selectedSource &&
                cameraDevices.some((d) => d.deviceId === selectedSource)) ||
              (activeTab === "screen" &&
                !!selectedSource &&
                sources
                  .filter((s) => s.type === "screen")
                  .some((s) => s.id === selectedSource)) ||
              (activeTab === "window" &&
                !!selectedSource &&
                sources
                  .filter((s) => s.type === "window")
                  .some((s) => s.id === selectedSource))
            }
            isLoading={isLoading}
            activeTab={activeTab}
            cameraOverlay={cameraOverlay}
            onCameraOverlayChange={setCameraOverlay}
          />
        </div>

        {/* Hidden canvas for compositing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </DialogContent>
    </Dialog>
  );
}
