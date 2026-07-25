/**
 * Auto-update wiring via electron-updater (GitHub Releases). Production only.
 */

const { autoUpdater } = require('electron-updater');
const { isDev } = require('./config');
const { getMainWindow } = require('./windows');

/**
 * Configure auto-updates (runs only in production).
 */
function setupAutoUpdates() {
  if (isDev) return; // Skip during development

  autoUpdater.autoDownload = true; // pulls blockmap/differential packages when available

  autoUpdater.on('error', (err) => {
    console.error('Updater error:', err);
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err == null ? 'unknown' : err.message);
    }
  });

  autoUpdater.on('update-available', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-not-available', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('update-downloaded', () => {
    // For silent background install; swap to an IPC-confirmed call if you prefer prompting
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdatesAndNotify();
}

module.exports = { setupAutoUpdates };
