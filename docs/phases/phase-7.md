# Phase 7 — Screen & Webcam Recording (Electron)

> **Goal:** Add recording: screen, window, webcam, mic; save to Library and optionally auto-append to timeline.
>
> **Tasks:**
>
> 1. Screen capture:
>
>    - Use `desktopCapturer` to list screens/windows. Feed chosen `sourceId` to `navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId }}})`.
>
> 2. Webcam + mic:
>
>    - `getUserMedia({ video: true, audio: { echoCancellation: true }})`.
>
> 3. Simultaneous PiP:
>
>    - Record both streams separately; store as two files. For live PiP preview, overlay webcam `<video>` element in the Preview area.
>
> 4. Recording control:
>
>    - Use MediaRecorder in renderer to capture to webm, write chunks to a temp file via IPC streaming.
>
> 5. On stop: move files into project’s `media/recordings` folder, probe metadata, generate thumbnail, add to Library.
>
> **Acceptance Criteria:**
>
> - Record 10–30s screen; appears in Library with metadata & thumb.
> - Optional webcam simultaneously; two files produced.
> - Drop recording onto timeline and export.
>
> **Run & Test:**
>
> - Try screen-only and screen+webcam; check A/V sync in exports.
