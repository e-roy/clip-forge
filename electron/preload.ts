import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "./types";

const electronAPI: ElectronAPI = {
  openFileDialog: (options?) => ipcRenderer.invoke("open-file-dialog", options),

  saveFileDialog: (options?) => ipcRenderer.invoke("save-file-dialog", options),

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

  getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),

  writeRecordingFile: (data, filename) =>
    ipcRenderer.invoke("write-recording-file", data, filename),

  saveProject: (projectData) => ipcRenderer.invoke("save-project", projectData),

  loadProject: (projectPath) => ipcRenderer.invoke("load-project", projectPath),

  getAutosavePath: () => ipcRenderer.invoke("get-autosave-path"),

  listProjects: () => ipcRenderer.invoke("list-projects"),

  deleteAutosave: () => ipcRenderer.invoke("delete-autosave"),

  // New handlers for Stretch 7
  saveProjectAs: (projectData, filePath) =>
    ipcRenderer.invoke("save-project-as", projectData, filePath),

  openProjectDialog: () => ipcRenderer.invoke("open-project-dialog"),

  collectAssets: (projectPath, clipPaths) =>
    ipcRenderer.invoke("collect-assets", projectPath, clipPaths),

  createArchive: (projectPath, outputPath) =>
    ipcRenderer.invoke("create-archive", projectPath, outputPath),

  checkCrashRecovery: () => ipcRenderer.invoke("check-crash-recovery"),

  clearCrashFlag: () => ipcRenderer.invoke("clear-crash-flag"),

  // Menu event listeners
  onTriggerNewProject: (callback) => {
    ipcRenderer.removeAllListeners("trigger-new-project");
    ipcRenderer.on("trigger-new-project", () => callback());
  },
  onTriggerOpenProject: (callback) => {
    ipcRenderer.removeAllListeners("trigger-open-project");
    ipcRenderer.on("trigger-open-project", () => callback());
  },
  onTriggerSave: (callback) => {
    ipcRenderer.removeAllListeners("trigger-save");
    ipcRenderer.on("trigger-save", () => callback());
  },
  onTriggerSaveAs: (callback) => {
    ipcRenderer.removeAllListeners("trigger-save-as");
    ipcRenderer.on("trigger-save-as", () => callback());
  },
  onTriggerImportMedia: (callback) => {
    ipcRenderer.removeAllListeners("trigger-import-media");
    ipcRenderer.on("trigger-import-media", () => callback());
  },
  onTriggerExport: (callback) => {
    ipcRenderer.removeAllListeners("trigger-export");
    ipcRenderer.on("trigger-export", () => callback());
  },
  onTriggerSettings: (callback) => {
    ipcRenderer.removeAllListeners("trigger-settings");
    ipcRenderer.on("trigger-settings", () => callback());
  },
  onTriggerDeleteSelected: (callback) => {
    ipcRenderer.removeAllListeners("trigger-delete-selected");
    ipcRenderer.on("trigger-delete-selected", () => callback());
  },
};

contextBridge.exposeInMainWorld("api", electronAPI);
