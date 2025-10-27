import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderIcon, PlayIcon, FilmIcon } from "lucide-react";

function App() {
  const [projectName] = useState("Untitled Project");

  const handleImport = async () => {
    const paths = await window.api.openFileDialog({
      filters: [{ name: "Media Files", extensions: ["mp4", "mov", "webm"] }],
    });
    console.log("Selected files:", paths);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Top Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <FilmIcon className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">{projectName}</h1>
        </div>
        <Button variant="outline" disabled>
          Export
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Library */}
        <div className="w-64 border-r border-border">
          <div className="flex h-full flex-col">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold">Library</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleImport}
              >
                <FolderIcon className="mr-2 h-4 w-4" />
                Import
              </Button>
              <div className="mt-4 text-sm text-muted-foreground">
                No clips imported yet
              </div>
            </div>
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex h-full items-center justify-center bg-secondary/20">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <PlayIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Preview will appear here
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-48 border-t border-border">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Timeline</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
