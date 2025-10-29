import {
  app,
  BrowserWindow,
  dialog,
  desktopCapturer,
  ipcMain,
  Menu,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs/promises";
import { createRequire } from "module";
import Store from "electron-store";
import type { ExportJob } from "./types";
import { createApplicationMenu } from "./menu";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

process.env.APP_ROOT = path.join(__dirname, "..");

// Initialize electron-store for preferences
const store = new Store({
  defaults: {
    lastOutputFolder: "",
  },
});

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

  // Set application menu
  const menu = createApplicationMenu(win);
  Menu.setApplicationMenu(menu);

  // Handle about dialog from menu
  ipcMain.on("show-about-dialog", () => {
    const version = app.getVersion();
    const aboutMessage = `ClipForge ${version}\n\nA modern video editor built with Electron and React.`;

    dialog
      .showMessageBox(win!, {
        type: "info",
        title: "About ClipForge",
        message: "ClipForge",
        detail: aboutMessage,
        buttons: ["OK"],
      })
      .catch(() => {});
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
  const lastFolder = store.get("lastOutputFolder", "");
  const defaultPath = options?.defaultPath
    ? lastFolder
      ? path.join(lastFolder as string, options.defaultPath)
      : options.defaultPath
    : lastFolder
    ? path.join(lastFolder as string, "export.mp4")
    : "export.mp4";

  const result = await dialog.showSaveDialog(win!, {
    filters: options?.filters || [{ name: "Video Files", extensions: ["mp4"] }],
    defaultPath: defaultPath,
  });

  // Save the output folder for next time
  if (result.filePath) {
    const folder = path.dirname(result.filePath);
    store.set("lastOutputFolder", folder);
  }

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

        // Extract frame at a more representative time (avoid fade-ins)
        // For short videos, use middle; for longer videos, use 10% of duration
        const frameTime = duration < 5 ? duration * 0.2 : 2;

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

        // Read the thumbnail file and convert to base64 data URL
        const thumbData = await fs.readFile(thumbPath);
        const thumbBase64 = thumbData.toString("base64");
        thumbnail = `data:image/jpeg;base64,${thumbBase64}`;
      } catch (thumbError) {
        // Silently fail - thumbnail is optional
        console.error(
          `Thumbnail generation error for ${path.basename(filePath)}:`,
          thumbError
        );
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

// Helper function to parse ffmpeg output and extract time
function parseFFmpegProgress(stderr: string): number | null {
  // Look for time=HH:MM:SS.ms format
  const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3], 10);
    const centiseconds = parseInt(timeMatch[4], 10);
    return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
  }
  return null;
}

