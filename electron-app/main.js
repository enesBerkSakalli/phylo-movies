/**
 * Phylo-Movies Desktop - Electron Main Process
 *
 * This is the entry point for the Electron app.
 * It spawns the Python backend and loads the React frontend.
 */

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const net = require('net');
const fs = require('fs');

// Capture early crashes before app lifecycle starts
const earlyLogPath = '/tmp/phylo-movies-main.log';
function earlyLog(message) {
  try {
    fs.appendFileSync(earlyLogPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    // Avoid crashing if logging fails
  }
}

process.on('uncaughtException', (err) => {
  earlyLog(`uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
});

process.on('unhandledRejection', (reason) => {
  earlyLog(`unhandledRejection: ${reason && reason.stack ? reason.stack : String(reason)}`);
});

// Configuration
const isDev = process.env.NODE_ENV === 'development';
const DEFAULT_PORT = 5002;
const FRONTEND_DEV_URL = 'http://localhost:5173';

let mainWindow = null;
let splashWindow = null;
let pythonProcess = null;
let backendPort = DEFAULT_PORT;
let backendRootDir = null;
let launchLogPath = null;

function logToFile(message) {
  try {
    if (!launchLogPath) {
      const userDataDir = app.getPath('userData');
      fs.mkdirSync(userDataDir, { recursive: true });
      launchLogPath = path.join(userDataDir, 'launch.log');
    }
    fs.appendFileSync(launchLogPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    // Avoid crashing if logging fails
  }
}

/**
 * Create the splash/loading window
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'splash-preload.js'),
    },
  });

  if (isDev) {
    splashWindow.loadURL(`${FRONTEND_DEV_URL}/splash.html`);
  } else {
    splashWindow.loadFile(path.join(__dirname, 'frontend-dist', 'splash.html'));
  }

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * Update splash window status
 */
function updateSplashStatus(message, progress) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('status-update', { message, progress });
  }
}

/**
 * Close splash window with fade animation
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
 * Find an available port starting from the default
 */
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

/**
 * Wait for the backend server to be ready
 */
function waitForBackend(port, maxRetries = 60, delay = 1000) {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        retry();
      });
      socket.on('error', () => {
        socket.destroy();
        retry();
      });

      socket.connect(port, '127.0.0.1');
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error(`Backend failed to start after ${maxRetries} attempts`));
      } else {
        setTimeout(check, delay);
      }
    };

    check();
  });
}

/**
 * Get the path to the Python backend executable
 */
function getBackendPath() {
  if (isDev) {
    return null; // Will use python command
  }

  const platform = process.platform;
  const execName = platform === 'win32' ? 'brancharchitect-server.exe' : 'brancharchitect-server';

  // Production: prefer archived backend to avoid huge copy trees during packaging
  const archivePath = path.join(process.resourcesPath, 'BranchArchitect', 'brancharchitect-server.tar.gz');
  if (fs.existsSync(archivePath)) {
    logToFile(`Found backend archive at ${archivePath}`);
    const extractedDir = ensureBackendExtracted(archivePath);
    if (extractedDir) {
      backendRootDir = extractedDir;
      logToFile(`Using extracted backend at ${extractedDir}`);
      return path.join(extractedDir, execName);
    }
  }

  // Fallback: backend is in extraResources as a directory
  const backendPath = path.join(process.resourcesPath, 'BranchArchitect', 'brancharchitect-server', execName);
  if (fs.existsSync(backendPath)) {
    backendRootDir = path.dirname(backendPath);
    logToFile(`Using bundled backend at ${backendRootDir}`);
    return backendPath;
  }

  console.error('Backend executable not found at:', backendPath);
  logToFile(`Backend executable not found at: ${backendPath}`);
  return null;
}

/**
 * Extract backend archive into a user-writable location (once per app version)
 */
function ensureBackendExtracted(archivePath) {
  const userDataDir = app.getPath('userData');
  const targetRoot = path.join(userDataDir, 'BranchArchitect');
  const markerPath = path.join(targetRoot, '.extracted-version');
  const expectedVersion = app.getVersion();
  const extractedDir = path.join(targetRoot, 'brancharchitect-server');

  try {
    logToFile(`Preparing backend extraction to ${targetRoot} (version ${expectedVersion})`);
    if (fs.existsSync(markerPath) && fs.readFileSync(markerPath, 'utf8').trim() === expectedVersion) {
      if (fs.existsSync(extractedDir)) {
        logToFile('Backend already extracted for this version');
        return extractedDir;
      }
    }

    logToFile('Removing previous extracted backend (if any)');
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.mkdirSync(targetRoot, { recursive: true });

    logToFile(`Extracting backend archive: ${archivePath}`);
    const result = spawnSync('tar', ['-xzf', archivePath, '-C', targetRoot], {
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const stderr = result.stderr ? result.stderr.toString().trim() : 'unknown error';
      logToFile(`Backend extraction failed: ${stderr}`);
      throw new Error(`Failed to extract backend archive: ${stderr}`);
    }

    fs.writeFileSync(markerPath, expectedVersion);
    logToFile('Backend extraction completed');
    return extractedDir;
  } catch (err) {
    console.error('Backend extraction failed:', err);
    logToFile(`Backend extraction exception: ${err && err.message ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Get the path to the FastTree binary
 */
function getFastTreePath() {
  const platform = process.platform;
  // Map Node's process.platform to our bin folder names
  const platformDir = platform === 'darwin' ? 'darwin' : platform === 'win32' ? 'win32' : 'linux';
  const execName = platform === 'win32' ? 'fasttree.exe' : 'fasttree';

  if (isDev) {
    // Development: look in BranchArchitect/bin
    const devPath = path.join(__dirname, 'BranchArchitect', 'bin', platformDir, execName);
    if (fs.existsSync(devPath)) {
      return devPath;
    }
  } else {
    // Production: FastTree is bundled inside _internal by PyInstaller
    const backendRoot = backendRootDir || path.join(process.resourcesPath, 'BranchArchitect', 'brancharchitect-server');
    const prodPath = path.join(backendRoot, '_internal', 'bin', platformDir, execName);
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }

  return null; // Fallback to PATH
}

/**
 * Start the Python backend server
 */
async function startBackend() {
  backendPort = await findAvailablePort(DEFAULT_PORT);
  console.log(`Starting backend on port ${backendPort}...`);
  logToFile(`Starting backend on port ${backendPort}`);

  const backendPath = getBackendPath();
  const fasttreePath = getFastTreePath();
  logToFile(`Backend path: ${backendPath || 'dev (poetry)'}`);
  logToFile(`FastTree path: ${fasttreePath || 'not found'}`);

  if (isDev || !backendPath) {
    // Development: run Python through Poetry (BranchArchitect's venv)
    const serverScript = path.join(__dirname, 'BranchArchitect', 'webapp', 'run.py');
    const branchArchitectDir = path.join(__dirname, 'BranchArchitect');

    const env = {
      ...process.env,
      FLASK_ENV: 'development',
      FLASK_DEBUG: '1',
      PORT: backendPort.toString(),
    };

    if (fasttreePath) {
      env.FASTTREE_PATH = fasttreePath;
      console.log(`Using bundled FastTree at: ${fasttreePath}`);
    }

    pythonProcess = spawn('poetry', ['run', 'python', serverScript, '--port', backendPort.toString()], {
      cwd: branchArchitectDir,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    logToFile(`Spawned backend via poetry in ${branchArchitectDir}`);
  } else {
    // Production: run bundled executable
    const env = {
      ...process.env,
      PORT: backendPort.toString(),
      FLASK_DEBUG: '0',  // Disable debug mode in production to avoid reloader issues
      FLASK_ENV: 'production',
    };

    if (fasttreePath) {
      env.FASTTREE_PATH = fasttreePath;
    }

    pythonProcess = spawn(backendPath, ['--port', backendPort.toString()], {
      cwd: path.dirname(backendPath),
      env: env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logToFile(`Spawned backend binary at ${backendPath}`);
  }

  // Store stderr output for error reporting
  let stderrBuffer = '';

  pythonProcess.stdout.on('data', (data) => {
    try {
      console.log(`[Backend] ${data.toString().trim()}`);
      logToFile(`[Backend] ${data.toString().trim()}`);
    } catch (e) {
      // Ignore logging errors
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    try {
      const output = data.toString().trim();
      stderrBuffer += output + '\n';
      console.error(`[Backend Error] ${output}`);
      logToFile(`[Backend Error] ${output}`);
    } catch (e) {
      // Ignore logging errors
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    logToFile(`Backend process error: ${err && err.message ? err.message : String(err)}`);
    dialog.showErrorBox('Backend Error', `Failed to start backend: ${err.message}\n\n${stderrBuffer}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    logToFile(`Backend exited with code ${code}`);
    if (code !== 0 && code !== null) {
      dialog.showErrorBox('Backend Crashed', `Backend exited with code ${code}\n\nError output:\n${stderrBuffer.slice(-2000)}`);
    }
    pythonProcess = null;
  });

  try {
    await waitForBackend(backendPort);
    console.log('Backend is ready!');
    logToFile('Backend is ready');
    return true;
  } catch (error) {
    console.error('Backend failed to start:', error);
    logToFile(`Backend failed to start: ${error && error.message ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Stop the Python backend server
 */
function stopBackend() {
  if (pythonProcess) {
    console.log('Stopping backend...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pythonProcess.pid.toString(), '/f', '/t']);
    } else {
      pythonProcess.kill('SIGTERM');
      setTimeout(() => {
        if (pythonProcess) pythonProcess.kill('SIGKILL');
      }, 5000);
    }
    pythonProcess = null;
  }
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Phylo-Movies',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL(FRONTEND_DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend-dist', 'index.html'));
  }

  // Enable DevTools shortcut in production (Cmd+Option+I / Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.meta && input.alt && input.key === 'i') ||
        (input.control && input.shift && input.key === 'I')) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Set up IPC handlers for loading progress
 */
function setupIpcHandlers() {
  const { ipcMain } = require('electron');

  // App info handlers
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-backend-url', () => `http://127.0.0.1:${backendPort}`);

  // Loading UI handlers - Consolidated to only handle native taskbar progress
  // while the frontend React components handle the visual overlay
  ipcMain.on('loading-show', (event, message) => {
    if (mainWindow) {
      mainWindow.setProgressBar(0.01); // Show indeterminate/start in dock
    }
  });

  ipcMain.on('loading-hide', () => {
    if (mainWindow) {
      mainWindow.setProgressBar(-1); // Clear dock progress
    }
  });

  ipcMain.on('loading-progress', (event, { progress, message }) => {
    if (mainWindow && progress >= 0) {
      mainWindow.setProgressBar(progress / 100); // Dock progress (0-1)
    }
  });

  // Direct progress bar control (for dock/taskbar)
  ipcMain.on('set-progress', (event, progress) => {
    if (mainWindow) {
      mainWindow.setProgressBar(progress); // -1 to hide, 0-1 for progress
    }
  });
}

/**
 * Configure auto-updates (runs only in production)
 */
function setupAutoUpdates() {
  if (isDev) return; // Skip during development

  autoUpdater.autoDownload = true; // pulls blockmap/differential packages when available

  autoUpdater.on('error', (err) => {
    console.error('Updater error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err == null ? 'unknown' : err.message);
    }
  });

  autoUpdater.on('update-available', () => {
    if (mainWindow) mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('update-downloaded', () => {
    // For silent background install; swap to an IPC-confirmed call if you prefer prompting
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdatesAndNotify();
}

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
