# ClipForge

A desktop video editor built with Electron, React, TypeScript, and TailwindCSS. Import clips, arrange them on a timeline, preview, and export MP4 files.

## Tech Stack

- **Electron** - Desktop app framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite 7** - Build tool and dev server
- **TailwindCSS 4** - Styling
- **shadcn/ui** - UI component library
- **Zustand** - State management
- **electron-builder** - App packaging

## Project Structure

```
clip-forge/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry point
│   ├── preload.ts        # Preload bridge for secure IPC
│   └── types.d.ts         # Shared IPC type definitions
├── src/
│   ├── app.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   ├── components/
│   │   └── ui/          # shadcn/ui components
│   ├── types/            # TypeScript type definitions
│   └── lib/              # Utility functions
├── package.json
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # TailwindCSS configuration
└── electron-builder.json5 # Electron builder config
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

This will:

- Start the Vite dev server on `http://localhost:5173`
- Launch the Electron window
- Enable hot module replacement for React

### Building

Type checking:

```bash
npm run typecheck
```

Build for production:

```bash
npm run build
```

Build the distributable app:

```bash
npm run build:app
```

The built application will be in the `release/` directory.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (no packaging)
- `npm run build:app` - Build and package the app
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint

## Features (Phase 0 - Current)

- ✅ Electron app with secure configuration
- ✅ React + TypeScript setup
- ✅ TailwindCSS 4 styling with shadcn/ui components
- ✅ App shell with Library sidebar, Preview area, and Timeline
- ✅ Typed IPC bridge for Electron communication
- ✅ File dialog integration
- ✅ Path aliases configured (`@/`, `@components/`, `@lib/`, `@types/`)

## Security

The app uses Electron's secure defaults:

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- Typed IPC bridge via preload script

No Node.js APIs are exposed to the renderer process.

## License

MIT
