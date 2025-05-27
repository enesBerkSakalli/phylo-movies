// Loads a single HTML partial into its container
export async function loadPartial({ url, containerId, callback, errorCallback }) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container not found: ${containerId}`);
    if (errorCallback) errorCallback(new Error(`Container not found: ${containerId}`));
    return;
  }
  
  try {
    console.log(`[loadPartial] Loading ${url} into ${containerId}`);
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!resp.ok) {
      throw new Error(`Failed to load partial: ${url} (${resp.status} ${resp.statusText})`);
    }
    
    const content = await resp.text();
    console.log(`[loadPartial] Successfully loaded ${url}, content length: ${content.length}`);
    container.innerHTML = content;
    
    if (callback) callback();
  } catch (err) {
    console.error(`Error loading partial ${url}:`, err);
    // Provide fallback content instead of error message
    container.innerHTML = `<div class="partial-error"><!-- ${containerId} partial failed to load --></div>`;
    if (errorCallback) errorCallback(err);
  }
}

// Loads multiple HTML partials in parallel with better error handling
export async function loadAllPartials(partials) {
  try {
    console.log(`[loadAllPartials] Starting to load ${partials.length} partials`);
    const results = await Promise.allSettled(partials.map(loadPartial));
    
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`[loadAllPartials] ${failed.length} partials failed to load:`, failed.map(f => f.reason?.message));
      // Continue anyway - don't block the app for missing partials
    }
    
    console.log(`[loadAllPartials] Completed loading partials: ${results.length - failed.length}/${results.length} successful`);
    return true; // Always return true to allow app to continue
  } catch (err) {
    console.error("Error loading partials:", err);
    return true; // Still return true - app should work even without partials
  }
}