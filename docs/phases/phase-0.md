# Phase 0 — Project Bootstrap (Electron + React + TS + Tailwind + shadcn)

> **Goal:** Initialize an Electron desktop app scaffold with React + TypeScript, Vite, TailwindCSS, and shadcn/ui. Use secure Electron defaults (contextIsolation, sandbox, preload bridge) and electron-builder for packaging.
>
> **Tasks:**
>
> 1. Create a new project folder `clipforge`. Use Vite React + TS template for renderer.
> 2. Add Electron (main & preload) with secure config:
>
>    - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
>    - Preload exposes a typed `window.api` bridge (IPC) for: `openFileDialog`, `readFileMetadata`, `exportVideo` (stub), `getAppVersion`.
>
> 3. Tooling:
>
>    - Add `electron-builder` and scripts:
>
>      - `"dev": "concurrently \\"vite\\" \\"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\\""`.
>      - `"build:app": "vite build && electron-builder"`.
>      - `"typecheck": "tsc -p tsconfig.json --noEmit"`.
>
>    - Configure electron main to load `http://localhost:5173` in dev and `dist/index.html` in prod.
>
> 4. Tailwind & shadcn:
>
>    - Configure Tailwind (postcss, tailwind.config.cjs).
>    - Install shadcn/ui; set up components directory `src/components/ui` and add Button, Input, Dialog, Progress, ScrollArea, Tooltip, Toggle, Slider.
>
> 5. File structure:
>
>    ```
>    clipforge/
>      electron/
>        main.ts
>        preload.ts
>        types.d.ts
>      src/
>        app.tsx
>        main.tsx
>        components/
>        lib/
>        pages/
>        styles/
>      package.json
>      vite.config.ts
>      tsconfig.json
>      tailwind.config.ts
>      postcss.config.js
>      .eslintrc.cjs
>    ```
>
> 6. Add a minimal top-level UI:
>
>    - App shell with left sidebar (Library), center (Preview), bottom (Timeline), top bar (Project name + Export button disabled).
>    - Use shadcn Button for primary actions.
>
> 7. Add IPC stubs in preload + main for the three methods; implement `openFileDialog` to show native file picker (no business logic yet). Wire TypeScript types.
>
> **Acceptance Criteria:**
>
> - Tailwind styles & shadcn components render.
> - Clicking “Import” opens system file dialog (no further logic).
> - Security: `process`, `require` not available in renderer; `window.api` typed and functional.
