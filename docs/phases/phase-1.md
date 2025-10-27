# Phase 1 — Media Import (drag-drop + file picker) & Metadata

> **Goal:** Enable importing MP4/MOV/WebM via file picker and drag-drop. Show a Library list with thumbnails and basic metadata (duration, resolution, size).
>
> **Tasks:**
>
> 1. Add `accept: ['.mp4', '.mov', '.webm']` to import dialog and a drag-drop region over Library.
> 2. On import, compute and store metadata:
>
>    - Use `ffprobe` via fluent-ffmpeg in **main** (prepare for later export): install `fluent-ffmpeg` and `@ffmpeg-installer/ffmpeg`, wire `ffmpeg.setFfmpegPath` & `ffmpeg.setFfprobePath`.
>    - Preload exposes `getMediaInfo(filePaths: string[]): Promise<ClipMeta[]>`.
>
> 3. Generate thumbnails:
>
>    - Extract a single frame at 1s (or middle if <2s) using ffmpeg in main to a temp folder; return thumbnail path to renderer.
>
> 4. Library UI:
>
>    - Virtualized list/grid with thumbnail, filename, duration, resolution, file size.
>    - Persist an in-memory `clips` store (Zustand or Redux Toolkit). Use a `ClipId` (uuid).
>
> **Acceptance Criteria:**
>
> - Drag-drop or pick 1–3 files.
> - Library shows a thumbnail and metadata within 2–3 seconds per clip.
> - No renderer blocking; IPC round trips complete; type-safe responses.
>
> **Run & Test:**
>
> - Import multiple formats and verify the list & thumbs.
> - Restart the app (dev) and confirm state resets (persistence will come later).
