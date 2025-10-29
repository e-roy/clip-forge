import { useState, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Volume2,
  VolumeX,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTimelineStore } from "@/store/timeline";
import { AudioMeter } from "./AudioMeter";

interface TrackControlsProps {
  trackId: string;
  trackName: string;
  height: number;
  isVisible?: boolean;
  isLocked?: boolean;
  isMuted?: boolean;
}

export function TrackControls({
  trackId,
  trackName,
  height,
  isVisible = true,
  isLocked = false,
  isMuted = false,
}: TrackControlsProps) {
  const {
    toggleTrackVisibility,
    toggleTrackLock,
    toggleTrackMute,
    updateTrackName,
    deleteTrack,
    tracks,
    reorderTracks,
  } = useTimelineStore();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(trackName);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when track name changes externally
  useEffect(() => {
    if (!isEditing) {
      setInputValue(trackName);
    }
  }, [trackName, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleLabelClick = () => {
    setIsEditing(true);
  };

  const handleInputBlur = () => {
    if (inputValue.trim() && inputValue !== trackName) {
      updateTrackName(trackId, inputValue.trim());
    } else {
      setInputValue(trackName);
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (inputValue.trim() && inputValue !== trackName) {
        updateTrackName(trackId, inputValue.trim());
      } else {
        setInputValue(trackName);
      }
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setInputValue(trackName);
      setIsEditing(false);
    }
  };

  const handleDeleteTrackClick = () => {
    // Don't allow deleting if it's the last track
    if (tracks.length <= 1) {
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteTrack(trackId);
    setShowDeleteDialog(false);
  };

  // Don't render delete button if this is the last track
  const canDelete = tracks.length > 1;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/track-id", trackId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedTrackId = e.dataTransfer.getData("application/track-id");

    if (draggedTrackId === trackId) return;

    const currentOrder = tracks
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((t) => t.id);

    const draggedIndex = currentOrder.indexOf(draggedTrackId);
    const dropIndex = currentOrder.indexOf(trackId);

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedTrackId);

    reorderTracks(newOrder);
  };

  return (
    <div
      className="flex border-b border-border"
      style={{ height: `${height}px` }}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col flex-1">
        {/* Drag handle and editable label */}
        <div className="flex items-center flex-1 px-1 py-0.5 gap-1">
          <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
          {isEditing ? (
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="h-6 text-xs font-medium flex-1"
              autoFocus
            />
          ) : (
            <div
              onClick={handleLabelClick}
              className="flex-1 h-6 px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 cursor-text rounded transition-colors flex items-center"
              title="Click to edit"
            >
              {trackName}
            </div>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-1 pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Show/hide track"
            onClick={() => toggleTrackVisibility(trackId)}
          >
            {isVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Lock track"
            onClick={() => toggleTrackLock(trackId)}
          >
            {isLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <LockOpen className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Mute track"
            onClick={() => toggleTrackMute(trackId)}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete track"
              onClick={handleDeleteTrackClick}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Audio Meter */}
      <AudioMeter trackId={trackId} height={height} isMuted={isMuted} />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{trackName}"? This will remove
              all clips on this track and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
