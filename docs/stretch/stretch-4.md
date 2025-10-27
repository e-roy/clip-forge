# Stretch 4 — Filters & Color Adjustments

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
