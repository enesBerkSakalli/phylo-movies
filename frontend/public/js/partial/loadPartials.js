/**
 * Simplified partial loader
 */

/**
 * Announce partial loading status to ARIA live region (if present)
 */
function announcePartialStatus(message) {
  const liveRegion = document.getElementById('aria-partial-status');
  if (liveRegion) {
    liveRegion.textContent = message;
  }
}

/**
 * Load a single HTML partial
 */
export async function loadPartial({ url, containerId, callback, errorCallback }) {
  const container = document.getElementById(containerId);
  if (!container) {
    const error = new Error(`Container not found: ${containerId}`);
    console.error(error.message);
    setTimeout(() => {
      if (errorCallback) errorCallback(error);
    }, 0);
    announcePartialStatus(`Failed to load content: ${containerId}`);
    return false;
  }

  try {
    console.log(`Loading partial: ${url} -> ${containerId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    container.innerHTML = content;

    console.log(`✅ Loaded partial: ${url}`);
    setTimeout(() => {
      if (callback) callback();
    }, 0);
    announcePartialStatus(`Loaded content: ${containerId}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to load partial ${url}:`, error);

    // Provide minimal fallback
    container.innerHTML = `<!-- Failed to load ${containerId} -->`;

    setTimeout(() => {
      if (errorCallback) errorCallback(error);
    }, 0);
    announcePartialStatus(`Failed to load content: ${containerId}`);
    return false;
  }
}

/**
 * Load multiple partials
 */
export async function loadAllPartials(partials) {
  if (!Array.isArray(partials) || partials.length === 0) {
    console.warn("No partials to load");
    return true;
  }

  console.log(`Loading ${partials.length} partials...`);
  
  const results = await Promise.allSettled(
    partials.map(partial => loadPartial(partial))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - successful;
  
  console.log(`Partials loaded: ${successful}/${results.length} successful`);
  
  if (failed > 0) {
    console.warn(`${failed} partials failed to load`);
  }
  
  // Always return true - app should continue even if some partials fail
  return true;
}

/**
 * Simple utility to check if element exists
 */
export function elementExists(id) {
  return document.getElementById(id) !== null;
}