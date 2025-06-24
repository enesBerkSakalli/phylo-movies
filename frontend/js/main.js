import Gui from "./gui.js";
import { logEmbeddingEnhanced } from "./log/log.js";
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
  console.log("[phylo-movies] Loading all required HTML partials");

  try {
    await loadAllPartials([

      {
        url: "/partials/tree_navigation.html",
        containerId: "navigation-container",
      },
      {
        url: "/partials/buttons.html",
        containerId: "buttons-container",
      },

      {
        url: "/partials/line-chart.html",
        containerId: "line-chart-container",
      },
      {
        url: "/partials/appearance.html",
        containerId: "appearance-container",
      },
    ]);

    // Verify important elements exist
    const requiredElements = [
      "start-button",
      "stop-button",
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

    console.log("[phylo-movies] All partials loaded successfully");
    return true;
  } catch (err) {
    console.error("[phylo-movies] Failed to load partials:", err);
    return false;
  }
}

/**
 * Processes the embedding data from the parsed phyloMovieData.
 * Transforms list-of-lists embedding to list-of-objects if necessary.
 * @param {Array<Array<number>>|Array<Object>} embeddingData - The embedding data.
 * @returns {Array<Object>} Processed embedding data (list-of-objects).
 */
function processEmbeddingData(embeddingData) {
    embeddingData = Array.isArray(embeddingData) ? embeddingData : [];
    let processedEmbedding = [];
    if (embeddingData && Array.isArray(embeddingData)) {
      if (embeddingData.length > 0) {
        if (Array.isArray(embeddingData[0])) {
          console.log(
            "[Embedding] Transforming list-of-lists to list-of-objects for embedding."
          );
          processedEmbedding = embeddingData.map((point) => ({
            x: point[0],
            y: point[1],
            z: point.length > 2 ? point[2] : 0,
          }));
        } else if (
          typeof embeddingData[0] === "object" &&
          embeddingData[0] !== null &&
          "x" in embeddingData[0] &&
          "y" in embeddingData[0]
        ) {
          console.log(
            "[Embedding] Embedding is already in list-of-objects format."
          );
          processedEmbedding = embeddingData;
        } else {
          console.warn(
            "[Embedding] Unrecognized format for non-empty embedding data."
          );
        }
      }
    }
    logEmbeddingEnhanced(processedEmbedding);
    return processedEmbedding;
}

/**
 * Initializes the GUI, attaches event handlers, and starts the movie.
 * This function assumes that all required HTML partials have been loaded.
 * @param {Object} parsedData - The validated phyloMovieData.
 * @param {Array<Object>} processedEmbedding - The processed embedding data.
 */
async function initializeGuiAndEvents(parsedData, processedEmbedding) {
  try {
    // Always fetch latest data from data service for all major fields
    // This ensures consistency if data was updated elsewhere, though typically parsedData should be fresh.
    const dbData = await phyloData.get();
    const {
      tree_list = [],
      weighted_robinson_foulds_distance_list = [],
      rfd_list = [],
      window_size = 0,
      window_step_size = 0,
      to_be_highlighted = [],
      sorted_leaves = [],
      file_name = "",
      tree_names = [] // Extract tree_names from stored data
    } = dbData || parsedData; // Fallback to initially parsedData if dbData is somehow null

    let colorInternalBranches = true; // Default or configurable setting

    const factorInput = document.getElementById("factor-range");
    const factorValue = factorInput ? parseFloat(factorInput.value) : 1;

    // Create GUI instance
    const gui = new Gui(
      tree_list,
      weighted_robinson_foulds_distance_list,
      rfd_list,
      window_size,
      window_step_size,
      to_be_highlighted,
      sorted_leaves,
      file_name,
      factorValue,
      tree_names // Pass tree_names as the 11th argument
    );

    window.gui = gui;
    window.emb = processedEmbedding; // Make processed embedding globally available

    // Enable MSA synchronization
    gui.syncMSAEnabled = true;
    console.log("MSA synchronization enabled");

    attachMSAButtonHandler(gui);

    const recorder = new ScreenRecorder({
      onStart: () => {
        console.log("Recording started...");
        document.getElementById("start-record").disabled = true;
        document.getElementById("stop-record").disabled = false;
      },
      onStop: (blob) => {
        console.log("Recording stopped.");
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

    window.addEventListener("resize", () => {
      gui.resize();
      gui.update();
    });

    if (!eventHandlersAttached) {
      attachGuiEventHandlers(gui);
      initializeToggles();

      // Add monophyletic coloring toggle handler
      const monophyleticToggle = document.getElementById('monophyletic-coloring');
      if (monophyleticToggle) {
        monophyleticToggle.addEventListener('change', (event) => {
          gui.setMonophyleticColoring(event.target.checked);
        });
      }

      eventHandlersAttached = true;
      gui.initializeMovie();
      gui.play();
    }    } catch (guiError) {
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
    const processedEmbedding = processEmbeddingData(parsedData.embedding);

    const partialsLoaded = await loadAllRequiredPartials();
    if (!partialsLoaded) {
      console.error("[phylo-movies] Failed to load required HTML partials.");
      alert(
        "Error: Failed to load essential interface components. Please refresh the page or check the console."
      );
      return; // Stop further execution if partials failed
    }

    await initializeGuiAndEvents(parsedData, processedEmbedding);

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
console.log("[phylo-movies] Is visualization page:", isVisualizationPage);

if (isVisualizationPage) {
  // Initialization logic for the visualization page (vis.html)
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

      console.log("[phylo-movies] Successfully loaded and validated phyloMovieData via dataManager.");

      // Update UI elements with loaded data (file name, embedding status, window size)
      const fileNameElement = document.querySelector("#fileNameDisplay .file-name");
      if (fileNameElement) {
        fileNameElement.textContent = parsedData.file_name || "Unknown File";
      }

      const embeddingStatusText = document.getElementById("embeddingStatusText");
      if (embeddingStatusText) {
        const embeddingEnabled = parsedData.enable_embedding !== false; // Default to true
        embeddingStatusText.textContent = embeddingEnabled ? "UMAP Embedding" : "Geometric Patterns";
        embeddingStatusText.className = `embedding-type ${embeddingEnabled ? "embedding-umap" : "embedding-geometric"}`;
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
  console.log("[phylo-movies] Setting up form handlers on index page.");

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
      console.log("[phylo-movies] Form submission handler attached to #phylo-form.");
    } else {
      console.warn("[phylo-movies] #phylo-form not found on this page.");
    }
  });
}
