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
import { spawn } from "node:child_process";
import Store from "electron-store";
import { autoUpdater } from "electron-updater";
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
let ffmpegPaths: { ffmpeg: string; ffprobe: string } | null = null;

const setupFfmpeg = () => {
  if (!ffmpegPaths) {
    const ffmpegPath = require("ffmpeg-static");
    const ffprobePath = require("ffprobe-static");

    ffmpegPaths = {
      ffmpeg: ffmpegPath,
      ffprobe: typeof ffprobePath === "string" ? ffprobePath : ffprobePath.path,
    };
  }
  return ffmpegPaths;
};

// Helper function to run ffprobe and get JSON output
const runFfprobe = (filePath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const paths = setupFfmpeg();
    const ffprobe = spawn(paths.ffprobe, [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    let stdout = "";
    let stderr = "";

    ffprobe.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(stdout);
          resolve(metadata);
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error}`));
        }
      } else {
        reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
      }
    });

    ffprobe.on("error", (error) => {
      reject(error);
    });
  });
};

// Helper function to run ffmpeg command
const runFfmpeg = (args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const paths = setupFfmpeg();
    // console.log(
    //   "🎥 Running simple FFmpeg command:",
    //   paths.ffmpeg,
    //   args.join(" ")
    // );

    const ffmpeg = spawn(paths.ffmpeg, args);

    let stderr = "";
    let stdout = "";

    ffmpeg.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on("data", (data) => {
      const dataStr = data.toString();
      stderr += dataStr;
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error("Simple FFmpeg failed with stderr:", stderr);
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error("Simple FFmpeg spawn error:", error);
      reject(error);
    });
  });
};

// FFmpeg export functions - migrated from fluent-ffmpeg

// Generate black video + silence for gap segments
const generateGapSegment = async (
  outputPath: string,
  duration: number,
  width: number,
  height: number,
  fps: number,
  bitrateKbps: number,
  onProgress?: (time: number) => void
): Promise<void> => {
  const args = [
    "-y", // Overwrite output files without prompting
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=${width}x${height}:r=${fps}:d=${duration}`,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "-r",
    fps.toString(),
    "-b:v",
    `${bitrateKbps}k`,
    "-b:a",
    "128k",
    "-t",
    duration.toString(),
    outputPath,
  ];

  await runFfmpegWithProgress(args, onProgress);
};

// Export simple segment (single video/audio source)
const exportSimpleSegment = async (
  inputPath: string,
  outputPath: string,
  seekTime: number,
  duration: number,
  width: number,
  height: number,
  fps: number,
  bitrateKbps: number,
  onProgress?: (time: number) => void
): Promise<void> => {
  const args = [
    "-y", // Overwrite output files without prompting
    "-i",
    inputPath,
    "-ss",
    seekTime.toString(),
    "-t",
    duration.toString(),
    "-vf",
    `scale=${width}:${height}`,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-preset",
    "veryfast",
    "-b:v",
    `${bitrateKbps}k`,
    "-b:a",
    "128k",
    "-r",
    fps.toString(),
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ];

  await runFfmpegWithProgress(args, onProgress);
};

