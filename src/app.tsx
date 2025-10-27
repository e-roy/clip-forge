import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon, FilmIcon } from "lucide-react";
import { Library } from "@/components/library/Library";

function App() {
  const [projectName] = useState("Untitled Project");

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
          <Library />
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
