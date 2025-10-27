# Phase 5 — **Export MVP** (Single Clip or Simple Concatenation)

> **Goal:** Enable MP4 export using ffmpeg via main process; support (a) single selected item export and (b) concatenation of all items (without transitions/effects).
>
> **Tasks:**
>
> 1. Install and wire `fluent-ffmpeg` in main; set paths from `@ffmpeg-installer/ffmpeg`.
> 2. IPC: `exportVideo({ items, outputPath, resolution, fps, bitrateKbps })` returns job id; progress events via `export:progress` and completion via `export:done`.
> 3. Concatenation:
>
>    - Generate a temporary ffconcat file mapping each source + trim (`-ss/-to`) to produce a seamless output.
>    - Default H.264 + AAC, `-preset veryfast`, bitrate ~5000k for 1080p.
>
> 4. UI:
>
>    - Export dialog with Resolution: 720p/1080p/Source; FPS: 30; Bitrate (kbps) default.
>    - Progress modal with percentage and time remaining (estimate from ffmpeg progress).
>
> **Acceptance Criteria:**
>
> - Export a single item to MP4 successfully.
> - Export a multi-item timeline to MP4; file plays in external player.
> - Progress bar updates; dialog closes on success; error surfaced on failure.
>
> **Run & Test:**
>
> - Export 10–20s clip; confirm playable MP4 size reasonable.
