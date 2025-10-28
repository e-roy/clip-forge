import { Library } from "@/components/library/Library";
import { Preview } from "@/components/preview/Preview";
import { Timeline } from "@/components/timeline/Timeline";
import { Header } from "@/components/Header";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Top Bar */}
      <Header />

      {/* Main Content Area with Resizable Panels */}
      <ResizablePanelGroup
        direction="vertical"
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel defaultSize={70}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Sidebar - Library */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
              <div className="h-full border-r border-border">
                <Library />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Center - Preview */}
            <ResizablePanel defaultSize={80} minSize={30}>
              <div className="h-full">
                <Preview />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* Bottom - Timeline */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
          <div className="h-full border-t border-border overflow-hidden">
            <Timeline />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App;
