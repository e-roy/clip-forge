# Stretch 2 — Transitions (Crossfade & Dip to Black/White)

> **Goal:** Add drag-and-drop transitions between adjacent timeline items: Crossfade (default), Dip to Black, Dip to White. Duration adjustable.
>
> **Tasks:**
>
> 1. Data: add `transitions[]` with `{ id, aItemId, bItemId, type: 'crossfade'|'dip-black'|'dip-white', durationMs }`.
> 2. UI: when two items touch or overlap slightly, show a small connector pill; clicking opens a popover to set type & duration. Dragging pill length adjusts duration (snap to 0.25s).
> 3. Preview: for now, **approximate** crossfade in preview by swapping `<video>` sources around the transition window and overlaying a second muted `<video>` with CSS opacity ramp; dips use overlay layer with black/white div.
> 4. Export: generate ffmpeg filtergraphs:
>
>    - Crossfade: `xfade=transition=fade:duration=d:offset=t`
>    - Dips: split segments and apply `fade` in/out to black (or `format=yuva444p, color` layer + `overlay`).
>
> 5. Validation: prevent transitions longer than either clip’s trimmed length.
>
> **Acceptance Criteria:**
>
> - Can add/edit/remove transitions; preview shows an approximation; final export renders correct transitions.
>
> **Run & Test:**
>
> - Place two 5-10s clips, set 0.75s crossfade and 0.5s dip-to-black, export and verify.
