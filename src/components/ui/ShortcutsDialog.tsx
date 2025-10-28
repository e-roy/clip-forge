import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  label: string;
  shortcuts: string[];
  description?: string;
}

const shortcuts: Shortcut[] = [
  {
    label: "Open Shortcuts",
    shortcuts: ["F1"],
    description: "Show this dialog",
  },
  {
    label: "Undo",
    shortcuts: ["Ctrl+Z", "Cmd+Z"],
    description: "Undo last action",
  },
  {
    label: "Redo",
    shortcuts: ["Ctrl+Shift+Z", "Cmd+Shift+Z"],
    description: "Redo last undone action",
  },
  {
    label: "Split Clip",
    shortcuts: ["S"],
    description: "Split clip at playhead",
  },
  {
    label: "Delete Clip",
    shortcuts: ["Delete", "Backspace"],
    description: "Remove selected clip from timeline",
  },
  {
    label: "Toggle Ripple Delete",
    shortcuts: ["R"],
    description: "Toggle ripple delete mode",
  },
  {
    label: "Toggle Grid",
    shortcuts: ["G"],
    description: "Show/hide grid",
  },
  {
    label: "Toggle Snap to Grid",
    shortcuts: ["Shift+G"],
    description: "Enable/disable snap to grid",
  },
  {
    label: "Zoom In",
    shortcuts: ["Ctrl+Plus", "Cmd+Plus", "Ctrl+="],
    description: "Zoom in timeline",
  },
  {
    label: "Zoom Out",
    shortcuts: ["Ctrl+Minus", "Cmd+Minus"],
    description: "Zoom out timeline",
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Here are all available keyboard shortcuts for ClipForge.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0"
            >
              <div className="flex-1">
                <div className="font-medium">{shortcut.label}</div>
                {shortcut.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {shortcut.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {shortcut.shortcuts.map((key, keyIndex) => (
                  <div key={keyIndex} className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted text-foreground border border-border rounded">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
