/**
 * Service for persisting color category preferences to localStorage
 */

export const COLOR_STORAGE_KEY = 'phylo.colorCategories';

/**
 * Loads persisted color categories from localStorage
 * @returns {Object|null} Persisted color categories or null if unavailable
 */
export function loadPersistedColorCategories() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(COLOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Persists color categories to localStorage
 * @param {Object} colorCategories - Color categories to persist
 */
export function persistColorCategories(colorCategories) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colorCategories));
  } catch (_) {
    // Silently ignore storage errors
  }
}
