import Gui from "../controllers/gui.js";
import { useAppStore } from './store.js';
import { debounce } from '../utils/debounce.js';
import 'winbox/dist/css/winbox.min.css';
import { DeckGLTreeAnimationController } from '../treeVisualisation/DeckGLTreeAnimationController.js';

//

// Legacy event handler system removed; React components own their events
import { notifications } from "../services/notifications.js";
import { phyloData } from '../services/dataService.js';
import { getPhyloMovieData } from "../services/dataManager.js";
import { initializeTheme } from './theme.js';

let eventHandlersAttached = false;

// Initialize theme as early as possible
initializeTheme();

//


/**
 * Measure the movie player bar height and expose it as a CSS variable so
 * layout can reserve the correct space and avoid overlap.
 */
function updateMovieBarHeightVar() {
  try {
    const bar = document.querySelector('.movie-player-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const heightPx = Math.max(64, Math.round(rect.height));
    document.documentElement.style.setProperty('--movie-player-bar-height', `${heightPx}px`);
  } catch (e) {
    console.warn('[layout] Failed to update --movie-player-bar-height:', e);
  }
}



/**
 * Initializes the GUI, attaches event handlers, and starts the movie.
 * This function assumes that all required HTML partials have been loaded.
 * @param {Object} parsedData - The validated phyloMovieData.
 * @param {Array<Object>} processedEmbedding - The processed embedding data.
 */
async function initializeGuiAndEvents(parsedData) {
  try {
    console.log('[Main] parsedData has window_size:', parsedData?.window_size, 'window_step_size:', parsedData?.window_step_size);

    // Always fetch latest data from data service for all major fields
    // This ensures consistency if data was updated elsewhere, though typically parsedData should be fresh.
    const movieData = await phyloData.get();
    console.log('[Main] movieData from phyloData.get() has window_size:', movieData?.window_size, 'window_step_size:', movieData?.window_step_size);

    const dataToUse = movieData || parsedData; // Fallback to initially parsedData if movieData is somehow null
    console.log('[Main] dataToUse has window_size:', dataToUse?.window_size, 'window_step_size:', dataToUse?.window_step_size);

    // Animation speed is now managed centrally by the store
    // No need to read from DOM or pass to GUI constructor

    // Always use WebGL container
    const webglContainer = document.getElementById('webgl-container');
    if (webglContainer) webglContainer.style.display = 'block';

    // Create GUI with the DeckGL controller
    const TreeController = DeckGLTreeAnimationController;
    console.log('[Main] Using TreeController:', 'DeckGLTreeAnimationController');
    const gui = new Gui(dataToUse, { TreeController });

    // Set the gui instance into the store for global access
    useAppStore.getState().setGui(gui);


    // Debounced resize handler for better performance
    const debouncedResize = debounce(async () => {
      gui.resize();
      await gui.update();
    }, 200);

    window.addEventListener("resize", debouncedResize);

    if (!eventHandlersAttached) {
      eventHandlersAttached = true;
      gui.initializeMovie();
    }

    // Sidebar toggle event handler is now managed by EventHandlerRegistry.js
  } catch (guiError) {
    console.error("[initializeGuiAndEvents] Error:", guiError);
    alert(`Error creating visualization or attaching events: ${guiError.message}`);
    throw guiError;
  }
}


/**
 * Main function to initialize the application after data is parsed.
 * It processes data, ensures UI, and then initializes the GUI and event handlers.
 * @param {Object} parsedData - The validated phyloMovieData from dataManager.
 */
async function initializeAppFromParsedData(parsedData) {
  try {

    const hasMsa = !!(parsedData?.msa && parsedData.msa.sequences && Object.keys(parsedData.msa.sequences).length > 0);
    try {
      document.documentElement.setAttribute('data-has-msa', hasMsa ? 'true' : 'false');
    } catch {}

    // MSA UI state is handled by the React component (ButtonsMSA)

    await initializeGuiAndEvents(parsedData);

    // After components and GUI initialized, compute initial bar height
    updateMovieBarHeightVar();
    // Recompute on resize (debounced resize already updates GUI)
    window.addEventListener('resize', updateMovieBarHeightVar);
  } catch (err) {
    console.error("[initializeAppFromParsedData] Error:", err);
    // Ensure user is alerted about critical failures during app initialization.
    alert(`Critical application initialization error: ${err.message}. Please try refreshing the page.`);
    // Optionally, redirect or attempt recovery if applicable.
  }
}

// MAIN EXECUTION BLOCK for the visualization page
(async () => {
  try {
    // Attempt to get validated phyloMovieData using the dataManager
    const parsedData = await getPhyloMovieData();
    if (!parsedData) {
      // No stored data found. Try to load bundled example data as a fallback.
      try {
        let exampleData = null;

        const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
        const candidates = [
          `${base}example.json`, // correct for GH Pages when base=/repo/
          '/example.json',       // dev server root
          'example.json'         // relative
        ];

        for (const url of candidates) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              exampleData = await resp.json();
              break;
            }
          } catch {}
        }

        if (!exampleData) throw new Error('Example data not available');

        // Set a default file name if missing
        if (!exampleData.file_name) {
          exampleData.file_name = 'example.json';
        }

        // Persist and continue initialization with example data
        await phyloData.set(exampleData);

        const compactFileNameElement = document.getElementById("compactFileName");
        if (compactFileNameElement) {
          compactFileNameElement.textContent = exampleData.file_name;
        }

        await initializeAppFromParsedData(exampleData);
        return; // Done initializing with example data
      } catch (fallbackErr) {
        console.error('[phylo-movies] Failed to load example data fallback:', fallbackErr);
        alert(
          "Error: No visualization data found and example could not be loaded.\n\nRedirecting to the upload form."
        );
        {
          const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
          window.location.href = `${base}index.html`;
        }
        return;
      }
    }


    // Update UI elements with loaded data (file name, embedding status, window size)
    const compactFileNameElement = document.getElementById("compactFileName");
    if (compactFileNameElement) {
      compactFileNameElement.textContent = parsedData.file_name || "Unknown File";
    }




    // Proceed with the main application initialization
    await initializeAppFromParsedData(parsedData);

  } catch (e) {
    // Catch any critical errors during the startup process
    console.error("[phylo-movies] Critical error during page load and data initialization:", e);
    alert(
      `Error during application startup: ${e.message}\n\nAttempting to redirect to the upload form.`
    );
    // As a fallback, try to clear potentially corrupted data and redirect to index.html
    try {
      await phyloData.remove();
    } catch (removeError) {
      console.error("[phylo-movies] Failed to remove phyloMovieData:", removeError);
    }
    {
      const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
      window.location.href = `${base}index.html`;
    }
  }
})();
