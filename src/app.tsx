import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilmIcon } from "lucide-react";
import { Library } from "@/components/library/Library";
import { Preview } from "@/components/preview/Preview";
import { Timeline } from "@/components/timeline/Timeline";

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
          <Preview />
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-64 border-t border-border overflow-hidden">
        <Timeline />
      </div>
    </div>
  );
}

export default App;
