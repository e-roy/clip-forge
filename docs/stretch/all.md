Perfect—here are Cursor-ready **stretch-goal prompt blocks** tailored for your stack (**Electron + React + TS + Tailwind + shadcn/ui**, **FFmpeg via fluent-ffmpeg**, **npm**). Each block is self-contained with **Goal**, **Tasks**, **Acceptance Criteria**, and **Run & Test** steps. Paste one block at a time into Cursor and let the agent implement it.

---

# Stretch 1 — Text Overlays & Title Cards

**Prompt:**

> **Goal:** Add text overlays (titles/lower-thirds) with font, size, color, position, and simple fade-in/out. Overlays should preview in the app and render in exports via ffmpeg filter graph.
>
> **Tasks:**
>
> 1. Data model: add `overlayItems` to project state with `{ id, trackId, start, end, text, fontFamily, fontSize, colorHex, align: 'tl|tr|bl|br|center', x?, y?, fadeInMs, fadeOutMs, shadow?:boolean, bg?:{colorHex, alpha} }`.
> 2. Fonts: add a Fonts settings panel that lets the user choose system fonts (Windows/macOS) and optionally bundle a few open-source fonts. Store selected font file path in project preferences. Ensure the chosen fonts are packaged by electron-builder (`extraResources`).
> 3. UI: add an “Add Text” button. Use a shadcn Dialog to configure properties + live preview. Overlay track appears above main video track; items are draggable & resizable on the timeline.
> 4. Preview (renderer): draw overlay text in a separate absolutely-positioned layer atop the <video> preview. Sync visibility to playhead time; simulate fades with CSS opacity in preview for responsiveness.
> 5. Export (main): build ffmpeg filter graph using `drawtext`:
>
>    - Respect `start/end` time (enable/disable text via `enable='between(t, start, end)'`).
>    - Fade: approximate with `alpha` over time using `enable` condition or `expr` on `alpha`.
>    - Position: translate align presets to `(x,y)` expressions.
>    - If bg set, use `drawbox` behind text for readability.
>
> 6. IPC: `generateExportCommand(project)` composes the filter graph string. Update `exportVideo` to include overlay filters when present.
>
> **Acceptance Criteria:**
>
> - Can add/edit/remove text overlays; they show up during preview at correct times/positions.
> - Exported MP4 contains the text overlays with fades.
>
> **Run & Test:**
>
> - Add a lower-third 5s into a clip, set fade-in/out 300ms, export, verify timing/position.

---

# Stretch 2 — Transitions (Crossfade & Dip to Black/White)

**Prompt:**

> **Goal:** Add drag-and-drop transitions between adjacent timeline items: Crossfade (default), Dip to Black, Dip to White. Duration adjustable.
>
> **Tasks:**
>
> 1. Data: add `transitions[]` with `{ id, aItemId, bItemId, type: 'crossfade'|'dip-black'|'dip-white', durationMs }`.
> 2. UI: when two items touch or overlap slightly, show a small connector pill; clicking opens a popover to set type & duration. Dragging pill length adjusts duration (snap to 0.25s).
> 3. Preview: for now, **approximate** crossfade in preview by swapping `<video>` sources around the transition window and overlaying a second muted `<video>` with CSS opacity ramp; dips use overlay layer with black/white div.
> 4. Export: generate ffmpeg filtergraphs:
>
>    - Crossfade: `xfade=transition=fade:duration=d:offset=t`
>    - Dips: split segments and apply `fade` in/out to black (or `format=yuva444p, color` layer + `overlay`).
>
> 5. Validation: prevent transitions longer than either clip’s trimmed length.
>
> **Acceptance Criteria:**
>
> - Can add/edit/remove transitions; preview shows an approximation; final export renders correct transitions.
>
> **Run & Test:**
>
> - Place two 5-10s clips, set 0.75s crossfade and 0.5s dip-to-black, export and verify.

---

# Stretch 3 — Audio Controls (Gain, Mute, Fade, Detach Audio)

**Prompt:**

