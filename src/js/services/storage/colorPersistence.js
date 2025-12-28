/**
 * Service for persisting color category preferences to localStorage
 */

export const COLOR_STORAGE_KEY = 'phylo.colorCategories';
export const TAXA_GROUPING_KEY = 'phylo.taxaGrouping';

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

/**
 * Load persisted taxa grouping metadata (mode, separators, group colors)
 * @returns {Object|null} grouping data or null
 */
export function loadPersistedTaxaGrouping() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(TAXA_GROUPING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Persist taxa grouping metadata for legend reconstruction
 * @param {Object|null} grouping
 */
export function persistTaxaGrouping(grouping) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!grouping) {
      window.localStorage.removeItem(TAXA_GROUPING_KEY);
      return;
    }
    window.localStorage.setItem(TAXA_GROUPING_KEY, JSON.stringify(grouping));
  } catch (_) {
    // ignore storage errors
  }
}
