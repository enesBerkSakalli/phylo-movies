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
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

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
    path.join(process.resourcesPath, 'backend', execName),
    path.join(__dirname, 'backend', 'dist', execName),
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
 * Start the Python backend server
 */
async function startBackend() {
  backendPort = await findAvailablePort(DEFAULT_PORT);
  console.log(`Starting backend on port ${backendPort}...`);

  const backendPath = getBackendPath();

  if (isDev || !backendPath) {
    // Development: run Python through Poetry (BranchArchitect's venv)
    const serverScript = path.join(__dirname, 'backend', 'server.py');
    const branchArchitectDir = path.join(__dirname, 'backend', 'BranchArchitect');

    pythonProcess = spawn('poetry', ['run', 'python', serverScript, '--port', backendPort.toString()], {
      cwd: branchArchitectDir,
      env: {
        ...process.env,
        FLASK_ENV: 'development',
        PORT: backendPort.toString(),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
  } else {
    // Production: run bundled executable
    pythonProcess = spawn(backendPath, ['--port', backendPort.toString()], {
      cwd: path.dirname(backendPath),
      env: { ...process.env, PORT: backendPort.toString() },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    dialog.showErrorBox('Backend Error', `Failed to start backend: ${err.message}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
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
 * Loading overlay window for data processing
 */
let loadingWindow = null;

function createLoadingWindow(message = 'Processing...') {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    return;
  }

  loadingWindow = new BrowserWindow({
    width: 350,
    height: 150,
    frame: false,
    transparent: true,
    resizable: false,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const loadingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: rgba(26, 26, 46, 0.95);
          border-radius: 12px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          padding: 20px;
          -webkit-app-region: drag;
        }
        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(79, 172, 254, 0.2);
          border-top-color: #4facfe;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .message {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
          margin-bottom: 12px;
        }
        .progress-bar {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
          width: 0%;
          transition: width 0.3s ease;
        }
        .progress-fill.indeterminate {
          width: 30%;
          animation: indeterminate 1.5s infinite ease-in-out;
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <div class="message" id="message">${message}</div>
      <div class="progress-bar">
        <div class="progress-fill indeterminate" id="progress"></div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('update-loading', (event, { message, progress }) => {
          if (message) document.getElementById('message').textContent = message;
          const progressEl = document.getElementById('progress');
          if (progress !== undefined && progress >= 0) {
            progressEl.classList.remove('indeterminate');
            progressEl.style.width = progress + '%';
          } else {
            progressEl.classList.add('indeterminate');
          }
        });
      </script>
    </body>
    </html>
  `;

  loadingWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml));

  loadingWindow.once('ready-to-show', () => {
    loadingWindow.show();
  });

  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });
}

function updateLoadingWindow(message, progress) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send('update-loading', { message, progress });
  }
}

function closeLoadingWindow() {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
    loadingWindow = null;
  }
}

/**
 * Set up IPC handlers for loading progress
 */
function setupIpcHandlers() {
  const { ipcMain } = require('electron');

  // App info handlers
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-backend-url', () => `http://127.0.0.1:${backendPort}`);

  // Loading window handlers
  ipcMain.on('loading-show', (event, message) => {
    createLoadingWindow(message || 'Processing...');
  });

  ipcMain.on('loading-hide', () => {
    closeLoadingWindow();
    if (mainWindow) {
      mainWindow.setProgressBar(-1); // Clear dock progress
    }
  });

  ipcMain.on('loading-progress', (event, { progress, message }) => {
    updateLoadingWindow(message, progress);
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
