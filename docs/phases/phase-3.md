# Phase 3 — Timeline Skeleton (Single Track)

> **Goal:** Create a simple timeline with a single track where you can drop Library clips to create a sequence.
>
> **Tasks:**
>
> 1. Data model:
>
>    - `Track` with ordered `TimelineItem{ id, clipId, startTime, endTime, offsetIn, offsetOut }`.
>    - Maintain `project.fps` (default 30), `duration`.
>
> 2. UI:
>
>    - Bottom panel shows ruler with time ticks, a playhead, and a scrollable track lane.
>    - Drag Library items into the track to append; each item shows its name & length.
>
> 3. Playhead:
>
>    - Clicking the ruler moves playhead; Space plays from playhead over composition (for now, preview only shows current item under playhead and time within it).
>
> **Acceptance Criteria:**
>
> - Drag to append clips; order is visible.
> - Playhead moves & shows active region.
>
> **Run & Test:**
>
> - Drop 2–3 clips; scrub the ruler; see which clip/time is active.
