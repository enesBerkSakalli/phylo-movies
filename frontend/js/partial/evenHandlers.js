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
export function attachGuiEventHandlers(gui) {
  if (!gui) {
    console.error("GUI instance is required for event handlers");
    return;
  }

  try {
    const guiHandlers = new GuiEventHandlers(gui);
    guiHandlers.attachAll();
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
 * @param {ScreenRecorder} recorder
 */
export function attachRecorderEventHandlers(recorder) {
  if (!recorder) {
    console.error("Recorder instance is required for event handlers");
    return;
  }

  try {
    const recorderHandlers = new RecorderHandlers(recorder);
    recorderHandlers.attachAll();
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

  // Attach single event handler
  newMsaBtn.addEventListener("click", async () => {
    console.log("MSA button clicked");

    let msaData = localStorage.getItem("phyloMovieMSAData");
    if (!msaData) {
      console.log("No MSA data in localStorage, fetching from backend...");
      msaData = await fetchMSAFromBackend();
      if (!msaData) {
        alert("No alignment data available. Please upload an MSA file.");
        return;
      }
    }

    // Get highlighted taxa from the current tree if gui is available
    const highlightedTaxa = gui ? Array.from(gui.marked || []) : [];

    // Calculate position based on window step size if gui is available
    let currentPosition = 0;
    let windowInfo = null;

    if (gui) {
      const treeIndex = Math.floor(gui.index / 5);
      currentPosition = (treeIndex + 1) * gui.windowStepSize;

      // Safely call getCurrentWindow if it exists
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

    console.log("Opening MSA viewer with:", {
      highlightedTaxa,
      currentPosition,
      windowInfo,
    });

    // Dispatch event to open MSA viewer
    window.dispatchEvent(
      new CustomEvent("open-msa-viewer", {
        detail: { highlightedTaxa, position: currentPosition, windowInfo },
      })
    );
  });

  // Update the status text
  if (msaStatus) {
    const hasMSAData = localStorage.getItem("phyloMovieMSAData") !== null;
    const statusElement = msaStatus.querySelector(".info-value");
    if (statusElement) {
      statusElement.textContent = hasMSAData
        ? "Alignment data available"
        : "No alignment data loaded";
    }
  }

  console.log("MSA button handler attached successfully");
}

// Export notification system for use by other modules
export { notifications };

// Backwards compatibility - make toggle function available globally
window.toggleSubmenu = toggleSubmenu;

// Initialize toggles when this module loads
initializeToggles();
