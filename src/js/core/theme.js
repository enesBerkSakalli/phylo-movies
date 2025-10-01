import { useAppStore } from './store.js';

const THEME_KEY = 'app-theme-preference'; // 'system' | 'light' | 'dark'

function applyThemePreference(pref) {
  const root = document.documentElement;
  if (pref === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (pref === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme'); // System
  }
  // Update store-managed tree colors to match theme
  try {
    useAppStore.getState().applyThemeColors(pref);
  } catch {}
  updateThemeToggleIcon(pref);
}

function getSavedThemePreference() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

function saveThemePreference(pref) {
  localStorage.setItem(THEME_KEY, pref);
}

function cycleThemePreference(current) {
  // System → Dark → Light → System
  if (current === 'system') return 'dark';
  if (current === 'dark') return 'light';
  return 'system';
}

function updateThemeToggleIcon(pref) {
  // Back-compat: update old material icon if present
  const iconEl = document.getElementById('theme-toggle-icon');
  if (iconEl) {
    iconEl.textContent = pref === 'dark' ? 'dark_mode' : pref === 'light' ? 'light_mode' : 'computer';
  }
  // New: set a data attribute on the toggle button for React/lucide UIs
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('data-theme-icon', pref);
    btn.setAttribute('aria-label', `Toggle theme (current: ${pref})`);
    btn.setAttribute('title', `Toggle theme (current: ${pref})`);
  }
}

function setupThemeToggle() {
  // Hook up the button if present
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = getSavedThemePreference();
      const next = cycleThemePreference(current);
      saveThemePreference(next);
      applyThemePreference(next);
    });
  }
  // Keep icon in sync if DOM was late
  requestAnimationFrame(() => updateThemeToggleIcon(getSavedThemePreference()));
}

/**
 * Initializes the theme system. It applies the saved theme on load
 * and sets up the theme toggle button once the DOM is ready.
 */
export function initializeTheme() {
  // Apply saved preference as early as possible to minimize flash
  const pref = getSavedThemePreference();
  applyThemePreference(pref);

  // Setup toggle after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupThemeToggle);
  } else {
    setupThemeToggle();
  }
}
