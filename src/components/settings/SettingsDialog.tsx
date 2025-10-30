import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/store/settings";
import { useEffect, useState } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, toggleTheme } = useSettingsStore();
  const [appVersion, setAppVersion] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<string>("Checking...");
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string>("");

  useEffect(() => {
    // Get app version
    if (window.api) {
      window.api
        .getAppVersion()
        .then(setAppVersion)
        .catch(() => setAppVersion("Unknown"));
    }

    // Set update status based on environment
    if (process.env.NODE_ENV === "production") {
      setUpdateStatus("Auto-updates enabled");
      setLastUpdateCheck("Automatic checks every 3 seconds after launch");
    } else {
      setUpdateStatus("Development mode (no auto-updates)");
      setLastUpdateCheck("Updates disabled in development");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-toggle">Theme</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
              <button
                id="theme-toggle"
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === "dark" ? "bg-primary" : "bg-muted"
                }`}
                type="button"
                role="switch"
                aria-checked={theme === "dark"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t my-4" />

          <div className="space-y-3">
            <h3 className="text-sm font-medium">About ClipForge</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Version:</span>
                <span>{appVersion || "Loading..."}</span>
              </div>
              <div className="flex justify-between">
                <span>Updates:</span>
                <span>{updateStatus}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {lastUpdateCheck}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
