/**
 * Shared constants for the Electron main process.
 */

const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const DEFAULT_PORT = 5002;
const FRONTEND_DEV_URL = 'http://localhost:5173';

// electron-app/ root, resolved relative to this file's location so every
// module gets the same answer regardless of where it lives under lib/.
const APP_ROOT = path.join(__dirname, '..');

module.exports = { isDev, DEFAULT_PORT, FRONTEND_DEV_URL, APP_ROOT };
