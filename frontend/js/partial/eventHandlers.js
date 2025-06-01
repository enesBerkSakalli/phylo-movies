import { GuiEventHandlers } from "./eventHandlers/guiEventHandlers.js";
import { RecorderHandlers } from "./eventHandlers/recorderHandlers.js";
import { SubmenuHandlers } from "./eventHandlers/submenuHandlers.js";
import { notifications } from "./eventHandlers/notificationSystem.js";
import "./eventHandlers/buttonStyles.js";

/**
 * Main event handler coordination
 * This file now acts as a facade for the modular event handling system
 */

/**
 * Attach GUI event handlers (buttons, sliders, etc) to the main GUI instance.
 * @param {Gui} gui
 */
// Store handler instances at module scope for cleanup
let guiHandlersInstance = null;
let recorderHandlersInstance = null;

/**
 * Attach GUI event handlers (buttons, sliders, etc) to the main GUI instance.
 * Cleans up previous handlers before attaching new ones.
 * @param {Gui} gui
 */
export function attachGuiEventHandlers(gui) {
  if (!gui) {
    console.error("GUI instance is required for event handlers");
    return;
  }
  try {
    // Clean up previous handlers if any
    if (guiHandlersInstance && typeof guiHandlersInstance.cleanup === "function") {
      guiHandlersInstance.cleanup();
    }
    guiHandlersInstance = new GuiEventHandlers(gui);
    guiHandlersInstance.attachAll();
    console.log("GUI event handlers attached successfully");
  } catch (error) {
    console.error("Error attaching GUI event handlers:", error);
    notifications.show(
      "Error setting up interface controls: " + error.message,
      "error"
    );
  }
}


/**
 * Attach event handlers for the screen recorder controls.
 * Cleans up previous handlers before attaching new ones.
 * @param {ScreenRecorder} recorder
 */
export function attachRecorderEventHandlers(recorder) {
  if (!recorder) {
    console.error("Recorder instance is required for event handlers");
    return;
  }
  try {
    // Clean up previous handlers if any
    if (recorderHandlersInstance && typeof recorderHandlersInstance.cleanup === "function") {
      recorderHandlersInstance.cleanup();
    }
    recorderHandlersInstance = new RecorderHandlers(recorder);
    recorderHandlersInstance.attachAll();
    console.log("Recorder event handlers attached successfully");
  } catch (error) {
    console.error("Error attaching recorder event handlers:", error);
    notifications.show(
      "Error setting up recording controls: " + error.message,
      "error"
    );
  }
}

/**
 * Toggle a submenu open/closed by id.
 * @param {string} submenuId
 * @param {string} toggleIconId
 */
export function toggleSubmenu(submenuId, toggleIconId) {
  SubmenuHandlers.toggle(submenuId, toggleIconId);
}

/**
 * Initialize all toggleable elements on the page
 */
export function initializeToggles() {
  try {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => SubmenuHandlers.initializeAll(), 100);
      });
    } else {
      // DOM is already ready, but give a small delay for dynamic content
      setTimeout(() => SubmenuHandlers.initializeAll(), 100);
    }
    console.log("Submenu toggles initialization scheduled");
  } catch (error) {
    console.error("Error initializing toggles:", error);
    notifications.show(
      "Error setting up menu toggles: " + error.message,
      "error"
    );
  }
}

export function attachMSAButtonHandler(gui) {
  const msaBtn = document.getElementById("msa-viewer-btn");
  const msaStatus = document.getElementById("msa-status");

  if (!msaBtn) {
    console.warn("MSA button not found in DOM");
    return;
  }

  // Remove any existing event listeners to prevent duplicates
  const newMsaBtn = msaBtn.cloneNode(true);
  msaBtn.parentNode.replaceChild(newMsaBtn, msaBtn);


  // Ensure localforage is loaded and available (robust for all module systems)
  function getLocalForage() {
    if (window.localforage) return Promise.resolve(window.localforage);
    // Try to import if not present (support both ESM and CJS)
    if (typeof require === 'function') {
      try {
        const lf = require('localforage');
        window.localforage = lf.default || lf;
        return Promise.resolve(window.localforage);
      } catch (e) {}
    }
    // fallback to dynamic import
    return import('localforage').then((mod) => {
      window.localforage = mod.default || mod;
      return window.localforage;
    });
  }

  // Attach single event handler
  newMsaBtn.addEventListener("click", async () => {
    console.log("MSA button clicked");

    // Get MSA data from localForage
    let msaData = null;
    let localforageInstance = await getLocalForage();
    try {
      msaData = await localforageInstance.getItem("phyloMovieMSAData");
    } catch (e) {
      console.error("Error reading MSA data from localForage:", e);
    }
    
    if (!msaData) {
      alert("No alignment data available. Please upload an MSA file.");
      return;
    }

    // Get GUI context for sync information
    const highlightedTaxa = gui ? Array.from(gui.marked || []) : [];
    let currentPosition = 0;
    let windowInfo = null;

    if (gui) {
      const treeIndex = Math.floor(gui.index / 5);
      currentPosition = (treeIndex + 1) * gui.windowStepSize;

      if (typeof gui.getCurrentWindow === "function") {
        const window = gui.getCurrentWindow();
        windowInfo = {
          windowStart: window.startPosition,
          windowEnd: window.endPosition,
        };
      } else if (gui.windowStart && gui.windowEnd) {
        windowInfo = {
          windowStart: gui.windowStart,
          windowEnd: gui.windowEnd,
        };
      }
    }

    // Open MSA viewer
    window.dispatchEvent(
      new CustomEvent("open-msa-viewer", {
        detail: { highlightedTaxa, position: currentPosition, windowInfo },
      })
    );
  });

  // Update the status text (async, but don't use await at top level)
  if (msaStatus) {
    getLocalForage().then((localforageInstance) => {
      return localforageInstance.getItem("phyloMovieMSAData");
    }).then((data) => {
      const hasMSAData = !!data;
      const statusElement = msaStatus.querySelector(".info-value");
      if (statusElement) {
        statusElement.textContent = hasMSAData
          ? "Alignment data available"
          : "No alignment data loaded";
      }
    }).catch((e) => {
      console.error("Error checking MSA data in localForage:", e);
    });
  }

  console.log("MSA button handler attached successfully");
}

// Export notification system for use by other modules
export { notifications };