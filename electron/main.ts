import { app, BrowserWindow, dialog, desktopCapturer, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs/promises";
import { createRequire } from "module";
import type { ExportJob } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Setup ffmpeg paths (lazy load to avoid bundling issues)
let ffmpegInstance: any = null;

const setupFfmpeg = () => {
  if (!ffmpegInstance) {
    const ffmpeg = require("fluent-ffmpeg");
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
    const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

    let ffmpegPath = ffmpegInstaller.path;
    let ffprobePath = ffprobeInstaller.path;

    // In production (packaged app), check if paths need adjustment
    // Check if running from asar archive (production)
    const isProduction = !app.isPackaged === false;

    if (isProduction && !ffmpegPath.includes("app.asar")) {
      // In packaged builds, the binaries are in extraResources
      const resourcesPath = process.resourcesPath || app.getAppPath();
      const potentialFfmpegPath = path.join(resourcesPath, "ffmpeg");
      const potentialFfprobePath = path.join(resourcesPath, "ffprobe");

      // Check if the paths exist in extraResources first
      try {
        const fsSync = require("fs");
        if (fsSync.existsSync(potentialFfmpegPath)) {
          // Find the actual executable in the directory
          const ffmpegFiles = fsSync.readdirSync(potentialFfmpegPath);
          const ffmpegExe = ffmpegFiles.find(
            (f: string) => f === "ffmpeg.exe" || f === "ffmpeg"
          );
          if (ffmpegExe) {
            ffmpegPath = path.join(potentialFfmpegPath, ffmpegExe);
          }
        }

        if (fsSync.existsSync(potentialFfprobePath)) {
          const ffprobeFiles = fsSync.readdirSync(potentialFfprobePath);
          const ffprobeExe = ffprobeFiles.find(
            (f: string) => f === "ffprobe.exe" || f === "ffprobe"
          );
          if (ffprobeExe) {
            ffprobePath = path.join(potentialFfprobePath, ffprobeExe);
          }
        }
      } catch (err) {
        console.error("Failed to locate FFmpeg in extraResources:", err);
      }
    }

    console.log("FFmpeg path:", ffmpegPath);
    console.log("FFprobe path:", ffprobePath);

    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);

    ffmpegInstance = ffmpeg;
  }
  return ffmpegInstance;
};

let win: BrowserWindow | null;

async function loadDevServerWithRetry(
  window: BrowserWindow,
  url: string,
  maxRetries = 15,
  retryDelay = 800
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await window.loadURL(url);
      console.log(
        `✓ Successfully loaded dev server at ${url} (attempt ${
          i + 1
        }/${maxRetries})`
      );
      return;
    } catch (error: any) {
      const errorMsg = error.code || error.message || "Unknown error";
      console.log(
        `⏳ Attempt ${
          i + 1
        }/${maxRetries}: Dev server not ready yet (${errorMsg})`
      );

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.error("❌ Failed to load dev server after maximum retries");
        throw error;
      }
    }
  }
}

