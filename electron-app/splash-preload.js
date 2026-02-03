/**
 * Electron Preload Script for Splash Window
 *
 * Securely exposes IPC methods for splash screen status updates.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },
  onFadeOut: (callback) => {
    ipcRenderer.on('fade-out', () => callback());
  },
});
