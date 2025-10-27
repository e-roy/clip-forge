# Phase 11 — Quality of Life: Auto-save, Undo/Redo, Shortcuts

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
