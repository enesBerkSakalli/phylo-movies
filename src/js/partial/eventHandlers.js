import { EventHandlerRegistry } from "./eventHandlers/eventHandlerRegistry.js";
import { notifications } from "./eventHandlers/notificationSystem.js";

/**
 * Main event handler coordination
 * This file now acts as a facade for the modular event handling system
 */

/**
 * Attach GUI event handlers (buttons, sliders, etc) to the main GUI instance.
 * @param {Gui} gui
 */
// Store handler instance at module scope for cleanup
let eventRegistryInstance = null;

/**
 * Attaches GUI event handlers (buttons, sliders, etc.) to the main GUI instance.
 * This function ensures that any previously attached GUI handlers are cleaned up
 * before new ones are attached, preventing duplicate listeners.
 * @param {Gui} gui - The main GUI instance to which event handlers will be attached.
 *                    It should provide methods that handlers can call (e.g., `gui.play()`).
 * @returns {Promise<void>}
 */
export async function attachGuiEventHandlers(gui) {
  if (!gui) {
    console.error("GUI instance is required for event handlers");
    return;
  }
  try {
    // Clean up previous handlers if any
    if (eventRegistryInstance && typeof eventRegistryInstance.detachAll === "function") {
      eventRegistryInstance.detachAll();
    }
    eventRegistryInstance = new EventHandlerRegistry(gui);
    await eventRegistryInstance.attachAll();
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
 * Attaches event handlers for the screen recorder controls.
 * This function sets the recorder instance on the EventHandlerRegistry.
 * The recording button handlers are already attached via EventHandlerRegistry.attachAll().
 * @param {ScreenRecorder} recorder - The ScreenRecorder instance.
 * @returns {void}
 */
export function attachRecorderEventHandlers(recorder) {
  if (!recorder) {
    console.error("Recorder instance is required for event handlers");
    return;
  }
  try {
    // Set the recorder instance on the existing EventHandlerRegistry
    if (eventRegistryInstance) {
      eventRegistryInstance.setRecorder(recorder);
      console.log("Recorder instance set on EventHandlerRegistry successfully");
    } else {
      console.warn("EventHandlerRegistry not initialized yet. Recording buttons may not work.");
    }
  } catch (error) {
    console.error("Error setting up recorder:", error);
    notifications.show(
      "Error setting up recording controls: " + error.message,
      "error"
    );
  }
}

/**
 * Attaches an event handler to the MSA (Multiple Sequence Alignment) viewer button.
 * This handler, when clicked, attempts to retrieve MSA data using dataService
 * and then dispatches an event to open the MSA viewer with relevant context
 * (highlighted taxa, current position, window information from the GUI).
 * It also updates a status element to indicate if MSA data is available.
 * @param {Gui} gui - The main GUI instance, used to get context for the MSA viewer.
 * @returns {void}
 */
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

    // Get MSA data using dataService directly
    const { msaData } = await import('../services/dataService.js');
    const data = await msaData.get();

    if (!data) {
      console.warn("[attachMSAButtonHandler] No MSA data found.");
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
    import('../services/dataService.js').then(async ({ msaData }) => {
      const data = await msaData.get();
      const hasMSAData = !!data;
      const statusElement = msaStatus.querySelector(".info-value");
      if (statusElement) {
        statusElement.textContent = hasMSAData
          ? "Alignment data available"
          : "No alignment data loaded";
      }
    }).catch(e => {
      console.error("[attachMSAButtonHandler] Error updating MSA status text:", e);
    });
  }

  console.log("MSA button handler attached successfully");
}

// Export notification system for use by other modules
export { notifications };
