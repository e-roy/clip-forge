# Stretch 11 — Proxy Media (Optimized Editing Copies)

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
