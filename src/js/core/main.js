import Gui from "../controllers/gui.js";
import { useAppStore } from './store.js';
import { debounce } from '../utils/debounce.js';
import 'winbox/dist/css/winbox.min.css';
import { DeckGLTreeAnimationController } from '../treeVisualisation/DeckGLTreeAnimationController.js';

// Import Material Web components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/elevated-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/switch/switch.js';
import '@material/web/slider/slider.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/chips/suggestion-chip.js';
import '@material/web/divider/divider.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/progress/linear-progress.js';

// Import Material Web typography styles
import {styles as typescaleStyles} from '@material/web/typography/md-typescale-styles.js';

import {
  attachGuiEventHandlers,
  attachRecorderEventHandlers,
} from "../partial/eventHandlers.js";
import { loadAllPartials } from "../partial/loadPartials.js";
import { ScreenRecorder } from "../services/record.js";
import { phyloData } from '../services/dataService.js';
import { getPhyloMovieData, fetchTreeData } from "../services/dataManager.js";
import { notifications } from '../partial/eventHandlers/notificationSystem.js';
import { initializeTheme } from './theme.js';

let eventHandlersAttached = false;

// Initialize theme as early as possible
initializeTheme();

/**
 * Asynchronously loads all required HTML partials into their designated containers.
 * It also verifies that critical UI elements are present after loading.
 * @async
 * @function loadAllRequiredPartials
 * @returns {Promise<boolean>} True if all partials are loaded and elements verified, false otherwise.
 */
async function loadAllRequiredPartials(hasMsa = true) {

  try {
    // Add Material Web typography styles to document
    document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
    const partials = [
      // tree_navigation.html removed - no navigation-container in visualization.html
      { url: "/src/partials/buttons-file-ops.html", containerId: "buttons-file-container" },
      { url: "/src/partials/appearance.html", containerId: "appearance-container" },
      { url: "/src/partials/top_scale_bar.html", containerId: "top-scale-bar-container" },
      { url: "/src/partials/movie-player-bar.html", containerId: "movie-player-container" },
    ];

    if (hasMsa) {
      partials.splice(1, 0, { url: "/src/partials/buttons-msa.html", containerId: "buttons-msa-container" });
    }

    await loadAllPartials(partials);

    // Verify important elements exist
    const requiredElements = [
      "play-button",
      "forward-button",
      "backward-button",
      "save-button",
      "forwardStepButton",
      "backwardStepButton",
      "compare-sequence-button",
      "chart-modal",
      "taxa-coloring-button",
      "animation-speed-range",
      "branch-length-options",
      "font-size",
      "stroke-width",
      "barPlotOption",
      "lineChart",
    ];

    const missingElements = requiredElements.filter(
      (id) => !document.getElementById(id)
    );

    if (missingElements.length > 0) {
      // If any required element is missing, log a warning and return false.
      // This indicates a potential issue with the HTML partials or the expected page structure.
      console.warn(
        `[phylo-movies] Critical UI elements are missing after attempting to load partials.
        The application may not function correctly. Missing elements: ${missingElements.join(", ")}.
        Please check the HTML partial files and their container IDs.`,
        missingElements
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[phylo-movies] Failed to load partials:", err);
    return false;
  }
}

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


    const recorder = new ScreenRecorder({
      notifications: notifications,
      autoSave: false // Manual save prompting is handled by the recorder
    });

    // Debounced resize handler for better performance
    const debouncedResize = debounce(async () => {
      gui.resize();
      await gui.update();
    }, 200);

    window.addEventListener("resize", debouncedResize);

    if (!eventHandlersAttached) {
      await attachGuiEventHandlers(gui);

      // IMPORTANT: Set recorder AFTER eventHandlerRegistry is initialized
      attachRecorderEventHandlers(recorder);

      // Monophyletic coloring toggle handler is now managed by EventHandlerRegistry
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
 * It processes data, loads partials, and then initializes the GUI and event handlers.
 * @param {Object} parsedData - The validated phyloMovieData from dataManager.
 */
async function initializeAppFromParsedData(parsedData) {
  try {

    const hasMsa = !!(parsedData?.msa && parsedData.msa.sequences && Object.keys(parsedData.msa.sequences).length > 0);
    try {
      document.documentElement.setAttribute('data-has-msa', hasMsa ? 'true' : 'false');
    } catch {}
    const partialsLoaded = await loadAllRequiredPartials(hasMsa);
    if (!partialsLoaded) {
      alert(
        "Error: Failed to load essential interface components. Please refresh the page or check the console."
      );
      return; // Stop further execution if partials failed
    }

    // Hide MSA-related UI if no MSA data is present
    try {
      if (!hasMsa) {
        // Hide MSA controls group and header
        const msaGroup = document.getElementById('msa-controls');
        if (msaGroup) {
          // Hide the entire group and the header above it
          msaGroup.hidden = true;
          const header = msaGroup.previousElementSibling;
          if (header && header.classList?.contains('msa-header')) header.hidden = true;
        }
        // Hide the status chips (No alignment / Alignment loaded)
        const msaChips = document.getElementById('msa-status-chips');
        if (msaChips) msaChips.hidden = true;
        // Hide the timeline MSA window chip if present
        const msaWindowChip = document.getElementById('msa-window-chip');
        if (msaWindowChip) msaWindowChip.hidden = true;
      }
    } catch {}

    await initializeGuiAndEvents(parsedData);

    // After partials and GUI initialized, compute initial bar height
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
