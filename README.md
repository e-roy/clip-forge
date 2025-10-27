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

For Windows: NSIS installer (`.exe`)  
For macOS: DMG disk image  
For Linux: AppImage

## Running the Built App

### Windows

Install using the `ClipForge-Windows-0.1.0-Setup.exe` in `release/0.1.0/`

### macOS

Open the DMG and drag ClipForge to Applications.

### Linux

Make the AppImage executable and run:

```bash
chmod +x ClipForge-Linux-0.1.0.AppImage
./ClipForge-Linux-0.1.0.AppImage
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (no packaging)
- `npm run build:app` - Build and package the app for distribution
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint

## Usage

### Import Clips

1. Click **Import** in the Library sidebar
2. Or drag and drop video files (MP4, MOV, WebM)

### Edit on Timeline

1. Drag clips from Library to Timeline
2. Click ruler to move playhead
3. Use trim handles (left/right edges) to trim clips
4. Press **Space** to play/pause

### Export

1. Click **Export** button (enabled when timeline has clips)
2. Choose output location and filename
3. Select resolution (720p/1080p/Source), FPS, and bitrate
4. Click **Export** and wait for encoding

## MVP Features

- ✅ **Library** - Import and manage video clips
- ✅ **Timeline** - Single-track timeline with drag-and-drop
- ✅ **Preview** - Play clips with timeline scrubbing
- ✅ **Trim** - Trim clips with in/out handles
- ✅ **Export** - Export to MP4 with customizable settings (resolution, FPS, bitrate)

## MVP Checklist

- ✅ Launches
- ✅ Import clips
- ✅ Timeline display
- ✅ Preview with timeline sync
- ✅ Trim clips
- ✅ Export to MP4
- ✅ Packaged build

## Security

The app uses Electron's secure defaults:

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- Typed IPC bridge via preload script

No Node.js APIs are exposed to the renderer process.

## License

MIT
