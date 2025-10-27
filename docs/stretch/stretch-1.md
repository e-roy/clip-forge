# Stretch 1 — Text Overlays & Title Cards

> **Goal:** Add text overlays (titles/lower-thirds) with font, size, color, position, and simple fade-in/out. Overlays should preview in the app and render in exports via ffmpeg filter graph.
>
> **Tasks:**
>
> 1. Data model: add `overlayItems` to project state with `{ id, trackId, start, end, text, fontFamily, fontSize, colorHex, align: 'tl|tr|bl|br|center', x?, y?, fadeInMs, fadeOutMs, shadow?:boolean, bg?:{colorHex, alpha} }`.
> 2. Fonts: add a Fonts settings panel that lets the user choose system fonts (Windows/macOS) and optionally bundle a few open-source fonts. Store selected font file path in project preferences. Ensure the chosen fonts are packaged by electron-builder (`extraResources`).
> 3. UI: add an “Add Text” button. Use a shadcn Dialog to configure properties + live preview. Overlay track appears above main video track; items are draggable & resizable on the timeline.
> 4. Preview (renderer): draw overlay text in a separate absolutely-positioned layer atop the video preview. Sync visibility to playhead time; simulate fades with CSS opacity in preview for responsiveness.
> 5. Export (main): build ffmpeg filter graph using `drawtext`:
>
>    - Respect `start/end` time (enable/disable text via `enable='between(t, start, end)'`).
>    - Fade: approximate with `alpha` over time using `enable` condition or `expr` on `alpha`.
>    - Position: translate align presets to `(x,y)` expressions.
>    - If bg set, use `drawbox` behind text for readability.
>
> 6. IPC: `generateExportCommand(project)` composes the filter graph string. Update `exportVideo` to include overlay filters when present.
>
> **Acceptance Criteria:**
>
> - Can add/edit/remove text overlays; they show up during preview at correct times/positions.
> - Exported MP4 contains the text overlays with fades.
>
> **Run & Test:**
>
> - Add a lower-third 5s into a clip, set fade-in/out 300ms, export, verify timing/position.
