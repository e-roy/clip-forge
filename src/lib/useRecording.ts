import { useClipsStore } from "@/store/clips";
import { useUIStore } from "@/store/ui";

export function useRecording() {
  const { addClips } = useClipsStore();
  const { setRecorderOpen } = useUIStore();

  const handleRecordingDone = async (filePath: string) => {
    try {
      // Get metadata for the recorded file
      const metas = await window.api.getMediaInfo([filePath]);
      if (metas.length > 0) {
        addClips(metas);
      }
      setRecorderOpen(false);
    } catch (error) {
      alert(
        "Recording saved but failed to add to library. You may need to manually import it."
      );
      setRecorderOpen(false);
    }
  };

  return { handleRecordingDone };
}
