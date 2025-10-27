import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { XIcon } from "lucide-react";
import type { Clip } from "@/types/clip";

interface ClipCardProps {
  clip: Clip;
  onSelect: () => void;
  onRemove: () => void;
  formatDuration: (seconds: number) => string;
  formatFileSize: (bytes: number) => string;
  isSelected?: boolean;
}

export function ClipCard({
  clip,
  onSelect,
  onRemove,
  formatDuration,
  formatFileSize,
  isSelected = false,
}: ClipCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", clip.id);
      }}
      onClick={onSelect}
      className={`group relative w-full cursor-pointer rounded-lg border p-2 transition-colors ${
        isSelected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:bg-accent"
      }`}
      style={{ maxWidth: "100%", boxSizing: "border-box" }}
    >
      <div className="grid grid-cols-[80px_1fr] gap-2">
        {clip.thumbnail ? (
          <img
            src={clip.thumbnail}
            alt={clip.name}
            className="h-16 w-20 rounded object-cover"
          />
        ) : (
          <div className="flex h-16 w-20 items-center justify-center rounded bg-muted text-xs text-muted-foreground text-center leading-tight">
            No thumb
          </div>
        )}
        <div
          className="space-y-1 pr-7"
          style={{
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate text-sm font-medium" title={clip.name}>
                {clip.name}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs wrap-break-word">{clip.name}</p>
            </TooltipContent>
          </Tooltip>
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p className="truncate">{formatDuration(clip.duration)}</p>
            {clip.resolution && (
              <p className="truncate">
                {clip.resolution.width}×{clip.resolution.height}
              </p>
            )}
            <p className="truncate">{formatFileSize(clip.fileSize)}</p>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleRemove}
      >
        <XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}