function createWindow() {
  const iconPath = process.env.VITE_PUBLIC
    ? path.join(process.env.VITE_PUBLIC, "electron-vite.svg")
    : undefined;

  win = new BrowserWindow({
    ...(iconPath && { icon: iconPath }),
    width: 1200,
    height: 800,
    show: false, // Don't show window until ready
    backgroundColor: "#1a1a1a", // Dark background while loading
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local video files
    },
  });

  // Show window when ready to prevent blank screen
  win.once("ready-to-show", () => {
    win?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    // Use retry mechanism for dev server
    loadDevServerWithRetry(win, VITE_DEV_SERVER_URL)
      .then(() => {
        // Window will show via ready-to-show event
      })
      .catch((error) => {
        console.error("Failed to load dev server:", error);
        win?.show(); // Show window even on error so user can see the error
        dialog.showErrorBox(
          "Dev Server Error",
          `Failed to connect to Vite dev server at ${VITE_DEV_SERVER_URL}\n\nPlease ensure the dev server is running.`
        );
      });
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // Add keyboard shortcuts for development
  win.webContents.on("before-input-event", (event, input) => {
    // Ctrl+R or Cmd+R: Reload the window
    if ((input.control || input.meta) && input.key.toLowerCase() === "r") {
      event.preventDefault();
      win?.reload();
    }
    // Ctrl+Shift+R or Cmd+Shift+R: Hard reload
    if (
      (input.control || input.meta) &&
      input.shift &&
      input.key.toLowerCase() === "r"
    ) {
      event.preventDefault();
      win?.webContents.reloadIgnoringCache();
    }
  });
}

// IPC Handlers
ipcMain.handle("open-file-dialog", async (_, options) => {
  const result = await dialog.showOpenDialog(win!, {
    properties: (options?.properties as any) || ["openFile", "multiSelections"],
    filters: options?.filters || [
      { name: "Media Files", extensions: ["mp4", "mov", "webm"] },
    ],
  });
  return result.filePaths;
});

ipcMain.handle("save-file-dialog", async (_, options) => {
  const result = await dialog.showSaveDialog(win!, {
    filters: options?.filters || [{ name: "Video Files", extensions: ["mp4"] }],
    defaultPath: options?.defaultPath || "export.mp4",
  });
  return result.filePath || "";
});

ipcMain.handle("get-media-info", async (_, filePaths: string[]) => {
  const clipsMetadata = [];
  const ffmpegInstance = setupFfmpeg();

  for (const filePath of filePaths) {
    try {
      // Validate path
      if (!filePath || typeof filePath !== "string") {
        continue;
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Get media metadata using ffprobe
      const metadata: any = await new Promise((resolve, reject) => {
        ffmpegInstance.ffprobe(filePath, (err: Error | null, metadata: any) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });

      // Extract video stream
      const videoStream = metadata.streams.find(
        (s: { codec_type: string }) => s.codec_type === "video"
      );

      if (!videoStream) {
        continue;
      }

      // Calculate duration
      const duration = metadata.format.duration || 0;

      // Extract resolution
      const width = videoStream.width;
      const height = videoStream.height;

      // Get format and codec
      const format = metadata.format.format_name?.split(",")[0] || "unknown";
      const codec = videoStream.codec_name || "unknown";

      // Generate thumbnail (optional - continue even if this fails)
      let thumbnail: string | undefined;
      try {
        const thumbDir = path.join(
          app.getPath("userData"),
          "ClipForge",
          "thumbs"
        );
        await fs.mkdir(thumbDir, { recursive: true });

        const fileName = path.basename(filePath, path.extname(filePath));
        // Sanitize filename for file system compatibility
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const thumbPath = path.join(thumbDir, `${sanitizedName}_thumb.jpg`);

        // Extract frame at 1 second (or middle if duration < 2s)
        const frameTime = duration < 2 ? duration / 2 : 1;

        await new Promise<void>((resolve, reject) => {
          ffmpegInstance(filePath)
            .seekInput(frameTime)
            .outputOptions([
              "-frames:v 1", // Extract only 1 frame
              "-q:v 2", // High quality JPEG
            ])
            .output(thumbPath)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });

        thumbnail = `file://${thumbPath}`;
      } catch (thumbError) {
        // Silently fail - thumbnail is optional
      }

      clipsMetadata.push({
        path: filePath,
        duration: Math.round(duration * 1000) / 1000, // Keep 3 decimal places
        format,
        codec,
        fileSize,
        resolution: { width, height },
        thumbnail,
      });
    } catch (error) {
      // Continue with other files
    }
  }

  return clipsMetadata;
});

ipcMain.handle("export-video", async (_, payload: ExportJob) => {
  const ffmpegInstance = setupFfmpeg();
  const jobId = crypto.randomUUID();

  try {
    const { outputPath, resolution, fps, bitrateKbps, clips } = payload;

    if (clips.length === 0) {
      throw new Error("No clips to export");
    }

    // Determine output resolution
    let targetWidth: number;
    let targetHeight: number;

    if (resolution === "720p") {
      targetWidth = 1280;
      targetHeight = 720;
    } else if (resolution === "1080p") {
      targetWidth = 1920;
      targetHeight = 1080;
    } else {
      // Use source resolution (get from first clip)
      const videoStream = (await new Promise((resolve, reject) => {
        ffmpegInstance.ffprobe(
          clips[0].path,
          (err: Error | null, metadata: any) => {
            if (err) reject(err);
            else
              resolve(
                metadata.streams.find(
                  (s: { codec_type: string }) => s.codec_type === "video"
                )
              );
          }
        );
      })) as any;
      targetWidth = videoStream.width;
      targetHeight = videoStream.height;
    }

    // For single clip, simple trim
    if (clips.length === 1) {
      const clip = clips[0];
      const trimStart = clip.inTime;
      const trimDuration = clip.outTime - clip.inTime;

      await new Promise<void>((resolve, reject) => {
        ffmpegInstance(clip.path)
          .seekInput(trimStart)
          .duration(trimDuration)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-preset veryfast",
            `-b:v ${bitrateKbps}k`,
            `-b:a 128k`,
            `-r ${fps}`,
            `-vf scale=${targetWidth}:${targetHeight}`,
            "-pix_fmt yuv420p", // Ensure compatibility
          ])
          .output(outputPath)
          .on("progress", (progress: { percent?: number }) => {
            const percent = Math.min(progress.percent || 0, 100);
            if (win && !win.isDestroyed()) {
              win.webContents.send("export-progress", {
                jobId,
                progress: percent,
                currentClip: path.basename(clip.path),
              });
            }
          })
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err))
          .run();
      });
    } else {
      // Multi-clip: create concatenation via file list
      const concatFile = path.join(app.getPath("temp"), `concat_${jobId}.txt`);
      let concatContent = "";

      for (const clip of clips) {
        const trimStart = clip.inTime;
        concatContent += `file '${clip.path}'\ninpoint ${trimStart}\noutpoint ${clip.outTime}\n`;
      }

      await fs.writeFile(concatFile, concatContent);

      await new Promise<void>((resolve, reject) => {
        ffmpegInstance(concatFile)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-preset veryfast",
            `-b:v ${bitrateKbps}k`,
            `-b:a 128k`,
            `-r ${fps}`,
            `-vf scale=${targetWidth}:${targetHeight}`,
            "-pix_fmt yuv420p",
          ])
          .output(outputPath)
          .on("progress", (progress: { percent?: number }) => {
            const percent = Math.min(progress.percent || 0, 100);
            if (win && !win.isDestroyed()) {
              win.webContents.send("export-progress", {
                jobId,
                progress: percent,
              });
            }
          })
          .on("end", () => {
            // Cleanup concat file
            fs.unlink(concatFile).catch(console.error);
            resolve();
          })
          .on("error", (err: Error) => {
            fs.unlink(concatFile).catch(console.error);
            reject(err);
          })
          .run();
      });
    }

    if (win && !win.isDestroyed()) {
      win.webContents.send("export-done", {
        jobId,
        success: true,
        outputPath,
      });
    }

    return { jobId };
  } catch (error: any) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("export-done", {
        jobId,
        success: false,
        error: error.message || "Export failed",
      });
    }
    throw error;
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-desktop-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
    thumbnailSize: { width: 300, height: 200 },
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
  }));
});

ipcMain.handle(
  "write-recording-file",
  async (_, data: ArrayBuffer, filename: string) => {
    const recordingsDir = path.join(
      app.getPath("userData"),
      "ClipForge",
      "recordings"
    );
    await fs.mkdir(recordingsDir, { recursive: true });

    const filePath = path.join(recordingsDir, filename);
    await fs.writeFile(filePath, Buffer.from(data));

    return filePath;
  }
);

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
