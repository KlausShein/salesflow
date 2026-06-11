const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Called when update is fully downloaded
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, version) => callback(version));
  },
  // Called during download to show progress
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_event, percent) => callback(percent));
  },
  // Trigger install + restart
  installUpdate: () => {
    ipcRenderer.send('install-update');
  },
  // Clean up listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-progress');
  },
});
