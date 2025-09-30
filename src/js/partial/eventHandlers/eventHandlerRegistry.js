import { notifications } from "./notificationSystem.js";
import { useAppStore } from '../../core/store.js';
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
    return {
      // Basic button handlers with simple click actions
      basicButtons: {
        type: "click",
        errorHandling: "log",
        async: true,
        handlers: [
          {
            id: "save-button",
            action: () => this.gui.saveImage(),
            description: "Save Image",
          },
          // React now handles nav toggle in MoviePlayerBar
        ],
      },

      // Position and navigation controls (migrated to React)
      navigationControls: { type: "mixed", errorHandling: "notify", async: true, handlers: [] },

      // Appearance controls are now handled by React component; remove handlers entirely
      appearanceControls: {
        type: "mixed",
        errorHandling: "log",
        async: true,
        handlers: [],
      },

      // Recording controls
      recordingControls: {
        type: "click",
        errorHandling: "notify",
        async: true,
        handlers: [
          {
            id: "start-record",
            action: async () => await this.handleStartRecording(),
            description: "Start screen recording",
          },
          {
            id: "stop-record",
            action: () => this.handleStopRecording(),
            description: "Stop screen recording",
          },
        ],
      },

      // Modal and advanced feature controls
      modalControls: {
        type: "click",
        errorHandling: "notify",
        async: true,
        handlers: [
          {
            id: "compare-sequence-button",
            action: async () => await this.gui.openComparisonModal(),
            description: "Open tree comparison",
          },
          {
            id: "taxa-coloring-button",
            action: () => this.gui.openTaxaColoringWindow(),
            description: "Open taxa coloring",
          },
          {
            id: "open-scatter-plot",
            action: async () => await this.gui.openScatterplotModal(),
            description: "Open scatter plot visualization",
          },
        ],
      },
      // Toggle controls (switches) in buttons panel (migrated to React)
      buttonsToggles: { type: "change", errorHandling: "notify", async: true, handlers: [] },
    };
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
   * @param {ScreenRecorder} recorder - The ScreenRecorder instance
   */
  setRecorder(recorder) {
    // reduced logging
    this.recorder = recorder;
  }

  /**
   * Handle start recording button click
   */
  async handleStartRecording() {
    // reduced logging

    if (!this.recorder) {
      console.error("No recorder instance available");
      notifications.show("Recording not available", "error");
      return;
    }

    if (this.recorder.isRecording) {
      console.warn("Already recording");
      return;
    }

    try {
      await this.recorder.start();
    } catch (error) {
      console.error("Failed to start recording:", error);
      notifications.show("Failed to start recording. Please check your permissions.", "error");
    }
  }

  /**
   * Handle stop recording button click
   */
  handleStopRecording() {
    console.log('[EventHandler] Stop recording button clicked');

    if (!this.recorder) {
      console.error("No recorder instance available");
      return;
    }

    if (!this.recorder.isRecording) {
      console.warn("Not currently recording");
      return;
    }

    this.recorder.stop();
  }

  // Recording UI methods have been moved to ScreenRecorder class in record.js

  /**
   * Update the play/pause button UI based on the current playing state.
   * @param {boolean} isPlaying - The current playing state from the store.
   */
  updatePlayButton(isPlaying) {
      const startButton = document.getElementById('play-button');
      if (startButton) {
          // For a toggle button, we just set its `selected` state.
          // The component handles swapping the icons.
          startButton.selected = isPlaying;
          startButton.setAttribute('title', isPlaying ? 'Pause animation' : 'Play animation');
          startButton.setAttribute('aria-label', isPlaying ? 'Pause animation' : 'Play/Pause animation');
      }
  }
}

export default EventHandlerRegistry;
