import Gui from "./gui.js";
import { useAppStore } from './store.js';

import "./msaViewer/init.ts";
import {
  attachGuiEventHandlers,
  attachMSAButtonHandler,
  attachRecorderEventHandlers,
  initializeToggles,
} from "./partial/eventHandlers.js";
import { loadAllPartials } from "./partial/loadPartials.js";
import { ScreenRecorder } from "./record/record.js";
import { phyloData } from './services/dataService.js';
import { getPhyloMovieData, fetchTreeData } from "./dataManager.js";

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
    await loadAllPartials([

      {
        url: "/src/partials/tree_navigation.html",
        containerId: "navigation-container",
      },
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
      "start-button",
      "forward-button",
      "backward-button",
      "save-button",
      "forwardStepButton",
      "backwardStepButton",
      "compare-sequence-button",
      "chart-modal",
      "taxa-coloring-button",
      "factor-range",
      "branch-length",
      "font-size",
      "stroke-width",
      "barPlotOption",
      "positionButton",
      "positionValue",
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

    const factorInput = document.getElementById("factor-range");
    let factorValue = factorInput ? parseFloat(factorInput.value) : 1;
    if (isNaN(factorValue) || factorValue < 0.1 || factorValue > 5) {
      factorValue = 1;
      if (factorInput) factorInput.value = factorValue;
    }

    function updateSpeedValueDisplay(value) {
      const speedValue = document.querySelector('.speed-value');
      if (speedValue) {
        speedValue.textContent = `${value.toFixed(1)}×`;
      }
    }
    updateSpeedValueDisplay(factorValue);
    // Create GUI instance with the whole MovieData object
    const gui = new Gui(dataToUse, factorValue);

    // Set the gui instance into the store for global access
    useAppStore.getState().setGui(gui);

    attachMSAButtonHandler(gui);

    const recorder = new ScreenRecorder({
      onStart: () => {
        document.getElementById("start-record").disabled = true;
        document.getElementById("stop-record").disabled = false;
      },
      onStop: () => {
        const downloadLink = recorder.createDownloadLink();
        document.body.appendChild(downloadLink);
        document.getElementById("start-record").disabled = false;
        document.getElementById("stop-record").disabled = true;
      },
      onError: (error) => {
        console.error("Recording error:", error);
        alert("Recording error: " + error.message);
        document.getElementById("start-record").disabled = false;
        document.getElementById("stop-record").disabled = true;
      },
    });
    attachRecorderEventHandlers(recorder);

    window.addEventListener("resize", async () => {
      gui.resize();
      await gui.update();
    });

    if (!eventHandlersAttached) {
      await attachGuiEventHandlers(gui);
      initializeToggles();

      // Monophyletic coloring toggle handler is now managed by EventHandlerRegistry
      eventHandlersAttached = true;
      console.log('[main.js] Calling gui.initializeMovie()...');
      gui.initializeMovie();
      console.log('[main.js] gui.initializeMovie() called.');
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
      console.error("[phylo-movies] Failed to load required HTML partials.");
      alert(
        "Error: Failed to load essential interface components. Please refresh the page or check the console."
      );
      return; // Stop further execution if partials failed
    }

    console.log('[main.js] Initializing GUI and events...');
    await initializeGuiAndEvents(parsedData);
    console.log('[main.js] GUI and events initialized.');

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
        console.warn(
          "[phylo-movies] No valid phyloMovieData found, redirecting to index.html"
        );
        alert(
          "Error: No visualization data found or data is invalid.\n\nRedirecting to the upload form."
        );
        window.location.href = "/index.html";
        return; // Stop further execution on this page
      }


      // Update UI elements with loaded data (file name, embedding status, window size)
      const fileNameElement = document.querySelector("#fileNameDisplay .file-name");
      if (fileNameElement) {
        fileNameElement.textContent = parsedData.file_name || "Unknown File";
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
