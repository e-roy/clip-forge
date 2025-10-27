# Phase 10 — Export Options & Progress Polish

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
