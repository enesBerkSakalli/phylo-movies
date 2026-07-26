/**
 * IPC handlers exposed to the renderer via preload.js's contextBridge.
 */

const { app, ipcMain } = require('electron');
const { getMainWindow } = require('./windows');
const { getBackendPort } = require('./backendManager');

/**
 * Set up IPC handlers for app info and loading progress.
 */
function setupIpcHandlers() {
  // App info handlers
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-backend-url', () => `http://127.0.0.1:${getBackendPort()}`);

  // Loading UI handlers - Consolidated to only handle native taskbar progress
  // while the frontend React components handle the visual overlay
  ipcMain.on('loading-show', (_event, _message) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setProgressBar(0.01); // Show indeterminate/start in dock
    }
  });

  ipcMain.on('loading-hide', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setProgressBar(-1); // Clear dock progress
    }
  });

  ipcMain.on('loading-progress', (event, { progress, message: _message }) => {
    const mainWindow = getMainWindow();
    if (mainWindow && progress >= 0) {
      mainWindow.setProgressBar(progress / 100); // Dock progress (0-1)
    }
  });

  // Direct progress bar control (for dock/taskbar)
  ipcMain.on('set-progress', (event, progress) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setProgressBar(progress); // -1 to hide, 0-1 for progress
    }
  });
}

module.exports = { setupIpcHandlers };
