import Gui from "./gui.js";
import { logEmbeddingEnhanced } from "./log/log.js";
import "./msaViewer/index.jsx";
import {
  attachGuiEventHandlers,
  attachMSAButtonHandler,
  attachRecorderEventHandlers,
  toggleSubmenu,
  initializeToggles,
} from "./partial/eventHandlers.js";
import { loadAllPartials } from "./partial/loadPartials.js";
import { ScreenRecorder } from "./record/record.js";

import localforage from 'localforage';
import { fetchTreeData } from "./fetch.js";

let eventHandlersAttached = false;

// New function to load all partials before GUI initialization
async function loadAllRequiredPartials() {
  console.log("[phylo-movies] Loading all required HTML partials");

  try {
    await loadAllPartials([
      {
        url: "/partials/line-chart.html",
        containerId: "line-chart-container",
      },
      {
        url: "/partials/buttons.html",
        containerId: "buttons-container",
      },
      {
        url: "/partials/tree_navigation.html",
        containerId: "navigation-container",
      },
      {
        url: "/partials/appearance.html",
        containerId: "appearance-container",
      },
      {
        url: "/partials/scaleBar.html",
        containerId: "scale-bar-container",
      },
      {
        url: "/partials/msa-button.html",
        containerId: "msa-button-container",
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
      "factor",
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
      // Fail if any required element is missing
      console.warn(
        "Missing UI elements after loading partials:",
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

function initializeAppFromParsedData(parsedData) {
  try {
    console.log("[DEBUG] Starting deep inspection of parsedData:");

    // Process embedding data
    let processedEmbedding = [];
    if (parsedData.embedding && Array.isArray(parsedData.embedding)) {
      if (parsedData.embedding.length > 0) {
        if (Array.isArray(parsedData.embedding[0])) {
          console.log(
            "[Embedding] Transforming list-of-lists to list-of-objects for embedding."
          );
          processedEmbedding = parsedData.embedding.map((point) => ({
            x: point[0],
            y: point[1],
            z: point.length > 2 ? point[2] : 0,
          }));
        } else if (
          typeof parsedData.embedding[0] === "object" &&
          parsedData.embedding[0] !== null &&
          "x" in parsedData.embedding[0] &&
          "y" in parsedData.embedding[0]
        ) {
          console.log(
            "[Embedding] Embedding is already in list-of-objects format."
          );
          processedEmbedding = parsedData.embedding;
        } else {
          console.warn(
            "[Embedding] Unrecognized format for non-empty embedding data."
          );
        }
      }
    }

    logEmbeddingEnhanced(processedEmbedding);

    // Load all partials first, then initialize the GUI
    loadAllRequiredPartials().then((success) => {
      if (!success) {
        console.error("[phylo-movies] Failed to load required partials");
        alert(
          "Error: Failed to load interface elements. Please refresh the page."
        );
        return;
      }

      console.log("[DEBUG] All partials loaded, now initializing GUI");


      try {
        // Always fetch latest data from IndexedDB/localForage for all major fields
        (async () => {
          const dbData = await localforage.getItem("phyloMovieData");
          const {
            tree_list = [],
            weighted_robinson_foulds_distance_list = [],
            rfd_list = [],
            window_size = 0,
            window_step_size = 0,
            to_be_highlighted = [],
            sorted_leaves = [],
            file_name = "",
          } = dbData || parsedData;

          let colorInternalBranches = true;

          const factorInput = document.getElementById("factor");
          const factorValue = factorInput ? parseInt(factorInput.value, 10) : 0.5;
          console.log(to_be_highlighted);
          // Create GUI instance after all partials are loaded
          const gui = new Gui(
            tree_list,
            weighted_robinson_foulds_distance_list,
            rfd_list,
            window_size,
            window_step_size,
            to_be_highlighted,
            sorted_leaves,
            colorInternalBranches,
            file_name,
            factorValue
          );

          console.log("[DEBUG] Gui instance created successfully");
          window.gui = gui;
          window.emb = processedEmbedding;

          // The Gui class instance (gui) now has its own syncMSAIfOpen method
          // that dispatches the 'msa-sync-request' event.
          // No need to override it here. The call within gui.update() will use the class method.

          // Attach MSA button handler ONCE after GUI is created
          attachMSAButtonHandler(gui);

          // Initialize screen recorder
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

          // Attach event handlers and initialize movie
          if (!eventHandlersAttached && gui) {
            attachGuiEventHandlers(gui);
            initializeToggles(); // Initialize submenu toggles after main GUI handlers
            eventHandlersAttached = true;
            gui.initializeMovie();
            gui.play();
          }
        })();
      } catch (guiError) {
        console.error("[DEBUG] Error creating Gui instance:", guiError);
        alert(`Error creating visualization: ${guiError.message}`);
      }
    });
  } catch (err) {
    console.error(
      "[DEBUG] Top-level error in initializeAppFromParsedData:",
      err
    );
    alert(`Initialization error: ${err.message}`);
  }
}

// MAIN EXECUTION BLOCK
const isVisualizationPage =
  document.getElementById("application-container") !== null;
console.log("[phylo-movies] Is visualization page:", isVisualizationPage);

if (isVisualizationPage) {
  (async () => {
    const storedData = await localforage.getItem("phyloMovieData");
    console.log(
      "[phylo-movies] IndexedDB phyloMovieData:",
      storedData ? "Data found" : "No data"
    );

    if (!storedData) {
      console.warn(
        "[phylo-movies] No phyloMovieData in IndexedDB, redirecting to index.html"
      );
      alert(
        "Error: No visualization data found in browser storage.\n\nRedirecting to the upload form."
      );
      window.location.href = "/index.html";
    } else {
      try {
        const parsedData = storedData;
        console.log("[phylo-movies] Successfully loaded phyloMovieData from IndexedDB");

        const requiredFields = [
          "tree_list",
          "weighted_robinson_foulds_distance_list",
          "rfd_list",
          "window_size",
          "window_step_size",
          "to_be_highlighted",
          "sorted_leaves",
          "file_name",
          "embedding",
        ];
        const missingFields = requiredFields.filter((f) => !(f in parsedData));

        if (missingFields.length > 0) {
          console.error("[phylo-movies] Missing required fields:", missingFields);
          await localforage.removeItem("phyloMovieData");
          alert(
            `Error: Missing required data fields: ${missingFields.join(", ")}\n\nRedirecting to the upload form.`
          );
          window.location.href = "/index.html";
        } else {
          // Update file name in the dedicated element
          const fileNameElement = document.querySelector("#fileNameDisplay .file-name");
          if (fileNameElement) {
            fileNameElement.textContent = parsedData.file_name || "Unknown File";
          }

          // Update embedding status
          const embeddingStatusText = document.getElementById("embeddingStatusText");
          if (embeddingStatusText) {
            const embeddingEnabled = parsedData.enable_embedding !== false; // Default to true if not specified
            if (embeddingEnabled) {
              embeddingStatusText.textContent = "UMAP Embedding";
              embeddingStatusText.className = "embedding-type embedding-umap";
            } else {
              embeddingStatusText.textContent = "Geometric Patterns";
              embeddingStatusText.className = "embedding-type embedding-geometric";
            }
          }

          const windowSizeDisplay = document.getElementById("windowSizeDisplay");
          if (windowSizeDisplay) {
            windowSizeDisplay.textContent = `Window-Size: ${
              parsedData.window_size || ""
            } / Step-Size: ${parsedData.window_step_size || ""}`;
          }

          console.log("[phylo-movies] Initializing visualization");
          initializeAppFromParsedData(parsedData);
        }
      } catch (e) {
        console.error("[phylo-movies] Failed to load phyloMovieData from IndexedDB:", e);
        await localforage.removeItem("phyloMovieData");
        alert(
          `Error: Failed to parse visualization data: ${e.message}\n\nRedirecting to the upload form.`
        );
        window.location.href = "/index.html";
      }
    }
  })();
} else {
  // On index.html page, set up form handling
  console.log("[phylo-movies] Setting up form handlers on index page");

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("phylo-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        await fetchTreeData(formData);
      });
      console.log("[phylo-movies] Form submission handler attached");
    }
  });
}
