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

// Removed attachMSAButtonHandler - now handled by EventHandlerRegistry

// Export notification system for use by other modules
export { notifications };
