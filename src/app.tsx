import { Library } from "@/components/library/Library";
import { Preview } from "@/components/preview/Preview";
import { Timeline } from "@/components/timeline/Timeline";
import { Header } from "@/components/Header";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { GlobalAlertDialog } from "@/components/GlobalAlertDialog";
import { useUIStore } from "@/store/ui";

function App() {
  const fitToWindow = useUIStore((state) => state.fitToWindow);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Global Alert Dialog */}
      <GlobalAlertDialog />

      {/* Fullscreen Preview Mode */}
      <div
        className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ease-in-out ${
          fitToWindow
            ? "pointer-events-auto opacity-100 z-10"
            : "pointer-events-none opacity-0 z-0"
        }`}
      >
        <div className="flex h-full w-full overflow-hidden">
          <Preview />
        </div>
      </div>

      {/* Normal Layout Mode */}
      <div
        className={`flex h-full w-full flex-col overflow-hidden transition-opacity duration-500 ease-in-out ${
          fitToWindow
            ? "pointer-events-none opacity-0"
            : "pointer-events-auto opacity-100"
        }`}
      >
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
    </div>
  );
}

export default App;
