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

let eventHandlersAttached = false;

/**
 * Asynchronously loads all required HTML partials into their designated containers.
 * It also verifies that critical UI elements are present after loading.
 * @async
 * @function loadAllRequiredPartials
 * @returns {Promise<boolean>} True if all partials are loaded and elements verified, false otherwise.
 */
async function loadAllRequiredPartials() {

  try {
    // Add Material Web typography styles to document
    document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
    await loadAllPartials([
      // tree_navigation.html removed - no navigation-container in visualization.html
      {
        url: "/src/partials/buttons.html",
        containerId: "buttons-container",
      },
      {
        url: "/src/partials/appearance.html",
        containerId: "appearance-container",
      },
      {
        url: "/src/partials/top_scale_bar.html",
        containerId: "top-scale-bar-container",
      },
    {
        url: "/src/partials/movie-player-bar.html",
        containerId: "movie-player-container",
      },
    ]);

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
 * Initializes the GUI, attaches event handlers, and starts the movie.
 * This function assumes that all required HTML partials have been loaded.
 * @param {Object} parsedData - The validated phyloMovieData.
 * @param {Array<Object>} processedEmbedding - The processed embedding data.
 */
async function initializeGuiAndEvents(parsedData) {
  try {
    // Always fetch latest data from data service for all major fields
    // This ensures consistency if data was updated elsewhere, though typically parsedData should be fresh.
    const movieData = await phyloData.get();
    const dataToUse = movieData || parsedData; // Fallback to initially parsedData if movieData is somehow null

    // Animation speed is now managed centrally by the store
    // No need to read from DOM or pass to GUI constructor

    // Show/hide appropriate containers based on store state
    const storeState = useAppStore.getState();
    const { webglEnabled, useDeckGL } = storeState;
    console.log('[Main] Store state:', { webglEnabled, useDeckGL });
    console.log('[Main] WebGL enabled:', webglEnabled, 'UseDeckGL:', useDeckGL);

    if (webglEnabled) {
      document.getElementById('webgl-container').style.display = 'block';
      document.getElementById('application-container').style.display = 'none';
    }

    // Create GUI with conditional controller
    const TreeController = useDeckGL ? DeckGLTreeAnimationController : undefined;
    console.log('[Main] TreeController selected:', TreeController ? 'DeckGLTreeAnimationController' : 'WebGLTreeAnimationController');
    console.log('[Main] TreeController constructor:', TreeController);
    const gui = new Gui(dataToUse, { TreeController });

    // Set the gui instance into the store for global access
    useAppStore.getState().setGui(gui);

    // Create recorder without UI callbacks - EventHandlerRegistry handles UI updates
    const recorder = new ScreenRecorder({
      onStop: () => {
        // Keep the download link creation as it's not UI button management
        const downloadLink = recorder.createDownloadLink();
        document.body.appendChild(downloadLink);
      },
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

    const partialsLoaded = await loadAllRequiredPartials();
    if (!partialsLoaded) {
      alert(
        "Error: Failed to load essential interface components. Please refresh the page or check the console."
      );
      return; // Stop further execution if partials failed
    }

    await initializeGuiAndEvents(parsedData);
  } catch (err) {
    console.error("[initializeAppFromParsedData] Error:", err);
    // Ensure user is alerted about critical failures during app initialization.
    alert(`Critical application initialization error: ${err.message}. Please try refreshing the page.`);
    // Optionally, redirect or attempt recovery if applicable.
  }
}

// MAIN EXECUTION BLOCK
// Determines if the current page is the visualization page or the index/upload page.
const isVisualizationPage =
  document.getElementById("application-container") !== null;

if (isVisualizationPage) {
  // Initialization logic for the visualization page (visualization.html)
  // This IIFE (Immediately Invoked Function Expression) is async to use await for data loading.
  (async () => {
    try {
      // Attempt to get validated phyloMovieData using the dataManager
      const parsedData = await getPhyloMovieData();
      if (!parsedData) {
        // If no data or data is invalid, alert the user and redirect to the upload page.
        alert(
          "Error: No visualization data found or data is invalid.\n\nRedirecting to the upload form."
        );
        window.location.href = "/index.html";
        return; // Stop further execution on this page
      }


      // Update UI elements with loaded data (file name, embedding status, window size)
      const compactFileNameElement = document.getElementById("compactFileName");
      if (compactFileNameElement) {
        compactFileNameElement.textContent = parsedData.file_name || "Unknown File";
      }


      const windowSizeDisplay = document.getElementById("windowSizeDisplay");
      if (windowSizeDisplay) {
        windowSizeDisplay.textContent = `Window-Size: ${
          parsedData.window_size || "N/A"
        } / Step-Size: ${parsedData.window_step_size || "N/A"}`;
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
      window.location.href = "/index.html";
    }
  })();
} else {
  // Setup for the index.html page (upload form)

  // Attach event listener to the phylo-form once the DOM is fully loaded.
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("phylo-form");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent default form submission
        const formData = new FormData(form);
        // Call fetchTreeData from dataManager to process the form and redirect.
        // Errors are handled within fetchTreeData.
        await fetchTreeData(formData);
      });
    } else {
      console.warn("[phylo-movies] #phylo-form not found on this page.");
    }
  });
}
