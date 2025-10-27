# Stretch 9 — Cloud Upload (Drive/Dropbox) after Export

> **Goal:** Optional one-click upload to Google Drive or Dropbox after export.
>
> **Tasks:**
>
> 1. Settings: OAuth sign-in (open OAuth window in Electron, store tokens encrypted in keytar).
> 2. Post-export dialog: “Upload to …” toggle; show upload progress bar and copyable link after success.
> 3. Implement providers with small abstractions; retries & error reporting; do not block export completion UI.
> 4. Security: never store tokens in plain text; allow “Sign out”.
>
> **Acceptance Criteria:**
>
> - After export, choosing a provider uploads and returns a share URL.
>
> **Run & Test:**
>
> - Export a short clip; upload to a test folder; open the returned link.
