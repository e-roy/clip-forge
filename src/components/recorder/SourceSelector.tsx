import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, SquareStack, Video } from "lucide-react";
import type { DesktopSource } from "@/types/ipc";

interface SourceSelectorProps {
  sources: DesktopSource[];
  cameraDevices?: MediaDeviceInfo[];
  selectedSource: string;
  onSelectSource: (sourceId: string) => void;
  activeTab: "screen" | "window" | "camera";
  onTabChange: (tab: "screen" | "window" | "camera") => void;
  isRecording: boolean;
}

export function SourceSelector({
  sources,
  cameraDevices = [],
  selectedSource,
  onSelectSource,
  activeTab,
  onTabChange,
  isRecording,
}: SourceSelectorProps) {
  const screenSources = sources.filter((s) => s.type === "screen");
  const windowSources = sources.filter((s) => s.type === "window");

  return (
    <div className="w-80 flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          onTabChange(value as "screen" | "window" | "camera")
        }
        className="flex flex-col h-full"
      >
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="screen" disabled={isRecording}>
            <Monitor className="mr-2 h-4 w-4" />
            Screen
          </TabsTrigger>
          <TabsTrigger value="window" disabled={isRecording}>
            <SquareStack className="mr-2 h-4 w-4" />
            Window
          </TabsTrigger>
          <TabsTrigger value="camera" disabled={isRecording}>
            <Video className="mr-2 h-4 w-4" />
            Camera
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="screen"
          className="mt-4 flex-1 flex flex-col min-h-0"
        >
          {!isRecording && (
            <>
              {screenSources.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    No screens available
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[51vh] pr-4">
                  <div className="space-y-2">
                    {screenSources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => onSelectSource(source.id)}
                        className={`w-full p-2 border rounded-md hover:border-primary transition-colors ${
                          selectedSource === source.id
                            ? "border-primary bg-primary/10"
                            : ""
                        }`}
                        disabled={isRecording}
                      >
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-full h-auto rounded mb-1"
                        />
                        <p className="text-xs truncate text-left">
                          {source.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
          {isRecording && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-muted-foreground text-center">
                Recording in progress...
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="window"
          className="mt-4 flex-1 flex flex-col min-h-0"
        >
          {!isRecording && (
            <>
              {windowSources.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    No windows available
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[51vh] pr-4">
                  <div className="space-y-2">
                    {windowSources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => onSelectSource(source.id)}
                        className={`w-full p-2 border rounded-md hover:border-primary transition-colors ${
                          selectedSource === source.id
                            ? "border-primary bg-primary/10"
                            : ""
                        }`}
                        disabled={isRecording}
                      >
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="h-auto rounded mb-1"
                        />
                        <p className="text-xs truncate text-left">
                          {source.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
          {isRecording && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-muted-foreground text-center">
                Recording in progress...
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="camera"
          className="mt-4 flex-1 flex flex-col min-h-0"
        >
          {!isRecording && (
            <>
              {cameraDevices.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No cameras available
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Make sure you granted camera permissions
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[51vh] pr-4">
                  <div className="space-y-2">
                    {cameraDevices.map((device) => (
                      <button
                        key={device.deviceId}
                        onClick={() => onSelectSource(device.deviceId)}
                        className={`w-full p-2 border rounded-md hover:border-primary transition-colors ${
                          selectedSource === device.deviceId
                            ? "border-primary bg-primary/10"
                            : ""
                        }`}
                        disabled={isRecording}
                      >
                        <div className="w-full h-auto rounded mb-1 bg-muted aspect-video flex items-center justify-center">
                          <Video
                            className={`h-12 w-12 ${
                              selectedSource === device.deviceId
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <p className="text-xs truncate text-left">
                          {device.label ||
                            `Camera ${device.deviceId.slice(0, 8)}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
          {isRecording && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-muted-foreground text-center">
                Recording in progress...
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
