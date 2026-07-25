/**
 * Window creation and management: the splash/loading window and the main
 * application window (icon, CSP, DevTools toggle).
 */

const fs = require('fs');
const path = require('path');
const { BrowserWindow } = require('electron');
const { isDev, FRONTEND_DEV_URL, APP_ROOT } = require('./config');

let mainWindow = null;
let splashWindow = null;

function getMainWindow() {
  return mainWindow;
}

function getWindowIconPath() {
  const iconPath = path.join(APP_ROOT, 'build', 'icon.png');
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

/**
 * Create the splash/loading window.
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: getWindowIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(APP_ROOT, 'splash-preload.js'),
    },
  });

  if (isDev) {
    splashWindow.loadURL(`${FRONTEND_DEV_URL}/pages/Splash/splash.html`);
  } else {
    splashWindow.loadFile(path.join(APP_ROOT, 'frontend-dist', 'pages', 'Splash', 'splash.html'));
  }

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * Update splash window status.
 */
function updateSplashStatus(message, progress) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('status-update', { message, progress });
  }
}

/**
 * Close splash window with fade animation.
 */
function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('fade-out');
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
    }, 300);
  }
}

/**
 * Create the main application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Phylo-Movies',
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(APP_ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL(FRONTEND_DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(APP_ROOT, 'frontend-dist', 'index.html'));
  }

  // Enable DevTools shortcut in production (Cmd+Option+I / Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      (input.meta && input.alt && input.key === 'i') ||
      (input.control && input.shift && input.key === 'I')
    ) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; " +
              "font-src 'self' data:"
            : "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "connect-src 'self' http://127.0.0.1:*; " +
              "font-src 'self' data:",
        ],
      },
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

module.exports = {
  createSplashWindow,
  updateSplashStatus,
  closeSplashWindow,
  createWindow,
  getMainWindow,
};