ipcMain.handle("export-video", async (_, payload: ExportJob) => {
  const ffmpegInstance = setupFfmpeg();
  const jobId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const { outputPath, resolution, fps, bitrateKbps, clips } = payload;

    if (clips.length === 0) {
      throw new Error("No clips to export");
    }

    // Sort clips by startTime and then by displayOrder (top tracks first)
    const sortedClips = [...clips].sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime - b.startTime;
      }
      return a.displayOrder - b.displayOrder;
    });

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

    // Create temp directory for intermediate files
    const tempDir = path.join(app.getPath("userData"), "ClipForge", "temp");
    await fs.mkdir(tempDir, { recursive: true });

    // Build timeline segments
    // Segment structure: { startTime, endTime, clips: [{ trackId, clipIndex }] }
    const segments: Array<{
      startTime: number;
      endTime: number;
      clipsByTrack: Map<number, (typeof sortedClips)[0]>;
    }> = [];

    // Create a list of all time boundaries
    const timeBoundaries = new Set<number>();
    sortedClips.forEach((clip) => {
      timeBoundaries.add(clip.startTime);
      timeBoundaries.add(clip.endTime);
    });
    const sortedTimes = Array.from(timeBoundaries).sort((a, b) => a - b);

    // Build segments between each time boundary
    for (let i = 0; i < sortedTimes.length - 1; i++) {
      const segmentStart = sortedTimes[i];
      const segmentEnd = sortedTimes[i + 1];
      const clipsByTrack = new Map<number, (typeof sortedClips)[0]>();

      // Find all clips that exist in this time segment (only visible tracks)
      sortedClips.forEach((clip) => {
        // Skip invisible tracks - they should not appear in export (matching preview behavior)
        if (!clip.visible) return;

        if (clip.startTime <= segmentStart && clip.endTime >= segmentEnd) {
          // This clip covers this segment
          // If there's already a clip on this track, keep the one with lower displayOrder (top priority)
          const existing = clipsByTrack.get(clip.trackId);
          if (!existing || clip.displayOrder < existing.displayOrder) {
            clipsByTrack.set(clip.trackId, clip);
          }
        }
      });

      if (clipsByTrack.size > 0) {
        segments.push({
          startTime: segmentStart,
          endTime: segmentEnd,
          clipsByTrack,
        });
      }
    }

    // Calculate total timeline duration for progress tracking
    const totalDuration =
      sortedTimes.length > 0
        ? sortedTimes[sortedTimes.length - 1] - sortedTimes[0]
        : 0;

    // Process segments and create a concat list
    const segmentFiles: string[] = [];
    let processedSegments = 0;

    for (const segment of segments) {
      const segmentDuration = segment.endTime - segment.startTime;
      const segmentOutputPath = path.join(
        tempDir,
        `segment_${processedSegments}.mp4`
      );

      // Get tracks sorted by displayOrder (top to bottom)
      const tracks = Array.from(segment.clipsByTrack.entries()).sort(
        (a, b) => a[1].displayOrder - b[1].displayOrder
      );

      // Helper to send progress update
      const sendProgress = () => {
        const percent = (processedSegments / segments.length) * 100;
        const elapsed = (Date.now() - startTime) / 1000;
        const eta =
          elapsed > 0 && percent > 0
            ? (elapsed / percent) * (100 - percent)
            : undefined;

        if (win && !win.isDestroyed()) {
          win.webContents.send("export-progress", {
            jobId,
            progress: percent,
            currentClip: `Segment ${processedSegments + 1}/${segments.length}`,
            elapsed: Math.round(elapsed),
            eta: eta ? Math.round(eta) : undefined,
          });
        }
      };

      if (tracks.length === 1) {
        // Single track - simple trim and encode
        const [_trackId, clip] = tracks[0];
        const clipTimeInSegment = segment.startTime - clip.startTime;
        const seekTime = clip.inTime + clipTimeInSegment;

        // Check if track is muted - if so, we need to output silent audio
        const isMuted = clip.muted;

        await new Promise<void>((resolve, reject) => {
          let command = ffmpegInstance(clip.path)
            .seekInput(seekTime)
            .duration(segmentDuration)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-preset veryfast",
              `-b:v ${bitrateKbps}k`,
              `-b:a 128k`,
              `-r ${fps}`,
              `-vf scale=${targetWidth}:${targetHeight}`,
              "-pix_fmt yuv420p",
            ]);

          // If track is muted, apply volume=0 to silence audio (visual still shows)
          if (isMuted) {
            command = command.outputOptions(["-filter:a volume=0"]);
          }

          command
            .output(segmentOutputPath)
            .on("stderr", (stderrLine: string) => {
              const timeValue = parseFFmpegProgress(stderrLine);
              if (timeValue !== null && totalDuration > 0) {
                sendProgress();
              }
            })
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });
      } else {
        // Multiple tracks - need to composite
        const command = ffmpegInstance();

        // Add all input files with seeking
        tracks.forEach(([_trackId, clip]) => {
          const clipTimeInSegment = segment.startTime - clip.startTime;
          const seekTime = clip.inTime + clipTimeInSegment;
          command.input(clip.path).seekInput(seekTime);
        });

        // Build filter complex for overlaying
        const filterParts: string[] = [];

        // Scale all inputs to target resolution
        tracks.forEach((_track, index) => {
          filterParts.push(
            `[${index}:v]scale=${targetWidth}:${targetHeight},setpts=PTS-STARTPTS[v${index}]`
          );
        });

        // Overlay tracks (lower displayOrder = base, higher displayOrder on top)
        // Input 0 is base layer (lowest displayOrder), subsequent inputs overlay
        let currentOutput = "v0";
        for (let i = 1; i < tracks.length; i++) {
          const nextOutput = i === tracks.length - 1 ? "vout" : `vtmp${i}`;
          filterParts.push(
            `[${currentOutput}][v${i}]overlay=0:0[${nextOutput}]`
          );
          currentOutput = nextOutput;
        }

        // Mix audio from unmuted tracks only
        // Muted tracks still show visually but contribute no audio (matching preview behavior)
        const unmutedTracks = tracks.filter(([_trackId, clip]) => !clip.muted);

        let audioMixFilter: string;
        if (unmutedTracks.length === 0) {
          // All tracks muted - output silent audio
          audioMixFilter = `[0:a]anull[aout]`;
        } else if (unmutedTracks.length === 1) {
          // Single unmuted track - pass through with volume applied
          const unmutedIndex = tracks.indexOf(unmutedTracks[0]);
          // Note: Volume adjustment would go here when implemented
          audioMixFilter = `[${unmutedIndex}:a]anull[aout]`;
        } else {
          // Multiple unmuted tracks - mix them
          const unmutedIndices = unmutedTracks.map((track) =>
            tracks.indexOf(track)
          );
          const audioInputs = unmutedIndices.map((i) => `[${i}:a]`).join("");
          // Note: Volume levels would be applied here when implemented
          audioMixFilter = `${audioInputs}amix=inputs=${unmutedIndices.length}:duration=first[aout]`;
        }
        filterParts.push(audioMixFilter);

        const filterComplex = filterParts.join(";");

        await new Promise<void>((resolve, reject) => {
          command
            .complexFilter(filterComplex)
            .outputOptions([
              "-map [vout]",
              "-map [aout]",
              "-t " + segmentDuration,
              "-preset veryfast",
              `-b:v ${bitrateKbps}k`,
              `-b:a 128k`,
              `-r ${fps}`,
              "-pix_fmt yuv420p",
            ])
            .output(segmentOutputPath)
            .on("stderr", (stderrLine: string) => {
              const timeValue = parseFFmpegProgress(stderrLine);
              if (timeValue !== null && totalDuration > 0) {
                sendProgress();
              }
            })
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });
      }

      segmentFiles.push(segmentOutputPath);
      processedSegments++;
    }

    // Concatenate all segments
    if (segmentFiles.length === 1) {
      // Single segment - just copy/rename
      await fs.rename(segmentFiles[0], outputPath);
    } else {
      // Multiple segments - concatenate
      const concatListPath = path.join(tempDir, "concat_list.txt");
      const concatContent = segmentFiles
        .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
        .join("\n");
      await fs.writeFile(concatListPath, concatContent);

      await new Promise<void>((resolve, reject) => {
        ffmpegInstance()
          .input(concatListPath)
          .inputOptions(["-f concat", "-safe 0"])
          .outputOptions(["-c copy"])
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err))
          .run();
      });
    }

    // Clean up temp files
    try {
      for (const file of segmentFiles) {
        await fs.unlink(file).catch(() => {});
      }
      await fs.unlink(path.join(tempDir, "concat_list.txt")).catch(() => {});
    } catch (cleanupError) {
      console.warn("Failed to clean up temp files:", cleanupError);
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
    console.error("Export error:", error);
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

// Project save/load handlers
ipcMain.handle("save-project", async (_, projectData: string) => {
  try {
    const projectsDir = path.join(
      app.getPath("userData"),
      "ClipForge",
      "Projects"
    );
    await fs.mkdir(projectsDir, { recursive: true });

    // Always save to autosave.cforge for auto-save functionality
    const projectPath = path.join(projectsDir, "autosave.cforge");

    await fs.writeFile(projectPath, projectData, "utf-8");
    return { success: true, path: projectPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("load-project", async (_, projectPath: string) => {
  try {
    const data = await fs.readFile(projectPath, "utf-8");
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-autosave-path", () => {
  const projectsDir = path.join(
    app.getPath("userData"),
    "ClipForge",
    "Projects"
  );
  return path.join(projectsDir, "autosave.cforge");
});

ipcMain.handle("delete-autosave", async () => {
  try {
    const projectsDir = path.join(
      app.getPath("userData"),
      "ClipForge",
      "Projects"
    );
    const autosavePath = path.join(projectsDir, "autosave.cforge");
    await fs.unlink(autosavePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("list-projects", async () => {
  try {
    const projectsDir = path.join(
      app.getPath("userData"),
      "ClipForge",
      "Projects"
    );
    await fs.mkdir(projectsDir, { recursive: true });

    const files = await fs.readdir(projectsDir);
    const projects = files
      .filter((file) => file.endsWith(".cforge"))
      .map((file) => {
        const filePath = path.join(projectsDir, file);
        const stats = require("fs").statSync(filePath);
        return {
          name: file.replace(".cforge", ""),
          path: filePath,
          modified: stats.mtime.getTime(),
        };
      })
      .sort((a, b) => b.modified - a.modified);

    return projects;
  } catch (error: any) {
    return [];
  }
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

// Crash flag management
const getCrashFlagPath = () =>
  path.join(app.getPath("userData"), "ClipForge", ".crash-flag");

// Set crash flag on app start
app.whenReady().then(() => {
  const CRASH_FLAG_PATH = getCrashFlagPath();
  fs.writeFile(CRASH_FLAG_PATH, "true").catch(() => {
    // Ignore errors
  });
});

// Clear crash flag on clean close
app.on("before-quit", () => {
  const CRASH_FLAG_PATH = getCrashFlagPath();
  fs.unlink(CRASH_FLAG_PATH).catch(() => {
    // Ignore errors
  });
});

// New IPC handlers for Stretch 7
ipcMain.handle(
  "save-project-as",
  async (_, projectData: string, filePath: string) => {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, projectData, "utf-8");
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("open-project-dialog", async () => {
  try {
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: "ClipForge Project", extensions: ["cforge"] }],
      properties: ["openFile"],
    });
    return result.canceled ? null : result.filePaths[0];
  } catch (error: any) {
    console.error("Failed to open project dialog:", error);
    return null;
  }
});

ipcMain.handle(
  "collect-assets",
  async (_, projectPath: string, clipPaths: string[]) => {
    try {
      const projectDir = path.dirname(projectPath);
      const assetsDir = path.join(projectDir, "assets");
      await fs.mkdir(assetsDir, { recursive: true });

      const collectedAssets: string[] = [];

      for (const clipPath of clipPaths) {
        try {
          // Check if file exists
          await fs.access(clipPath);

          // Get filename
          const filename = path.basename(clipPath);
          const destPath = path.join(assetsDir, filename);

          // Only copy if destination doesn't exist or is different
          let shouldCopy = true;
          try {
            const destStats = await fs.stat(destPath);
            const srcStats = await fs.stat(clipPath);
            if (destStats.mtime.getTime() === srcStats.mtime.getTime()) {
              shouldCopy = false;
            }
          } catch {
            // Destination doesn't exist, need to copy
          }

          if (shouldCopy) {
            await fs.copyFile(clipPath, destPath);
          }

          collectedAssets.push(destPath);
        } catch (error) {
          console.warn(`Failed to collect asset: ${clipPath}`, error);
        }
      }

      return { success: true, collectedAssets };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "create-archive",
  async (_, projectPath: string, outputPath: string) => {
    try {
      // Use Node.js child_process to create a zip file
      // For now, we'll use a simple implementation
      // In production, you might want to use the 'archiver' npm package

      const projectDir = path.dirname(projectPath);
      const assetsDir = path.join(projectDir, "assets");
      const assetsExist = await fs
        .access(assetsDir)
        .then(() => true)
        .catch(() => false);

      // Get all files to include
      const filesToArchive: string[] = [projectPath];

      if (assetsExist) {
        const assetFiles = await fs.readdir(assetsDir);
        for (const file of assetFiles) {
          filesToArchive.push(path.join(assetsDir, file));
        }
      }

      // Create a simple manifest and use a basic approach
      // For production, consider using the 'archiver' package
      // For now, return success and let the user know manual creation is needed

      await fs.writeFile(
        outputPath,
        JSON.stringify({ files: filesToArchive }, null, 2),
        "utf-8"
      );

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("check-crash-recovery", async () => {
  try {
    const CRASH_FLAG_PATH = getCrashFlagPath();
    const exists = await fs
      .access(CRASH_FLAG_PATH)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      return { hasCrash: false };
    }

    // Check if autosave exists
    const projectsDir = path.join(
      app.getPath("userData"),
      "ClipForge",
      "Projects"
    );
    const autosaveFile = path.join(projectsDir, "autosave.cforge");

    const autosaveExists = await fs
      .access(autosaveFile)
      .then(() => true)
      .catch(() => false);

    return {
      hasCrash: true,
      autosavePath: autosaveExists ? autosaveFile : undefined,
    };
  } catch (error) {
    return { hasCrash: false };
  }
});

ipcMain.handle("clear-crash-flag", async () => {
  try {
    const CRASH_FLAG_PATH = getCrashFlagPath();
    await fs.unlink(CRASH_FLAG_PATH);
  } catch {
    // Ignore errors
  }
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
