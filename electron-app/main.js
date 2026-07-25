/**
 * Phylo-Movies Desktop - Electron Main Process
 *
 * This is the entry point for the Electron app. It orchestrates the app
 * lifecycle; the actual logic lives in lib/:
 *   - logging.js:        early-crash + userData logging (must load first)
 *   - config.js:         shared constants (isDev, ports, paths)
 *   - backendPaths.js:   resolving the bundled Python backend/binaries
 *   - backendManager.js: spawning/stopping the Python backend
 *   - windows.js:        splash + main BrowserWindow creation
 *   - ipc.js:             IPC handlers exposed to the renderer
 *   - autoUpdates.js:    electron-updater wiring (production only)
 */

// Must be required first: registers uncaughtException/unhandledRejection
// handlers so crashes during the rest of module load are still captured.
require('./lib/logging');

const { app, BrowserWindow, dialog } = require('electron');
const { isDev } = require('./lib/config');
const { startBackend, stopBackend } = require('./lib/backendManager');
const {
  createSplashWindow,
  updateSplashStatus,
  closeSplashWindow,
  createWindow,
  getMainWindow,
} = require('./lib/windows');
const { setupIpcHandlers } = require('./lib/ipc');
const { setupAutoUpdates } = require('./lib/autoUpdates');

// Application lifecycle
app.whenReady().then(async () => {
  // Set up IPC handlers
  setupIpcHandlers();

  // Show splash screen immediately
  createSplashWindow();
  updateSplashStatus('Initializing...', 10);

  // Start backend
  updateSplashStatus('Starting backend server...', 20);
  const backendReady = await startBackend();

  if (!backendReady && !isDev) {
    closeSplashWindow();
    dialog.showErrorBox('Startup Error', 'Failed to start the backend server.');
    app.quit();
    return;
  }

  updateSplashStatus('Backend ready!', 60);

  // Create main window (hidden initially)
  updateSplashStatus('Loading interface...', 80);
  createWindow();

  // Wait for main window to be ready, then switch
  const mainWindow = getMainWindow();
  mainWindow.webContents.once('did-finish-load', () => {
    updateSplashStatus('Ready!', 100);

    // Brief delay to show 100% progress
    setTimeout(() => {
      closeSplashWindow();
      mainWindow.show();
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    }, 500);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Start auto-updates (production only)
  setupAutoUpdates();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', stopBackend);
app.on('quit', stopBackend);