> **Goal:** Add per-item audio controls (gain dB/%, mute), fade-in/out, and “Detach Audio” to an audio-only track.
>
> **Tasks:**
>
> 1. UI: item inspector with Audio panel: Gain slider (-30dB..+12dB), Mute toggle, Fade In/Out (ms). Add context menu “Detach Audio” to create a new audio item aligned under the video on an audio track.
> 2. Data: store `{ gainDb, mute, fadeInMs, fadeOutMs, detached: boolean }` on items.
> 3. Preview: use WebAudio API in renderer to control volume envelope on playback; fades via GainNode ramps; keep it lightweight.
> 4. Export: ffmpeg filter:
>
>    - Gain: `volume=dB` or linear factor.
>    - Fades: `afade=t=in:st=...:d=...` and `afade=t=out:st=...:d=...`.
>    - Detach: map audio stream from source; if multiple, mix with `amix=inputs=n:normalize=0`.
>
> 5. Waveform (optional): generate a low-res PCM thumbnail for the item (ffmpeg to wav → downsample → draw simple canvas waveform for the track).
>
> **Acceptance Criteria:**
>
> - Adjusting gain/mute/fades affects preview and final export.
> - Detach audio creates a separate item; export mixes correctly.
>
> **Run & Test:**
>
> - Create a sequence with different volumes and short fades; export and listen for expected changes.

---

# Stretch 4 — Filters & Color Adjustments

**Prompt:**

> **Goal:** Add basic visual filters: brightness, contrast, saturation, gamma, and a LUT (.cube) loader.
>
> **Tasks:**
>
> 1. Data/UI: per-item “Color” tab with sliders (-1..+1 or 0..2 ranges) and a LUT file picker; allow reset to defaults.
> 2. Preview: approximate adjustments via CSS filters for responsiveness (brightness/contrast/saturate); show a “Preview approximation” note if LUT is applied.
> 3. Export: translate to ffmpeg:
>
>    - `eq=brightness=...:contrast=...:saturation=...:gamma=...`
>    - LUT: `lut3d=file='path/to.cube'`
>
> 4. Packaging: include LUT files in project folder; ensure safe paths & escaping.
>
> **Acceptance Criteria:**
>
> - Changes visible in preview; exported file reflects full FFmpeg grade including LUTs.
>
> **Run & Test:**
>
> - Apply a LUT plus modest contrast/brightness; export and verify.

---

# Stretch 5 — Export Presets Manager

**Prompt:**

> **Goal:** Create a Presets manager for export settings (resolution, fps, bitrate, codec, container).
>
> **Tasks:**
>
> 1. Preset entity: `{ id, name, resolution: 'source|720p|1080p|custom', width?, height?, fps, videoCodec: 'h264|hevc|vp9|av1', audioCodec: 'aac|opus', bitrateKbps }`.
> 2. UI: Preset dropdown in Export dialog + “Manage Presets” button (shadcn Dialog) with CRUD and “Set Default”.
> 3. Storage: persist presets to userData JSON; ship 3 defaults (Source, YouTube 1080p, 720p Light).
> 4. Export: preset selection populates export options & ffmpeg args. Warn if codec not supported on platform.
>
> **Acceptance Criteria:**
>
> - Can add/edit/delete presets and set default; export uses chosen preset.
>
> **Run & Test:**
>
> - Create a custom 1440p@30 preset; export and verify resolution/bitrate.

---

# Stretch 6 — Keyboard Shortcuts & Command Palette

**Prompt:**

> **Goal:** Add global shortcuts and a command palette for discoverability.
>
> **Tasks:**
>
> 1. Shortcuts: Space (play/pause), J/K/L (reverse/pause/forward), I/O (mark in/out on selected item), S (split), Del (delete), Ctrl/Cmd+Z / Shift+Z (undo/redo), Ctrl/Cmd +/- (zoom).
> 2. Command Palette: open with Ctrl/Cmd+K; searchable list of commands with shortcuts shown; executing triggers the same actions.
> 3. Help: F1 opens a cheatsheet modal.
>
> **Acceptance Criteria:**
>
> - Shortcuts work app-wide; palette runs commands; conflicts handled on Windows/macOS.
>
> **Run & Test:**
>
> - Use only keyboard to build a short sequence and export.

---

# Stretch 7 — Auto-Save, Project Files, and Asset Management

**Prompt:**

> **Goal:** Implement robust auto-save and project packaging.
>
> **Tasks:**
>
> 1. Project file format: `.cforge` JSON with relative asset references under a project root.
> 2. Auto-save: every 30s and on critical actions; recover on crash; manual Save/Save As.
> 3. “Collect Assets”: copy referenced media into `ProjectRoot/assets/…` and rewrite paths to be relative; progress UI.
> 4. “Save Archive (.cforge.zip)”: zip project + assets for sharing.
>
> **Acceptance Criteria:**
>
> - Kill app mid-edit; reopening offers recovery.
> - Collect Assets consolidates files; archive produces a shareable bundle.
>
> **Run & Test:**
>
> - Save, move project folder, reopen and verify assets still resolve.

---

# Stretch 8 — Undo/Redo (Command Stack)

**Prompt:**

