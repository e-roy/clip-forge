Awesome—let’s turn ClipForge into a series of Cursor-ready prompt blocks you can run one at a time. Each phase ends with “Run & Test” steps and clear acceptance criteria so you can verify progress before moving on. These are written for **Electron + React + TypeScript + Tailwind + shadcn/ui** with **Vite** and **electron-builder**, plus **FFmpeg (native binary via @ffmpeg-installer/ffmpeg + fluent-ffmpeg)**.

Copy a block into Cursor, let it complete, then follow the Run & Test at the end. If anything drifts, use the “Recovery” block at the bottom.

---

# Phase 0 — Project Bootstrap (Electron + React + TS + Tailwind + shadcn)

**Prompt (paste in Cursor):**

> **Goal:** Initialize an Electron desktop app scaffold with React + TypeScript, Vite, TailwindCSS, and shadcn/ui. Use secure Electron defaults (contextIsolation, sandbox, preload bridge) and electron-builder for packaging.
>
> **Tasks:**
>
> 1. Create a new project folder `clipforge`. Use Vite React + TS template for renderer.
> 2. Add Electron (main & preload) with secure config:
>
>    - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
>    - Preload exposes a typed `window.api` bridge (IPC) for: `openFileDialog`, `readFileMetadata`, `exportVideo` (stub), `getAppVersion`.
>
> 3. Tooling:
>
>    - Add `electron-builder` and scripts:
>
>      - `"dev": "concurrently \\"vite\\" \\"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\\""`.
>      - `"build:app": "vite build && electron-builder"`.
>      - `"typecheck": "tsc -p tsconfig.json --noEmit"`.
>
>    - Configure electron main to load `http://localhost:5173` in dev and `dist/index.html` in prod.
>
> 4. Tailwind & shadcn:
>
>    - Configure Tailwind (postcss, tailwind.config.cjs).
>    - Install shadcn/ui; set up components directory `src/components/ui` and add Button, Input, Dialog, Progress, ScrollArea, Tooltip, Toggle, Slider.
>
> 5. File structure:
>
>    ```
>    clipforge/
>      electron/
>        main.ts
>        preload.ts
>        types.d.ts
>      src/
>        app.tsx
>        main.tsx
>        components/
>        lib/
>        pages/
>        styles/
>      package.json
>      vite.config.ts
>      tsconfig.json
>      tailwind.config.ts
>      postcss.config.js
>      .eslintrc.cjs
>    ```
>
> 6. Add a minimal top-level UI:
>
>    - App shell with left sidebar (Library), center (Preview), bottom (Timeline), top bar (Project name + Export button disabled).
>    - Use shadcn Button for primary actions.
>
> 7. Add IPC stubs in preload + main for the three methods; implement `openFileDialog` to show native file picker (no business logic yet). Wire TypeScript types.
>
> **Acceptance Criteria:**
>
> - `pnpm dev` (or `npm run dev`) opens Electron window with the basic layout.
> - Tailwind styles & shadcn components render.
> - Clicking “Import” opens system file dialog (no further logic).
> - Security: `process`, `require` not available in renderer; `window.api` typed and functional.
>
> **Run & Test:**
>
> - Install deps then run dev: `pnpm i` → `pnpm dev`.
> - Verify window loads, UI visible, and Import shows OS picker.

---

# Phase 1 — Media Import (drag-drop + file picker) & Metadata

**Prompt:**

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

---

# Phase 2 — Video Preview Player

**Prompt:**

> **Goal:** Add a preview player that plays the currently selected clip.
>
> **Tasks:**
>
> 1. Use HTML5 `<video>` element in the center panel.
> 2. Controls: play/pause, current time, duration, scrub bar, volume, mute, and a “fit to window” toggle.
> 3. Selecting a clip in Library loads it into the player. Keep player stateless; selected clip id from global store.
> 4. Keyboard: Space toggles play/pause; `←/→` seek ±1s; `,/.` seek ±1 frame (approx 33ms for 30fps).
>
> **Acceptance Criteria:**
>
> - Selecting a clip shows it in Preview and can play/scrub.
> - Keyboard shortcuts work.
>
> **Run & Test:**
>
> - Import a file; select it; verify smooth playback.

---

# Phase 3 — Timeline Skeleton (Single Track)

**Prompt:**

> **Goal:** Create a simple timeline with a single track where you can drop Library clips to create a sequence.
>
> **Tasks:**
>
> 1. Data model:
>
>    - `Track` with ordered `TimelineItem{ id, clipId, startTime, endTime, offsetIn, offsetOut }`.
>    - Maintain `project.fps` (default 30), `duration`.
>
> 2. UI:
>
>    - Bottom panel shows ruler with time ticks, a playhead, and a scrollable track lane.
>    - Drag Library items into the track to append; each item shows its name & length.
>
> 3. Playhead:
>
>    - Clicking the ruler moves playhead; Space plays from playhead over composition (for now, preview only shows current item under playhead and time within it).
>
> **Acceptance Criteria:**
>
> - Drag to append clips; order is visible.
> - Playhead moves & shows active region.
>
> **Run & Test:**
>
> - Drop 2–3 clips; scrub the ruler; see which clip/time is active.

