/// <reference types="vite/client" />

// Global type declarations
declare global {
  interface Window {
    api: import("@types/ipc").ElectronAPI;
  }
}

// Path aliases type declarations
declare module "@/components/*" {}
declare module "@components/*" {}
declare module "@lib/*" {}
declare module "@types/*" {}

export {};
