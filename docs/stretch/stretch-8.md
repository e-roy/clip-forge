# Stretch 8 — Undo/Redo (Command Stack)

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
