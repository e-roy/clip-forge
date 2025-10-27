/// <reference types="vite-plugin-electron/electron-env" />

import type { ElectronAPI } from "./types";

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string;
    VITE_PUBLIC: string;
  }
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