---

# Phase 4 — Trim In/Out on a Single Clip

**Prompt:**

> **Goal:** Basic trimming on timeline items (set in/out handles).
>
> **Tasks:**
>
> 1. Item component gets draggable left/right handles.
> 2. Dragging updates `offsetIn/offsetOut` (clamped to media duration).
> 3. Double-click item opens a small popover with numeric In/Out fields and a “Ripple” toggle (future).
> 4. Preview reflects trimmed ranges when scrubbing that item.
>
> **Acceptance Criteria:**
>
> - Drag handles to trim; UI updates; preview honors trims.
>
> **Run & Test:**
>
> - Trim a long clip to ~5s; scrub and verify.

---

# Phase 5 — **Export MVP** (Single Clip or Simple Concatenation)

**Prompt:**

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

---

# Phase 6 — Package the App (MVP Gate)

**Prompt:**

> **Goal:** Produce an installable build for your OS with electron-builder.
>
> **Tasks:**
>
> 1. Configure `electron-builder` in `package.json`:
>
>    - AppId `com.clipforge.editor`.
>    - Mac `dmg`, Win `nsis`, Linux `AppImage`.
>
> 2. Ensure static assets and ffmpeg binaries are included in `extraResources`.
> 3. Add a minimal `README` with setup and dev/run/build instructions.
>
> **Acceptance Criteria:**
>
> - `pnpm build:app` creates a distributable that launches and performs import → preview → trim → export.
>
> **Run & Test:**
>
> - Install locally from the generated artifact; import/trim/export once to verify.

> ✅ **MVP Checklist (should now pass):**
>
> - Launches ✅
> - Import ✅
> - Timeline display ✅
> - Preview ✅
> - Trim ✅
> - Export to MP4 ✅
> - Packaged build ✅

---

# Phase 7 — Screen & Webcam Recording (Electron)

**Prompt:**

> **Goal:** Add recording: screen, window, webcam, mic; save to Library and optionally auto-append to timeline.
>
> **Tasks:**
>
> 1. Screen capture:
>
>    - Use `desktopCapturer` to list screens/windows. Feed chosen `sourceId` to `navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId }}})`.
>
> 2. Webcam + mic:
>
>    - `getUserMedia({ video: true, audio: { echoCancellation: true }})`.
>
> 3. Simultaneous PiP:
>
>    - Record both streams separately; store as two files. For live PiP preview, overlay webcam `<video>` element in the Preview area.
>
> 4. Recording control:
>
>    - Use MediaRecorder in renderer to capture to webm, write chunks to a temp file via IPC streaming.
>
> 5. On stop: move files into project’s `media/recordings` folder, probe metadata, generate thumbnail, add to Library.
>
> **Acceptance Criteria:**
>
> - Record 10–30s screen; appears in Library with metadata & thumb.
> - Optional webcam simultaneously; two files produced.
> - Drop recording onto timeline and export.
>
> **Run & Test:**
>
> - Try screen-only and screen+webcam; check A/V sync in exports.

---

# Phase 8 — Split at Playhead, Delete, Re-order & Snap

**Prompt:**

> **Goal:** Make the timeline usable for editing sequences.
>
> **Tasks:**
>
> 1. Split: with item selected, `S` splits at playhead into two items with adjusted offsets.
> 2. Delete: `Del/Backspace` removes selected item; ripple shift (toggle) to close gap.
> 3. Drag re-order within track with magnetic snap:
>
>    - Snap to grid (config 0.25s) and neighboring edges.
>
> 4. Zoom controls: `Ctrl/Cmd +` / `Ctrl/Cmd -` to scale time axis.
>
> **Acceptance Criteria:**
>
> - Split works, items remain contiguous when ripple on.
> - Reordering snaps properly.
>
> **Run & Test:**
>
> - Build a 3-clip sequence, split middle, remove a fragment, re-order, export.

---

# Phase 9 — Two Tracks (Main + Overlay / PiP)

**Prompt:**

> **Goal:** Add a second track for overlays (e.g., webcam).
>
> **Tasks:**
>
> 1. Timeline supports multiple tracks; items carry `trackId`.
> 2. Preview compositor (for now on playback only): If overlay overlaps main, draw main video and then overlay video in a corner (position + scale controls per item).
> 3. Export: use ffmpeg filter graph to overlay the second video when overlap occurs (PiP). Basic position presets (top-right).
>
> **Acceptance Criteria:**
>
> - Overlay track visible in UI; items can be dragged onto it.
> - Export with PiP overlay renders as expected.
>
> **Run & Test:**
>
> - Place webcam clip over screen clip for 5–10s; export and verify.

