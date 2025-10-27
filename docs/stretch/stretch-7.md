# Stretch 7 — Auto-Save, Project Files, and Asset Management

> **Goal:** Implement robust auto-save and project packaging.
>
> **Tasks:**
>
> 1. Project file format: `.cforge` JSON with relative asset references under a project root.
> 2. Auto-save: every 30s and on critical actions; recover on crash; manual Save/Save As.
> 3. “Collect Assets”: copy referenced media into `ProjectRoot/assets/…` and rewrite paths to be relative; progress UI.
> 4. “Save Archive (.cforge.zip)”: zip project + assets for sharing.
>
> **Acceptance Criteria:**
>
> - Kill app mid-edit; reopening offers recovery.
> - Collect Assets consolidates files; archive produces a shareable bundle.
>
> **Run & Test:**
>
> - Save, move project folder, reopen and verify assets still resolve.
