# Phase 9 — Two Tracks (Main + Overlay / PiP)

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
