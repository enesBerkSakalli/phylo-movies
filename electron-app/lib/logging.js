/**
 * Logging for the Electron main process.
 *
 * Two sinks, matching two different phases of the app's lifecycle:
 *   - earlyLog: a fixed path, usable before `app` is ready (captures crashes
 *     that happen during module load / before app.whenReady()).
 *   - logToFile: per-user userData directory, usable once `app` is ready.
 *
 * Registers the uncaughtException/unhandledRejection handlers as soon as
 * this module is required, so it must be required first in main.js to
 * preserve the original "capture early crashes" behavior.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const earlyLogPath = '/tmp/phylo-movies-main.log';
let launchLogPath = null;

function earlyLog(message) {
  try {
    fs.appendFileSync(earlyLogPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    // Avoid crashing if logging fails
  }
}

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

process.on('uncaughtException', (err) => {
  earlyLog(`uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
});

process.on('unhandledRejection', (reason) => {
  earlyLog(`unhandledRejection: ${reason && reason.stack ? reason.stack : String(reason)}`);
});

module.exports = { logToFile };
