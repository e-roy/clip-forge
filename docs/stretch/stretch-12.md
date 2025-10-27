# Stretch 12 — Render Queue & Background Rendering

> **Goal:** Allow multiple export jobs queued with background rendering and notifications on completion.
>
> **Tasks:**
>
> 1. Job model: `{ id, projectPath, presetId, outputPath, status: 'queued|running|done|error', progress }`.
> 2. UI: “Render Queue” panel with re-order, pause/resume, cancel; persist queue state.
> 3. Worker: spawn child processes to run ffmpeg; limit concurrency to 1 (or configurable).
> 4. Notifications: system notifications when complete; Reveal File button.
>
> **Acceptance Criteria:**
>
> - Multiple exports can be queued; progress survives UI refresh; cancelling stops ffmpeg.
>
> **Run & Test:**
>
> - Queue 2-3 jobs; cancel one; verify outputs and notifications.
