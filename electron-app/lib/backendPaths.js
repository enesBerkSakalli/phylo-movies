/**
 * Path resolution for the bundled Python backend and tree-inference binaries.
 *
 * Pure path/filesystem logic only - no process spawning (see backendManager.js
 * for that).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { app } = require('electron');
const { isDev, APP_ROOT } = require('./config');
const { logToFile } = require('./logging');

// Set by getBackendPath() when it resolves an extracted archive or bundled
// directory; read by getBundledTreeToolPath() to find binaries alongside it.
let backendRootDir = null;

/**
 * Get the path to the Python backend executable.
 */
function getBackendPath() {
  if (isDev) {
    return null; // Will use python command
  }

  const platform = process.platform;
  const execName = platform === 'win32' ? 'brancharchitect-server.exe' : 'brancharchitect-server';

  // Production: prefer archived backend to avoid huge copy trees during packaging
  const archivePath = path.join(
    process.resourcesPath,
    'BranchArchitect',
    'brancharchitect-server.tar.gz'
  );
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
  const backendPath = path.join(
    process.resourcesPath,
    'BranchArchitect',
    'brancharchitect-server',
    execName
  );
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
 * Extract backend archive into a user-writable location (once per app version).
 */
function ensureBackendExtracted(archivePath) {
  const userDataDir = app.getPath('userData');
  const targetRoot = path.join(userDataDir, 'BranchArchitect');
  const markerPath = path.join(targetRoot, '.extracted-version');
  const expectedVersion = app.getVersion();
  const extractedDir = path.join(targetRoot, 'brancharchitect-server');

  try {
    logToFile(`Preparing backend extraction to ${targetRoot} (version ${expectedVersion})`);
    if (
      fs.existsSync(markerPath) &&
      fs.readFileSync(markerPath, 'utf8').trim() === expectedVersion
    ) {
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
 * Get the path to a bundled tree-inference binary.
 */
function getBundledTreeToolPath(toolName) {
  const platform = process.platform;
  // Map Node's process.platform to our bin folder names
  const platformDir = platform === 'darwin' ? 'darwin' : platform === 'win32' ? 'win32' : 'linux';
  const execName = platform === 'win32' ? `${toolName}.exe` : toolName;

  if (isDev) {
    // Development: look in engine/BranchArchitect/bin
    const devPath = path.join(
      APP_ROOT,
      '..',
      'engine',
      'BranchArchitect',
      'bin',
      platformDir,
      execName
    );
    if (fs.existsSync(devPath)) {
      return devPath;
    }
  } else {
    // Production: tools are bundled inside _internal by PyInstaller
    const backendRoot =
      backendRootDir ||
      path.join(process.resourcesPath, 'BranchArchitect', 'brancharchitect-server');
    const prodPath = path.join(backendRoot, '_internal', 'bin', platformDir, execName);
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }

  return null; // Fallback to backend discovery
}

module.exports = { getBackendPath, getBundledTreeToolPath };
