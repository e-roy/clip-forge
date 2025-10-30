import { useClipsStore } from "@/store/clips";
import { useUIStore } from "@/store/ui";

export function useRecording() {
  const { addClips } = useClipsStore();
  const { setRecorderOpen, setAlertDialog } = useUIStore();

  const handleRecordingDone = async (filePath: string) => {
    try {
      console.log("Recording done, processing file:", filePath);
      // Get metadata for the recorded file
      const metas = await window.api.getMediaInfo([filePath]);
      console.log("Got metadata:", metas.length, "clips");
      if (metas.length > 0) {
        console.log("Adding clips to library");
        addClips(metas);
      } else {
        console.error("No metadata returned for file:", filePath);
        setAlertDialog(
          "Recording Issue",
          "Recording saved but couldn't read file metadata. Try manually importing the file."
        );
      }
      setRecorderOpen(false);
    } catch (error) {
      console.error("Recording processing failed:", error);
      setAlertDialog(
        "Recording Error",
        `Recording saved but failed to add to library: ${
          String(error) || "Unknown error"
        }. You may need to manually import it.`
      );
      setRecorderOpen(false);
    }
  };

  return { handleRecordingDone };
}
