import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "./types";

const electronAPI: ElectronAPI = {
  openFileDialog: (options?) => ipcRenderer.invoke("open-file-dialog", options),

  getMediaInfo: (paths: string[]) =>
    ipcRenderer.invoke("get-media-info", paths),

  exportVideo: (payload) => ipcRenderer.invoke("export-video", payload),

  onExportProgress: (callback) => {
    ipcRenderer.on("export-progress", (_event, progress) => callback(progress));
  },

  onExportDone: (callback) => {
    ipcRenderer.on("export-done", (_event, result) => callback(result));
  },

  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
};

contextBridge.exposeInMainWorld("api", electronAPI);
