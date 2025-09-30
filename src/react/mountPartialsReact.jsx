import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { TopScaleBar } from './components/TopScaleBar.jsx';
import { ButtonsFileOps } from './components/ButtonsFileOps.jsx';
import { ButtonsMSA } from './components/ButtonsMSA.jsx';
import { Appearance } from './components/Appearance.jsx';
import { MoviePlayerBar } from './components/MoviePlayerBar.jsx';

/**
 * Mounts the React version of TopScaleBar into its container.
 * Returns true if mounted, false if container missing.
 */
export function mountReactTopScaleBar() {
  const container = document.getElementById('top-scale-bar-container');
  if (!container) return false;
  try {
    const root = createRoot(container);
    flushSync(() => {
      root.render(<TopScaleBar />);
    });
    return true;
  } catch (e) {
    console.error('[ReactPartials] Failed to mount TopScaleBar:', e);
    return false;
  }
}

/**
 * Mounts the React version of ButtonsFileOps into its container.
 * Returns true if mounted, false if container missing.
 */
export function mountReactButtonsFileOps() {
  const container = document.getElementById('buttons-file-container');
  if (!container) return false;
  try {
    const root = createRoot(container);
    flushSync(() => {
      root.render(<ButtonsFileOps />);
    });
    return true;
  } catch (e) {
    console.error('[ReactPartials] Failed to mount ButtonsFileOps:', e);
    return false;
  }
}

export function mountReactButtonsMSA() {
  const container = document.getElementById('buttons-msa-container');
  if (!container) return false;
  try {
    const root = createRoot(container);
    flushSync(() => {
      root.render(<ButtonsMSA />);
    });
    return true;
  } catch (e) {
    console.error('[ReactPartials] Failed to mount ButtonsMSA:', e);
    return false;
  }
}

export function mountReactAppearance() {
  const container = document.getElementById('appearance-container');
  if (!container) return false;
  try {
    const root = createRoot(container);
    flushSync(() => {
      root.render(<Appearance />);
    });
    return true;
  } catch (e) {
    console.error('[ReactPartials] Failed to mount Appearance:', e);
    return false;
  }
}

export function mountReactMoviePlayerBar() {
  const container = document.getElementById('movie-player-container');
  if (!container) return false;
  try {
    const root = createRoot(container);
    flushSync(() => {
      root.render(<MoviePlayerBar />);
    });
    return true;
  } catch (e) {
    console.error('[ReactPartials] Failed to mount MoviePlayerBar:', e);
    return false;
  }
}
