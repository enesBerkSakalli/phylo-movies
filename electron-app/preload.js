/**
 * Electron Preload Script
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),

  // Loading progress API
  showLoading: (message) => ipcRenderer.send('loading-show', message),
  hideLoading: () => ipcRenderer.send('loading-hide'),
  updateProgress: (progress, message) => ipcRenderer.send('loading-progress', { progress, message }),

  // Set progress in dock/taskbar (0-1 for progress, -1 for indeterminate)
  setProgress: (progress) => ipcRenderer.send('set-progress', progress),
});

console.log('Electron preload script loaded');
