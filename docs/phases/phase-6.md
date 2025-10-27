# Phase 6 — Package the App (MVP Gate)

> **Goal:** Produce an installable build for your OS with electron-builder.
>
> **Tasks:**
>
> 1. Configure `electron-builder` in `package.json`:
>
>    - AppId `com.clipforge.editor`.
>    - Mac `dmg`, Win `nsis`, Linux `AppImage`.
>
> 2. Ensure static assets and ffmpeg binaries are included in `extraResources`.
> 3. Add a minimal `README` with setup and dev/run/build instructions.
>
> **Acceptance Criteria:**
>
> - `pnpm build:app` creates a distributable that launches and performs import → preview → trim → export.
>
> **Run & Test:**
>
> - Install locally from the generated artifact; import/trim/export once to verify.

> ✅ **MVP Checklist (should now pass):**
>
> - Launches ✅
> - Import ✅
> - Timeline display ✅
> - Preview ✅
> - Trim ✅
> - Export to MP4 ✅
> - Packaged build ✅
