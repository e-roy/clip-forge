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

## Auto-Updates

ClipForge includes automatic update checking:

- App checks for updates on startup (after 3 seconds)
- Downloads updates in the background
- Prompts user to install when ready
- Updates are installed automatically on next restart

Update files are hosted on GitHub Releases.

## Running the Built App

### Windows

Install using the `ClipForge-Windows-0.1.0-Setup.exe` from releases.

### macOS

Open the DMG and drag ClipForge to Applications.

### Linux

Make the AppImage executable and run:

```bash
chmod +x ClipForge-Linux-0.1.0.AppImage
./ClipForge-Linux-0.1.0.AppImage
```

## Building for Distribution

### Prerequisites

- Node.js 20+ (LTS recommended)
- GitHub repository for releases

### Local Build

Build for your current platform:

```bash
npm run build:app
```

Build for all platforms (requires cross-platform setup):

```bash
npm run build:app -- --mac --linux --win
```

### GitHub Actions CI/CD

The included `.github/workflows/build-release.yml` automatically builds for:

- **Windows** (x64) - NSIS installer
- **macOS** (x64) - DMG disk image
- **Linux** (x64) - AppImage

**Setup:**

1. Push the workflow file to your GitHub repository
2. When ready to release: Update version in `package.json`
3. Create a new git tag: `git tag v0.1.1`
4. Push the tag: `git push origin v0.1.1`
5. Create a GitHub release with that tag
6. The workflow automatically builds and attaches installers to the release

**Important:** The workflow only runs on GitHub release creation, not on every push/merge to main.

**Repository Secrets:**

- `GITHUB_TOKEN` - Automatically provided
- `GITHUB_OWNER` - Your GitHub username (optional)
- `GITHUB_REPO` - Repository name (optional)

### Manual Release Process

1. Build locally or via GitHub Actions
2. Upload installers to GitHub Releases
3. Users download and install from releases
4. Future updates are delivered automatically via electron-updater

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

## Features

### Core Features

- ✅ **Library** - Import video clips via drag-and-drop or file picker
- ✅ **Timeline** - Multi-track timeline with drag-and-drop, trim, split, and delete
- ✅ **Preview** - Real-time video preview with timeline scrubbing and audio sync
- ✅ **Recording** - Screen recording and webcam capture
- ✅ **Export** - Export timeline to MP4 with customizable resolution, FPS, and bitrate
- ✅ **Multi-track Audio** - Mix audio from multiple tracks

### Timeline Features

- ✅ Drag clips from library to timeline
- ✅ Multiple video/audio tracks
- ✅ Trim clips with edge handles
- ✅ Split clips at playhead (S key)
- ✅ Delete clips (Delete key)
- ✅ Zoom in/out timeline
- ✅ Snap-to-grid functionality
- ✅ Track visibility and mute controls

### Preview Features

- ✅ Play/pause with Space key
- ✅ Scrubbing by clicking timeline ruler
- ✅ Audio sync with video
- ✅ Multi-track audio mixing
- ✅ Real-time preview updates

### Export Features

- ✅ MP4 export with H.264/AAC
- ✅ Resolution options (720p, 1080p, source)
- ✅ FPS and bitrate control
- ✅ Progress tracking
- ✅ Automatic duration calculation (no empty space)

## Architecture Overview

### Tech Stack

- **Frontend**: React 19 + TypeScript + TailwindCSS + shadcn/ui
- **Desktop**: Electron with secure IPC
- **State**: Zustand for client state management
- **Media**: FFmpeg (ffmpeg-static/ffprobe-static) for processing
- **Build**: Vite + electron-builder

### Core Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Electron      │    │   FFmpeg        │
│   (Renderer)    │◄──►│   Main Process  │◄──►│   Processing    │
│                 │    │                 │    │                 │
│ • Timeline UI   │    │ • File I/O      │    │ • Video encode  │
│ • Preview       │    │ • FFmpeg spawn  │    │ • Audio mix     │
│ • Library       │    │ • IPC handlers  │    │ • Export        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **Timeline**: Canvas-based with drag interactions
- **Preview**: HTML5 video with Web Audio API mixing
- **Library**: File import with thumbnail generation
- **Export**: Multi-segment FFmpeg composition

### Data Flow

1. **Import**: Files → FFprobe metadata → Store
2. **Timeline**: Store updates → UI rendering → Drag interactions
3. **Preview**: Timeline state → Video positioning → Audio mixing
4. **Export**: Timeline → Segment generation → FFmpeg composition

## Security

The app uses Electron's secure defaults:

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- Typed IPC bridge via preload script

No Node.js APIs are exposed to the renderer process.

## License

MIT