---

# Phase 10 — Export Options & Progress Polish

**Prompt:**

> **Goal:** Add export presets, source resolution detection, and robust progress.
>
> **Tasks:**
>
> 1. Presets: YouTube 1080p, 720p, Source; expose resolution, bitrate, fps.
> 2. Progress: parse ffmpeg’s `time=` to compute percentage vs total timeline duration; show ETA.
> 3. Allow choosing output folder; remember last used folder.
>
> **Acceptance Criteria:**
>
> - Preset selection affects file size/quality.
> - Progress bar updates smoothly and estimates time.
>
> **Run & Test:**
>
> - Export same timeline in 720p vs 1080p; compare sizes.

---

# Phase 11 — Quality of Life: Auto-save, Undo/Redo, Shortcuts

**Prompt:**

> **Goal:** Improve reliability and speed.
>
> **Tasks:**
>
> 1. Auto-save project JSON every 30s and on significant actions into `~/ClipForge/Projects/<slug>.cforge`.
> 2. Implement undo/redo stack for timeline ops (append, trim, split, move, delete).
> 3. Shortcut cheatsheet modal (F1) listing keys.
>
> **Acceptance Criteria:**
>
> - Kill the app mid-edit; on reopen, restore project.
> - Undo/redo works across trims and splits.
>
> **Run & Test:**
>
> - Make edits; restart; confirm state restored.

---

# Phase 12 — Final Packaging, README, and Smoke Demo

**Prompt:**

> **Goal:** Finalize distribution and documentation.
>
> **Tasks:**
>
> 1. Produce signed build for your OS (if certs available). Otherwise unsigned local installer.
> 2. Create `README.md` with:
>
>    - **Overview**, **Tech stack**, **Setup**, **Development**, **Packaging**, **Known issues**, **Keyboard shortcuts**, **MVP demo steps**.
>
> 3. Add a script `pnpm demo-seed` to copy 2–3 sample media files into a `samples/` folder (or prompts user to provide).
> 4. Smoke test: follow MVP Testing Scenarios list and note pass/fail.
>
> **Acceptance Criteria:**
>
> - Clean installer launches the app and passes the smoke script.
>
> **Run & Test:**
>
> - Install, import, arrange, trim, export; record a short screen capture; export with PiP.

---

## Global Implementation Rules (include in the first prompt or keep in a `CONTRIBUTING.md`)

- **Security:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, validated IPC channels; never expose `fs` directly to renderer.
- **Type safety:** Strict TS, shared types in `electron/types.d.ts`.
- **State:** Use Zustand with slices: `clips`, `timeline`, `ui`, `export`.
- **Paths:** Use `app.getPath('userData')/ClipForge` for temp, thumbs, projects; clean up temp on exit.
- **Errors:** All IPC calls must return `{ ok: boolean, data?: T, error?: string }`.
- **Performance:** Debounce metadata/thumbnails; virtualize lists; offload heavy ffmpeg to child process (main).
- **Testing:** After each phase run `pnpm typecheck` and try a manual action.

---

## Quick Commands

- Dev: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Lint (if configured): `pnpm lint`
- Package app: `pnpm build:app`

---

## Recovery / Resync Prompt (use if things drift)

> **Goal:** Normalize the project to the specified architecture and fix drift.
>
> **Actions:**
>
> 1. Audit files vs the Phase checklists. Produce a diff plan to:
>
>    - Ensure Electron security flags.
>    - Ensure preload API matches: `openFileDialog`, `getMediaInfo`, `exportVideo`, `getAppVersion`.
>    - Ensure ffmpeg/ffprobe paths are set from `@ffmpeg-installer/ffmpeg`.
>    - Ensure scripts: `dev`, `build:app`, `typecheck`.
>
> 2. Validate TypeScript configs and strictness; fix any `any`.
> 3. Verify Tailwind + shadcn setup and rebuild UI shell if broken.
> 4. Run a dry export with a single clip; print ffmpeg command and progress logging.
> 5. Output a concise list of changes made and next recommended phase.

---

## Optional Stretch Prompts (after Phase 12)

- **Text Overlays & Titles** (ffmpeg drawtext / HTML canvas compositor → render)
- **Transitions** (crossfade via filter graph; UI handles between items)
- **Audio tools** (gain, fade in/out)
- **Preset Manager** (user presets for export)
- **Telemetry** (basic in-app metrics; opt-in)

---

If you want, I can tailor these prompts to **pnpm** specifically (scripts & lockfile), or swap in **Tauri (Rust)** later. Want me to generate the exact **package.json scripts**, **electron main/preload stubs**, and the **initial React layout** code for Phase 0 so you can run immediately?