> **Goal:** Add a generic command framework to support undo/redo across timeline and overlay operations.
>
> **Tasks:**
>
> 1. Implement `Command` interface `{ do(): void; undo(): void; label: string }` and a `CommandManager` with stacks and max depth (e.g., 100).
> 2. Wrap actions: add/remove/move items; trim; split; transition CRUD; overlay CRUD; preset CRUD.
> 3. UI: show last action in status bar; enable/disable Undo/Redo in menus and shortcuts.
> 4. Persist the stacks only in memory (not saved) to avoid complexity; clear on project load.
>
> **Acceptance Criteria:**
>
> - Undo/redo works for all key actions with correct state restoration.
>
> **Run & Test:**
>
> - Perform a complex sequence of edits; undo back to start; redo to end without divergence.

---

# Stretch 9 — Cloud Upload (Drive/Dropbox) after Export

**Prompt:**

> **Goal:** Optional one-click upload to Google Drive or Dropbox after export.
>
> **Tasks:**
>
> 1. Settings: OAuth sign-in (open OAuth window in Electron, store tokens encrypted in keytar).
> 2. Post-export dialog: “Upload to …” toggle; show upload progress bar and copyable link after success.
> 3. Implement providers with small abstractions; retries & error reporting; do not block export completion UI.
> 4. Security: never store tokens in plain text; allow “Sign out”.
>
> **Acceptance Criteria:**
>
> - After export, choosing a provider uploads and returns a share URL.
>
> **Run & Test:**
>
> - Export a short clip; upload to a test folder; open the returned link.

---

# Stretch 10 — Timeline Performance & Thumbnails on Track

**Prompt:**

> **Goal:** Improve timeline performance for 10–50 clips; show mini-thumbnails along timeline items.
>
> **Tasks:**
>
> 1. Virtualize timeline item rendering (e.g., react-virtualized windowing for rows & horizontal sections).
> 2. Generate sparse sprite thumbnails per media (e.g., 1 frame every N seconds); pack into a sprite sheet; cache to disk.
> 3. Draw thumbnails onto item background using CSS sprites or Canvas; respect trims.
> 4. Smooth scrolling & zoom to keep 60fps in timeline.
>
> **Acceptance Criteria:**
>
> - With 30 items totaling 5+ minutes, scrolling/zooming remains smooth; thumbnails align with content.
>
> **Run & Test:**
>
> - Load a long sequence; zoom and pan; verify performance and sprite accuracy.

---

# Stretch 11 — Proxy Media (Optimized Editing Copies)

**Prompt:**

> **Goal:** Generate lower-res proxy files for heavy sources to keep preview smooth; swap to originals for export.
>
> **Tasks:**
>
> 1. Preference toggle “Use Proxies when available” and “Auto-generate proxies > 1080p or bitrate > X”.
> 2. Generate proxies on import (background queue) using ffmpeg (H.264 720p, moderate bitrate).
> 3. Store a map `{ sourcePath → proxyPath }`; renderer uses proxy for preview when enabled; exporter always resolves to source.
> 4. Show proxy badge on Library items; allow “Regenerate proxy” and “Reveal in Finder/Explorer”.
>
> **Acceptance Criteria:**
>
> - High-res sources preview smoothly with proxies; export always uses originals.
>
> **Run & Test:**
>
> - Import a 4K clip; confirm proxy generation, preview with proxy, accurate export.

---

# Stretch 12 — Render Queue & Background Rendering

**Prompt:**

> **Goal:** Allow multiple export jobs queued with background rendering and notifications on completion.
>
> **Tasks:**
>
> 1. Job model: `{ id, projectPath, presetId, outputPath, status: 'queued|running|done|error', progress }`.
> 2. UI: “Render Queue” panel with re-order, pause/resume, cancel; persist queue state.
> 3. Worker: spawn child processes to run ffmpeg; limit concurrency to 1 (or configurable).
> 4. Notifications: system notifications when complete; Reveal File button.
>
> **Acceptance Criteria:**
>
> - Multiple exports can be queued; progress survives UI refresh; cancelling stops ffmpeg.
>
> **Run & Test:**
>
> - Queue 2-3 jobs; cancel one; verify outputs and notifications.

---

## Notes for npm usage

- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Package: `npm run build:app`
- If any block adds deps, ensure: `npm i <pkg>` (the agent should add scripts when needed).

---

Want me to bundle these into a single **StretchGoals.md** you can drop into the repo—and add a “Stretch Goals” section to your README linking to them? I can also generate **ffmpeg filtergraph examples** for transitions/overlays to accelerate implementation.
