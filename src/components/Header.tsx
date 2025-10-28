import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilmIcon,
  Video as VideoIcon,
  Download,
  Settings,
  Save,
  Folder,
  FolderPlus,
} from "lucide-react";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ExportProgress } from "@/components/export/ExportProgress";
import { Recorder } from "@/components/recorder/Recorder";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useUIStore } from "@/store/ui";
import { useTimelineStore } from "@/store/timeline";
import { useExport } from "@/lib/useExport";
import { useRecording } from "@/lib/useRecording";
import { useClipsStore } from "@/store/clips";

export function Header() {
  const {
    projectName,
    exportDialogOpen,
    exportProgressOpen,
    recorderOpen,
    settingsDialogOpen,
    setExportDialogOpen,
    setExportProgressOpen,
    setRecorderOpen,
    setSettingsDialogOpen,
  } = useUIStore();
  const { items } = useTimelineStore();
  const { handleStartExport } = useExport();
  const { handleRecordingDone } = useRecording();

  const handleNewProject = () => {
    useClipsStore.getState().clearClips();
    useTimelineStore.setState({ items: [], selectedItemId: null, duration: 0 });
    useUIStore.getState().setProjectName("Untitled Project");
  };

  const handleOpenProject = async () => {
    if (!window.api) return;
    const filePath = await window.api.openProjectDialog();
    if (filePath) {
      // Load project will be handled by AppProvider recovery or manual load
      const projectData = await window.api.loadProject(filePath);
      if (projectData.success && projectData.data) {
        // Parse and load project data
        const data = JSON.parse(projectData.data);
        if (data.clips) {
          useClipsStore.setState({ clips: data.clips });
        }
        if (data.timeline) {
          useTimelineStore.setState(data.timeline);
        }
        // Update project name from saved data, or extract from filename
        if (data.ui && data.ui.projectName) {
          useUIStore.getState().setProjectName(data.ui.projectName);
        } else {
          // Extract project name from filename if not in saved data
          const filename = filePath.split(/[\\/]/).pop() || "Untitled Project";
          const nameWithoutExt = filename.replace(/\.cforge$/i, "");
          useUIStore.getState().setProjectName(nameWithoutExt);
        }
      }
    }
  };

  const handleSaveProject = async () => {
    if (!window.api) return;
    const uiStore = useUIStore.getState();
    const projectJson = JSON.stringify(
      {
        clips: useClipsStore.getState().clips,
        timeline: {
          items: useTimelineStore.getState().items,
          tracks: useTimelineStore.getState().tracks,
        },
        ui: {
          projectName: uiStore.projectName,
        },
      },
      null,
      2
    );
    await window.api.saveProject(projectJson);
  };

  const handleSaveProjectAs = async () => {
    if (!window.api) return;
    const filePath = await window.api.saveFileDialog({
      filters: [{ name: "ClipForge Project", extensions: ["cforge"] }],
      defaultPath: projectName + ".cforge",
    });
    if (filePath) {
      // Extract project name from filename
      const filename = filePath.split(/[\\/]/).pop() || "Untitled Project";
      const nameWithoutExt = filename.replace(/\.cforge$/i, "");

      // Update the project name to match the filename
      useUIStore.getState().setProjectName(nameWithoutExt);

      const projectJson = JSON.stringify(
        {
          clips: useClipsStore.getState().clips,
          timeline: {
            items: useTimelineStore.getState().items,
            tracks: useTimelineStore.getState().tracks,
          },
          ui: {
            projectName: nameWithoutExt,
          },
        },
        null,
        2
      );
      await window.api.saveProjectAs(projectJson, filePath);
    }
  };

  return (
    <>
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <FilmIcon className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">{projectName}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                File
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleNewProject}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenProject}>
                <Folder className="mr-2 h-4 w-4" />
                Open...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveProject}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveProjectAs}>
                <Save className="mr-2 h-4 w-4" />
                Save As...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRecorderOpen(true)}
            title="Record screen or webcam"
            size="icon"
          >
            <VideoIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={items.length === 0}
            title={
              items.length === 0
                ? "Add clips to timeline to export"
                : `Export ${items.length} ${
                    items.length === 1 ? "clip" : "clips"
                  }`
            }
            size="icon"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setSettingsDialogOpen(true)}
            title="Settings"
            size="icon"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onStartExport={handleStartExport}
      />
      <ExportProgress
        open={exportProgressOpen}
        onOpenChange={setExportProgressOpen}
        onClose={() => setExportProgressOpen(false)}
      />
      <Recorder
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        onRecorded={handleRecordingDone}
        onRecordedCallback={() => setRecorderOpen(false)}
      />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </>
  );
}
