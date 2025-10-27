import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  const iconPath = process.env.VITE_PUBLIC
    ? path.join(process.env.VITE_PUBLIC, "electron-vite.svg")
    : undefined;

  win = new BrowserWindow({
    ...(iconPath && { icon: iconPath }),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// IPC Handlers
ipcMain.handle("open-file-dialog", async (_, options) => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ["openFile", "multiSelections"],
    filters: options?.filters || [
      { name: "Media Files", extensions: ["mp4", "mov", "webm"] },
    ],
  });
  return result.filePaths;
});

ipcMain.handle("get-media-info", async () => {
  // Stub - will be implemented later
  return [];
});

ipcMain.handle("export-video", async () => {
  // Stub - will be implemented later
  return { jobId: "stub" };
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
