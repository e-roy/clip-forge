import {
  Menu,
  MenuItemConstructorOptions,
  app,
  shell,
  BrowserWindow,
} from "electron";

export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? ([
          {
            label: app.getName(),
            submenu: [
              { role: "about", label: `About ${app.getName()}` },
              { type: "separator" as const },
              { role: "hide" as const, label: `Hide ${app.getName()}` },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const, label: `Quit ${app.getName()}` },
            ] as MenuItemConstructorOptions[],
          },
        ] as MenuItemConstructorOptions[])
      : []),
    // File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("trigger-new-project");
          },
        },
        {
          label: "Open Project...",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow.webContents.send("trigger-open-project");
          },
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow.webContents.send("trigger-save");
          },
        },
        {
          label: "Save As...",
          accelerator: "Shift+CmdOrCtrl+S",
          click: () => {
            mainWindow.webContents.send("trigger-save-as");
          },
        },
        { type: "separator" as const },
        {
          label: "Import Media...",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            mainWindow.webContents.send("trigger-import-media");
          },
        },
        { type: "separator" as const },
        {
          label: "Export Video...",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            mainWindow.webContents.send("trigger-export");
          },
        },
        { type: "separator" as const },
        {
          label: "Settings...",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow.webContents.send("trigger-settings");
          },
        },
        ...(!isMac
          ? ([
              { type: "separator" as const },
              {
                label: "Exit",
                accelerator: "CmdOrCtrl+Q",
                click: () => {
                  app.quit();
                },
              },
            ] as MenuItemConstructorOptions[])
          : []),
      ] as MenuItemConstructorOptions[],
    },
    // Edit Menu
    {
      label: "Edit",
      submenu: [
        { role: "undo", label: "Undo" },
        { role: "redo", label: "Redo" },
        { type: "separator" as const },
        { role: "cut", label: "Cut" },
        { role: "copy", label: "Copy" },
        { role: "paste", label: "Paste" },
        { role: "selectAll", label: "Select All" },
        { type: "separator" as const },
        {
          label: "Delete Selected Item",
          accelerator: process.platform === "darwin" ? "Backspace" : "Delete",
          click: () => {
            mainWindow.webContents.send("trigger-delete-selected");
          },
        },
      ] as MenuItemConstructorOptions[],
    },
    // View Menu
    {
      label: "View",
      submenu: [
        { role: "reload", label: "Reload" },
        { role: "forceReload", label: "Force Reload" },
        { role: "toggleDevTools", label: "Toggle Developer Tools" },
        { type: "separator" as const },
        { role: "resetZoom", label: "Actual Size" },
        { role: "zoomIn", label: "Zoom In" },
        { role: "zoomOut", label: "Zoom Out" },
        { type: "separator" as const },
        { role: "togglefullscreen", label: "Toggle Fullscreen" },
      ] as MenuItemConstructorOptions[],
    },
    // Window Menu (macOS specific)
    ...(isMac
      ? ([
          {
            label: "Window",
            submenu: [
              { role: "minimize", label: "Minimize" },
              { role: "zoom", label: "Zoom" },
              { type: "separator" as const },
              { role: "front", label: "Bring All to Front" },
            ] as MenuItemConstructorOptions[],
          },
        ] as MenuItemConstructorOptions[])
      : []),
    // Help Menu
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: async () => {
            await shell.openExternal(
              "https://github.com/your-username/clip-forge/tree/main/docs"
            );
          },
        },
        { type: "separator" as const },
        {
          label: "View License",
          click: async () => {
            await shell.openExternal(
              "https://github.com/your-username/clip-forge/blob/main/LICENSE"
            );
          },
        },
        {
          label: "Report Issue",
          click: async () => {
            await shell.openExternal(
              "https://github.com/your-username/clip-forge/issues"
            );
          },
        },
        { type: "separator" as const },
        {
          label: "About ClipForge",
          click: async () => {
            // Send a message to show the about dialog
            mainWindow.webContents.send("show-about-dialog");
          },
        },
      ] as MenuItemConstructorOptions[],
    },
  ];

  return Menu.buildFromTemplate(template);
}
