/**
 * API Configuration for Multi-platform Support
 * Resolves the backend base URL correctly whether running in a browser or Electron.
 */

/**
 * Gets the base URL for the backend API.
 * @returns {string} The base URL (e.g., 'http://localhost:5002') or an empty string for relative paths.
 */
export async function getApiBaseUrl() {
  // Check if running in Electron environment
  if (window.electronAPI && typeof window.electronAPI.getBackendUrl === 'function') {
    try {
      const url = await window.electronAPI.getBackendUrl();
      if (url) {
        // Remove trailing slash if present
        return url.endsWith('/') ? url.slice(0, -1) : url;
      }
    } catch (err) {
      console.warn('Failed to get backend URL from Electron IPC, falling back to relative paths.', err);
    }
  }

  // Web mode: use relative paths (compatible with Vite proxy/production serving)
  return '';
}

/**
 * Helper to construct a full API URL.
 * @param {string} endpoint - The API endpoint (e.g., '/treedata')
 * @returns {Promise<string>} The full URL.
 */
export async function resolveApiUrl(endpoint) {
  const base = await getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Checks if the application is currently running in Electron.
 * @returns {boolean}
 */
export function isElectron() {
  return typeof window !== 'undefined' && !!(window.electronAPI);
}
