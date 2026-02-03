/**
 * Phylo-Movies Desktop - Electron Main Process
 *
 * This is the entry point for the Electron app.
 * It spawns the Python backend and loads the React frontend.
 */

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

// Configuration
const isDev = process.env.NODE_ENV === 'development';
const DEFAULT_PORT = 5002;
const FRONTEND_DEV_URL = 'http://localhost:5173';

let mainWindow = null;
let splashWindow = null;
let pythonProcess = null;
let backendPort = DEFAULT_PORT;

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

  const possiblePaths = [
    path.join(process.resourcesPath, 'BranchArchitect', 'brancharchitect-server', execName),
    path.join(__dirname, 'BranchArchitect', 'dist', 'brancharchitect-server', execName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  console.error('Backend executable not found. Checked:', possiblePaths);
  return null;
}

/**
 * Get the path to the FastTree binary
 */
function getFastTreePath() {
  const platform = process.platform;
  const execName = platform === 'win32' ? 'fasttree.exe' : 'fasttree';

  const possiblePaths = [
    path.join(__dirname, 'BranchArchitect', 'bin', platform, execName),
    path.join(process.resourcesPath, 'BranchArchitect', 'brancharchitect-server', 'bin', platform, execName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
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

  const backendPath = getBackendPath();
  const fasttreePath = getFastTreePath();

  if (isDev || !backendPath) {
    // Development: run Python through Poetry (BranchArchitect's venv)
    const serverScript = path.join(__dirname, 'BranchArchitect', 'webapp', 'run.py');
    const branchArchitectDir = path.join(__dirname, 'BranchArchitect');

    const env = {
      ...process.env,
      FLASK_ENV: 'development',
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
  }

  // Store stderr output for error reporting
  let stderrBuffer = '';

  pythonProcess.stdout.on('data', (data) => {
    try {
      console.log(`[Backend] ${data.toString().trim()}`);
    } catch (e) {
      // Ignore logging errors
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    try {
      const output = data.toString().trim();
      stderrBuffer += output + '\n';
      console.error(`[Backend Error] ${output}`);
    } catch (e) {
      // Ignore logging errors
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    dialog.showErrorBox('Backend Error', `Failed to start backend: ${err.message}\n\n${stderrBuffer}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    if (code !== 0 && code !== null) {
      dialog.showErrorBox('Backend Crashed', `Backend exited with code ${code}\n\nError output:\n${stderrBuffer.slice(-2000)}`);
    }
    pythonProcess = null;
  });

  try {
    await waitForBackend(backendPort);
    console.log('Backend is ready!');
    return true;
  } catch (error) {
    console.error('Backend failed to start:', error);
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
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend-dist', 'index.html'));
  }

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
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', stopBackend);
app.on('quit', stopBackend);
