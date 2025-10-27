graph TB

subgraph Renderer["Renderer (React + TypeScript + Tailwind + shadcn)"]
APP["App Shell"]
LIB["Media Library"]
TL["Timeline & Tracks"]
PV["Preview Player"]
REC["Recorder (MediaRecorder)"]
WA["WebAudio (Preview Gain/Fades)"]
STATE["Zustand Store"]
UIKIT["UI Components"]
APP --> STATE
LIB --> STATE
TL --> STATE
PV --> STATE
REC --> STATE
WA --> STATE
end

subgraph Preload["Preload (contextBridge)"]
API["window.api (typed IPC bridge)"]
end

subgraph Main["Electron Main Process"]
MAIN["Main.ts (Lifecycle, BrowserWindow)"]
IPCR["IPC Router"]
EXP["Export Manager"]
META["Metadata & Thumbnails"]
QUEUE["Render Queue"]
FS["File System Access"]
FF["FFmpeg / FFprobe (fluent-ffmpeg)"]
end

subgraph Data["App Data (userData)"]
PROJ["Projects (.cforge)"]
THUMBS["Thumbnails / Sprites"]
TEMP["Temp / Staging"]
PROXY["Proxy Media"]
PRESETS["Export Presets JSON"]
TOKENS["Secure Tokens (keytar)"]
end

subgraph OS["Host OS"]
FILES["Local Filesystem"]
CAM["Camera / Microphone"]
DESK["Desktop / Window Sources"]
NOTIF["System Notifications"]
end

APP -->|IPC calls| API
API --> IPCR
IPCR --> MAIN

LIB -->|Select files| API
API -->|Open dialog| IPCR
IPCR --> FS
FS --> FILES
IPCR --> META
META --> FF
META --> THUMBS
META --> API
API --> LIB

PV --> STATE
WA -. preview mix .- PV

REC -->|getUserMedia| CAM
REC -->|desktopCapturer| DESK
REC -->|record chunks via IPC| API
API --> IPCR
IPCR --> FS
FS --> TEMP
TEMP --> META
META --> API
API --> LIB

TL -->|Build sequence| STATE
APP -->|Export request| API
API --> IPCR
IPCR --> EXP
EXP --> FF
EXP --> FS
EXP --> TEMP
EXP --> QUEUE
EXP --> IPCR
IPCR --> API
API --> APP

IPCR --> PROJ
IPCR --> THUMBS
IPCR --> PROXY
IPCR --> PRESETS
IPCR --> TOKENS

FS --> FILES
QUEUE --> NOTIF
