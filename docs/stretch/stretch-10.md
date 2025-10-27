# Stretch 10 — Timeline Performance & Thumbnails on Track

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
