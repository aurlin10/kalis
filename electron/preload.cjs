// Pont sécurisé entre l'interface et les fonctions natives (fichiers, PDF, mises à jour…)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kalis', {
  version: () => ipcRenderer.invoke('app:version'),
  backup: (json, dir) => ipcRenderer.invoke('backup:write', json, dir),
  backupDefaultDir: () => ipcRenderer.invoke('backup:defaultDir'),
  chooseDir: () => ipcRenderer.invoke('dialog:chooseDir'),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  saveFile: (name, base64, filters) => ipcRenderer.invoke('file:save', name, base64, filters),
  exportPDF: (name) => ipcRenderer.invoke('pdf:export', name),
  getAutoLaunch: () => ipcRenderer.invoke('autolaunch:get'),
  setAutoLaunch: (on) => ipcRenderer.invoke('autolaunch:set', on),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
});
