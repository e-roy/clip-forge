import { Button } from "@/components/ui/button";
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
      className={`group relative cursor-pointer rounded-lg border p-2 transition-colors ${
        isSelected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      <div className="flex gap-2">
        {clip.thumbnail ? (
          <img
            src={clip.thumbnail}
            alt={clip.name}
            className="h-16 w-28 rounded object-cover"
          />
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            No thumbnail
          </div>
        )}
        <div className="flex-1 space-y-1">
          <p className="truncate text-sm font-medium">{clip.name}</p>
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p>{formatDuration(clip.duration)}</p>
            {clip.resolution && (
              <p>
                {clip.resolution.width}×{clip.resolution.height}
              </p>
            )}
            <p>{formatFileSize(clip.fileSize)}</p>
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
