import { notifications } from "./notificationSystem.js";
import { attachSingleHandler as attachSingle, attachHandlerGroup as attachGroup, attachAll as attachEverything, detachAll as detachEverything } from './utils/attachment.js';
import { handleError as handleErrorUtil } from './utils/errorHandling.js';

/**
 * Centralized event handler registry with data-driven configuration
 */
export class EventHandlerRegistry {
  constructor(gui) {
    this.gui = gui;
    // Store objects with {id, type, element, boundAction} to allow for proper removal
    this.attachedHandlers = [];
    this.recorder = null;
  }

  /**
   * Main event handler configurations
   * Each configuration defines how to find and attach handlers
   */
  getEventHandlerConfigs() {
    const reactAppearanceMounted = !!document.querySelector('.appearance-root[data-react-component="appearance"]');
    const reactMSAMounted = !!document.querySelector('[data-react-component="buttons-msa"]');
    // All handlers now managed by React components
    return {};
  }



  /**
   * Handle errors based on configuration
   */
  handleError(error, config, handlerInfo) {
    return handleErrorUtil(this, error, config, handlerInfo);
  }

  // Delegate to utils to keep class slim
  async attachSingleHandler(handler, config) { return attachSingle(this, handler, config); }

  /**
   * Attach handlers for a specific configuration group
   */
  async attachHandlerGroup(config) { return attachGroup(this, config); }

  /**
   * Main method to attach all event handlers using iterator pattern
   */
  async attachAll() { return attachEverything(this); }

  /**
   * Detach all attached handlers (cleanup)
   */
  detachAll() { return detachEverything(this); }

  /**
   * Set the recorder instance for recording functionality
  * @param {Object} recorder - Recorder instance used by the UI controls
   */
  setRecorder(recorder) {
    // reduced logging
    this.recorder = recorder;
  }

  // All logic now lives in components; registry retained for legacy compatibility
}

export default EventHandlerRegistry;