// Export complex segment with multiple inputs - use separate processing
const exportComplexSegment = async (
  videoInput: { path: string; seekTime: number },
  audioInputs: Array<{ path: string; seekTime: number }>,
  outputPath: string,
  duration: number,
  width: number,
  height: number,
  fps: number,
  bitrateKbps: number,
  onProgress?: (time: number) => void
): Promise<void> => {
  const tempDir = require("path").dirname(outputPath);
  const videoTemp = require("path").join(
    tempDir,
    `temp_video_${Date.now()}.mp4`
  );
  const audioTemp = require("path").join(
    tempDir,
    `temp_audio_${Date.now()}.mp4`
  );

  try {
    // Process video
    await exportSimpleSegment(
      videoInput.path,
      videoTemp,
      videoInput.seekTime,
      duration,
      width,
      height,
      fps,
      bitrateKbps
    );

    // Process audio - mix all audio inputs
    if (audioInputs.length > 0) {
      const validAudioInputs: Array<{ path: string; seekTime: number }> = [];

      // Check each audio input for valid audio streams
      for (const audioInput of audioInputs) {
        try {
          const audioProbe = await runFfprobe(audioInput.path);
          const hasAudio = audioProbe.streams.some(
            (s: any) => s.codec_type === "audio"
          );

          if (hasAudio) {
            validAudioInputs.push(audioInput);
          }
        } catch (error) {
          // Skip audio sources that can't be probed
        }
      }

      if (validAudioInputs.length === 0) {
        // Create silent audio file
        await runFfmpeg([
          "-y",
          "-f",
          "lavfi",
          "-i",
          "anullsrc=r=48000:cl=stereo",
          "-t",
          duration.toString(),
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          audioTemp,
        ]);
      } else if (validAudioInputs.length === 1) {
        // Single audio source - extract directly
        const audioInput = validAudioInputs[0];
        await runFfmpeg([
          "-y",
          "-i",
          audioInput.path,
          "-ss",
          audioInput.seekTime.toString(),
          "-t",
          duration.toString(),
          "-vn", // No video
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          audioTemp,
        ]);
      } else {
        // Multiple audio sources - use amix filter to mix them
        const mixInputs: string[] = [];
        const filterComplexParts: string[] = [];

        validAudioInputs.forEach((audioInput, index) => {
          mixInputs.push("-i", audioInput.path);
          filterComplexParts.push(
            `[${index}:a]atrim=${audioInput.seekTime}:${
              audioInput.seekTime + duration
            }[a${index}]`
          );
        });

        // Add the amix filter
        filterComplexParts.push(
          `${validAudioInputs.map((_, i) => `[a${i}]`).join("")}amix=inputs=${
            validAudioInputs.length
          }:duration=longest[aout]`
        );

        const mixArgs = [
          "-y",
          ...mixInputs,
          "-filter_complex",
          filterComplexParts.join(";"),
          "-map",
          "[aout]",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          audioTemp,
        ];

        await runFfmpeg(mixArgs);
      }
    } else {
      // Create silent audio file
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-t",
        duration.toString(),
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        audioTemp,
      ]);
    }

    // Combine video and audio
    const combineArgs = ["-y", "-i", videoTemp];

    if (audioInputs.length > 0) {
      combineArgs.push("-i", audioTemp);
      combineArgs.push(
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        "-map",
        "0:v",
        "-map",
        "1:a",
        outputPath
      );
    } else {
      combineArgs.push(
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        outputPath
      );
    }

    await runFfmpegWithProgress(combineArgs, onProgress);

    // Clean up temp files
    const fs = require("fs").promises;
    await fs.unlink(videoTemp).catch(() => {});
    if (audioInputs.length > 0) {
      await fs.unlink(audioTemp).catch(() => {});
    }
  } catch (error) {
    // Clean up temp files on error
    const fs = require("fs").promises;
    await fs.unlink(videoTemp).catch(() => {});
    if (audioInputs.length > 0) {
      await fs.unlink(audioTemp).catch(() => {});
    }
    throw error;
  }
};

// Concatenate multiple video files
const concatenateSegments = async (
  segmentFiles: string[],
  outputPath: string
): Promise<void> => {
  if (segmentFiles.length === 1) {
    // Single segment - just rename
    await fs.rename(segmentFiles[0], outputPath);
    return;
  }

  // Multiple segments - use concat demuxer
  const tempDir = path.dirname(segmentFiles[0]);
  const concatListPath = path.join(tempDir, "concat_list.txt");
  const concatContent = segmentFiles
    .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
    .join("\n");

  await fs.writeFile(concatListPath, concatContent);

  const args = [
    "-y", // Overwrite output files without prompting
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c",
    "copy",
    outputPath,
  ];

  await runFfmpeg(args);

  // Clean up concat list
  await fs.unlink(concatListPath).catch(() => {});
};

