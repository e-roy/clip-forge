# Phase 4 — Trim In/Out on a Single Clip

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
