# Phase 8 — Split at Playhead, Delete, Re-order & Snap

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