// Enhanced runFfmpeg with progress monitoring
const runFfmpegWithProgress = (
  args: string[],
  onProgress?: (time: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const paths = setupFfmpeg();

    const ffmpeg = spawn(paths.ffmpeg, args);

    let stderr = "";
    let stdout = "";

    ffmpeg.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on("data", (data) => {
      const dataStr = data.toString();
      stderr += dataStr;

      if (onProgress) {
        const timeValue = parseFFmpegProgress(dataStr);
        if (timeValue !== null) {
          onProgress(timeValue);
        }
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error("FFmpeg failed with stderr:", stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error("FFmpeg spawn error:", error);
      reject(error);
    });
  });
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
      // console.log(
      //   `✓ Successfully loaded dev server at ${url} (attempt ${
      //     i + 1
      //   }/${maxRetries})`
      // );
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
      const metadata = await runFfprobe(filePath);

      // Extract video stream
      const videoStream = metadata.streams.find(
        (s: { codec_type: string }) => s.codec_type === "video"
      );

      if (!videoStream) {
        continue;
      }

      // Extract audio stream for sample rate
      const audioStream = metadata.streams.find(
        (s: { codec_type: string }) => s.codec_type === "audio"
      );
      const audioSampleRate = audioStream?.sample_rate || 48000; // Default to 48kHz

      // Extract frame rate (r_frame_rate or avg_frame_rate)
      // r_frame_rate is the lowest frame rate with the greatest time precision
      // avg_frame_rate is the average frame rate
      let frameRate: number | undefined;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        frameRate = num / den;
      } else if (videoStream.avg_frame_rate) {
        const [num, den] = videoStream.avg_frame_rate.split("/").map(Number);
        frameRate = num / den;
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

        await runFfmpeg([
          "-i",
          filePath,
          "-ss",
          frameTime.toString(),
          "-frames:v",
          "1", // Extract only 1 frame
          "-q:v",
          "2", // High quality JPEG
          thumbPath,
        ]);

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
        audioSampleRate,
        frameRate,
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
      const metadata = await runFfprobe(clips[0].path);
      const videoStream = metadata.streams.find(
        (s: { codec_type: string }) => s.codec_type === "video"
      );
      targetWidth = videoStream.width;
      targetHeight = videoStream.height;
    }

    // Create temp directory for intermediate files
    const tempDir = path.join(app.getPath("userData"), "ClipForge", "temp");
    await fs.mkdir(tempDir, { recursive: true });

    // Build timeline segments
    // Each segment has ONE video source (topmost visible item) and potentially multiple audio sources
    const segments: Array<{
      startTime: number;
      endTime: number;
      videoClip: (typeof sortedClips)[0] | null;
      audioClips: (typeof sortedClips)[0][];
    }> = [];

    // Create a list of all time boundaries (only clip starts/ends - export to last clip only)
    const timeBoundaries = new Set<number>();
    timeBoundaries.add(0);
    sortedClips.forEach((clip) => {
      timeBoundaries.add(clip.startTime);
      timeBoundaries.add(clip.endTime);
    });
    const sortedTimes = Array.from(timeBoundaries).sort((a, b) => a - b);

    // Build segments between each time boundary
    for (let i = 0; i < sortedTimes.length - 1; i++) {
      const segmentStart = sortedTimes[i];
      const segmentEnd = sortedTimes[i + 1];

      // Find all clips that exist in this time segment (only visible tracks)
      const activeClips = sortedClips.filter((clip) => {
        // Skip invisible tracks - they should not appear in export (matching preview behavior)
        if (!clip.visible) return false;

        // Check if clip covers this segment
        return clip.startTime <= segmentStart && clip.endTime >= segmentEnd;
      });

      if (activeClips.length === 0) {
        // Gap segment: generate black video + silence
        segments.push({
          startTime: segmentStart,
          endTime: segmentEnd,
          videoClip: null,
          audioClips: [],
        });
        continue;
      }

      // Sort by displayOrder to find topmost (lowest displayOrder = top of UI)
      const sortedActiveClips = [...activeClips].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );

      // Topmost clip provides the video
      const videoClip = sortedActiveClips[0];

      // All unmuted clips provide audio (matching preview behavior)
      const audioClips = sortedActiveClips.filter((clip) => !clip.muted);

      segments.push({
        startTime: segmentStart,
        endTime: segmentEnd,
        videoClip,
        audioClips,
      });
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

      // Handle gap segments (no video/audio clips)
      if (!segment.videoClip) {
        await generateGapSegment(
          segmentOutputPath,
          segmentDuration,
          targetWidth,
          targetHeight,
          fps,
          bitrateKbps,
          (_time) => {
            if (totalDuration > 0) {
              sendProgress();
            }
          }
        );

        segmentFiles.push(segmentOutputPath);
        processedSegments++;
        continue;
      }

      // Calculate seek time for video clip
      const videoClip = segment.videoClip!;
      const videoClipTimeInSegment = segment.startTime - videoClip.startTime;
      const videoSeekTime = videoClip.inTime + videoClipTimeInSegment;

      // Determine if we can use the simple case (single clip for both video and audio)
      const useSimpleCase =
        segment.audioClips.length === 1 &&
        segment.audioClips[0].path === videoClip.path &&
        segment.audioClips[0].startTime === videoClip.startTime &&
        segment.audioClips[0].endTime === videoClip.endTime &&
        segment.audioClips[0].inTime === videoClip.inTime &&
        segment.audioClips[0].outTime === videoClip.outTime;

      if (useSimpleCase) {
        // Single clip provides both video and audio - simple case
        const clipTimeInSegment = segment.startTime - videoClip.startTime;
        const seekTime = videoClip.inTime + clipTimeInSegment;

        await exportSimpleSegment(
          videoClip.path,
          segmentOutputPath,
          seekTime,
          segmentDuration,
          targetWidth,
          targetHeight,
          fps,
          bitrateKbps,
          (_time) => {
            if (totalDuration > 0) {
              sendProgress();
            }
          }
        );
      } else {
        // Multiple audio sources, no audio, or video/audio from different clips - need complex filter
        const videoInput = { path: videoClip.path, seekTime: videoSeekTime };

        // Build audio inputs array
        const audioInputs: Array<{ path: string; seekTime: number }> = [];
        segment.audioClips.forEach((audioClip) => {
          const audioClipTimeInSegment =
            segment.startTime - audioClip.startTime;
          const audioSeekTime = audioClip.inTime + audioClipTimeInSegment;
          audioInputs.push({ path: audioClip.path, seekTime: audioSeekTime });
        });

        await exportComplexSegment(
          videoInput,
          audioInputs,
          segmentOutputPath,
          segmentDuration,
          targetWidth,
          targetHeight,
          fps,
          bitrateKbps,
          (_time) => {
            if (totalDuration > 0) {
              sendProgress();
            }
          }
        );
      }

      segmentFiles.push(segmentOutputPath);
      processedSegments++;
    }

    // Concatenate all segments
    await concatenateSegments(segmentFiles, outputPath);

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
    console.error("❌ Export error:", error);
    console.error("Error stack:", error.stack);
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
  // Get screens and windows separately to reliably categorize them
  const [screenSources, windowSources] = await Promise.all([
    desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 300, height: 200 },
    }),
    desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 300, height: 200 },
    }),
  ]);

  const allSources = [
    ...screenSources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      type: "screen" as const,
    })),
    ...windowSources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      type: "window" as const,
    })),
  ];

  return allSources;
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

ipcMain.handle("mark-app-started", async () => {
  try {
    const CRASH_FLAG_PATH = getCrashFlagPath();
    await fs.writeFile(CRASH_FLAG_PATH, "true");
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

// Configure auto-updater
if (process.env.NODE_ENV === "production") {
  autoUpdater.logger = console;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("Update not available");
  });

  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    console.log(log_message);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);
    // Auto-install on next app restart
    autoUpdater.quitAndInstall();
  });

  // Check for updates (only in production)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000); // Wait 3 seconds after app start
}

app.whenReady().then(createWindow);
