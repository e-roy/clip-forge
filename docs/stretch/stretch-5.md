# Stretch 5 — Export Presets Manager

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
