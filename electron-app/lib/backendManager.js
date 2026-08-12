/**
 * Lifecycle of the Python (BranchArchitect) backend process: pick a port,
 * spawn it (dev via Poetry, prod via the bundled executable), wait for it
 * to accept connections, and stop it on app shutdown.
 */

const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { dialog } = require('electron');
const { isDev, DEFAULT_PORT, APP_ROOT } = require('./config');
const { logToFile } = require('./logging');
const { getBackendPath, getBundledTreeToolPath } = require('./backendPaths');

let pythonProcess = null;
let backendPort = DEFAULT_PORT;

function getBackendPort() {
  return backendPort;
}

/**
 * Find an available port starting from the default.
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
 * Wait for the backend server to be ready.
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
 * Start the Python backend server.
 */
async function startBackend() {
  backendPort = await findAvailablePort(DEFAULT_PORT);
  console.log(`Starting backend on port ${backendPort}...`);
  logToFile(`Starting backend on port ${backendPort}`);

  const backendPath = getBackendPath();
  const fasttreePath = getBundledTreeToolPath('fasttree');
  const iqtreePath = getBundledTreeToolPath('iqtree3');
  logToFile(`Backend path: ${backendPath || 'dev (poetry)'}`);
  logToFile(`FastTree path: ${fasttreePath || 'not found'}`);
  logToFile(`IQ-TREE path: ${iqtreePath || 'not found'}`);

  if (isDev || !backendPath) {
    // Development: run Python through Poetry (engine/BranchArchitect's venv)
    const serverScript = path.join(APP_ROOT, '..', 'engine', 'BranchArchitect', 'webapp', 'run.py');
    const branchArchitectDir = path.join(APP_ROOT, '..', 'engine', 'BranchArchitect');

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
    if (iqtreePath) {
      env.IQTREE_PATH = iqtreePath;
      console.log(`Using bundled IQ-TREE at: ${iqtreePath}`);
    }

    pythonProcess = spawn(
      'poetry',
      ['run', 'python', serverScript, '--port', backendPort.toString()],
      {
        cwd: branchArchitectDir,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      }
    );
    logToFile(`Spawned backend via poetry in ${branchArchitectDir}`);
  } else {
    // Production: run bundled executable
    const env = {
      ...process.env,
      PORT: backendPort.toString(),
      FLASK_DEBUG: '0', // Disable debug mode in production to avoid reloader issues
      FLASK_ENV: 'production',
    };

    if (fasttreePath) {
      env.FASTTREE_PATH = fasttreePath;
    }
    if (iqtreePath) {
      env.IQTREE_PATH = iqtreePath;
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
    } catch (_e) {
      // Ignore logging errors
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    try {
      const output = data.toString().trim();
      stderrBuffer += output + '\n';
      console.error(`[Backend Error] ${output}`);
      logToFile(`[Backend Error] ${output}`);
    } catch (_e) {
      // Ignore logging errors
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    logToFile(`Backend process error: ${err && err.message ? err.message : String(err)}`);
    dialog.showErrorBox(
      'Backend Error',
      `Failed to start backend: ${err.message}\n\n${stderrBuffer}`
    );
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    logToFile(`Backend exited with code ${code}`);
    if (code !== 0 && code !== null) {
      dialog.showErrorBox(
        'Backend Crashed',
        `Backend exited with code ${code}\n\nError output:\n${stderrBuffer.slice(-2000)}`
      );
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
 * Stop the Python backend server.
 */
function stopBackend() {
  if (pythonProcess) {
    console.log('Stopping backend...');
    if (process.platform === 'win32') {
      const pid = pythonProcess.pid;
      const killer = spawn('taskkill', ['/pid', pid.toString(), '/f', '/t']);
      killer.on('error', (err) => {
        console.error('Failed to run taskkill:', err);
        logToFile(
          `taskkill spawn error for pid ${pid}: ${err && err.message ? err.message : String(err)}`
        );
      });
      killer.on('exit', (code) => {
        if (code !== 0) {
          console.error(`taskkill exited with code ${code} for pid ${pid}`);
          logToFile(`taskkill exited with code ${code} for pid ${pid}`);
        }
      });
    } else {
      pythonProcess.kill('SIGTERM');
      setTimeout(() => {
        if (pythonProcess) pythonProcess.kill('SIGKILL');
      }, 5000);
    }
    pythonProcess = null;
  }
}

module.exports = { startBackend, stopBackend, getBackendPort };
