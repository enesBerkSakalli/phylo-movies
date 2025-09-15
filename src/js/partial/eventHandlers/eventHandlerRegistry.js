import { notifications } from "./notificationSystem.js";
import { useAppStore } from '../../core/store.js';
import { calculateWindow } from '../../utils/windowUtils.js';
import { handlePlayButtonClick } from './handlers/handlePlayButtonClick.js';
import { handleAnimationSpeedChange } from './handlers/handleAnimationSpeedChange.js';
import { handleOpenMSAViewer } from './handlers/handleOpenMSAViewer.js';
import { handleToggleCameraMode } from './handlers/handleToggleCameraMode.js';
import { handleTrailsToggle } from './handlers/handleTrailsToggle.js';
import { handleTrailLengthChange } from './handlers/handleTrailLengthChange.js';
import { handleTrailOpacityChange } from './handlers/handleTrailOpacityChange.js';
import { handleTrailThicknessChange } from './handlers/handleTrailThicknessChange.js';
import { attachSingleHandler as attachSingle, attachHandlerGroup as attachGroup, attachAll as attachEverything, detachAll as detachEverything } from './utils/attachment.js';
import { handleToggleNavigation } from './handlers/handleToggleNavigation.js';
import { handleError as handleErrorUtil } from './utils/errorHandling.js';
import { handleDimmingToggle } from './handlers/handleDimmingToggle.js';
import { handleBranchLengthOptions } from './handlers/handleBranchLengthOptions.js';
import { handleMonophyleticColoring } from './handlers/handleMonophyleticColoring.js';
import { handleStrokeWidthChange } from './handlers/handleStrokeWidthChange.js';
import { handleFontSizeChange } from './handlers/handleFontSizeChange.js';
import { handleMarkedComponentsToggle } from './handlers/handleMarkedComponentsToggle.js';
import { handleActiveChangeEdgesToggle } from './handlers/handleActiveChangeEdgesToggle.js';
import { handleMSASyncToggle } from './handlers/handleMSASyncToggle.js';
import { getMSAFrameIndex } from '../../core/IndexMapping.js';

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
    return {
      // Basic button handlers with simple click actions
      basicButtons: {
        type: "click",
        errorHandling: "log",
        async: true,
        handlers: [
          {
            id: "play-button",
            action: async () => {
              await handlePlayButtonClick(this.gui, this.updatePlayButton.bind(this));
            },
            description: "Toggle play/pause",
          },
          {
            id: "forward-button",
            action: async () => {
              const { forward } = useAppStore.getState();
              forward();
            },
            description: "Step forward",
          },
          {
            id: "backward-button",
            action: async () => {
              const { backward } = useAppStore.getState();
              backward();
            },
            description: "Step backward",
          },
          {
            id: "save-button",
            action: () => this.gui.saveImage(),
            description: "Save Image",
          },
          {
            id: "forwardStepButton",
            action: async () => {
              const { currentTreeIndex, movieData, goToPosition } = useAppStore.getState();
              if (currentTreeIndex < movieData.interpolated_trees.length - 1) {
                goToPosition(currentTreeIndex + 1); // Only call store action - let subscription handle update
              }
            },
            description: "Next tree",
          },
          {
            id: "backwardStepButton",
            action: async () => {
              const { currentTreeIndex, goToPosition } = useAppStore.getState();
              if (currentTreeIndex > 0) {
                goToPosition(currentTreeIndex - 1); // Only call store action - let subscription handle update
              }
            },
            description: "Previous tree",
          },
          {
            id: "nav-toggle-button",
            action: () => handleToggleNavigation(),
            description: "Toggle navigation panel visibility",
          },
        ],
      },

      // Position and navigation controls
      navigationControls: {
        type: "mixed",
        errorHandling: "notify",
        async: true,
        handlers: [
          {
            id: "animation-speed-range",
            type: "input",
            action: (event) => handleAnimationSpeedChange(event),
            description: "Animation speed change (range input)",
          },
        ],
      },

      // Appearance and styling controls
      appearanceControls: {
        type: "mixed",
        errorHandling: "log",
        async: true,
        handlers: [
          // Removed - handled by ChartController.bindBarOptionSelectListeners()
          {
            id: "branch-length-options",
            type: "change",
            action: async (event) => await handleBranchLengthOptions(event),
            description: "Branch length options selector",
          },
          {
            id: "font-size",
            type: "input",
            action: async (event) => {
              // Get the treeController from the store here
              const { treeController } = useAppStore.getState();
              // Pass it to the handler function
              await handleFontSizeChange(event, treeController);
            },
            description: "Font size adjustment - optimized",
          },
          {
            id: "stroke-width",
            type: "input",
            action: async (event) => await handleStrokeWidthChange(event),
            description: "Stroke width adjustment",
          },
          {
            id: "monophyletic-coloring",
            type: "change",
            action: async () => await handleMonophyleticColoring(),
            description: "Monophyletic group coloring toggle",
          },

          {
            id: "camera-mode-button",
            type: "click",
            action: async () => await handleToggleCameraMode(),
            description: "Toggle camera mode between orthographic and orbit",
          },
          {
            id: "active-change-edges-toggle",
            type: "change",
            action: async () => await handleActiveChangeEdgesToggle(),
            description: "Toggle active change edges highlighting",
          },
          {
            id: "active-change-edges-color",
            type: "input",
            action: async (event) => {
              const { setActiveChangeEdgeColor } = useAppStore.getState();
              const newColor = event.target.value;
              setActiveChangeEdgeColor(newColor);
            },
            description: "Active change edges highlighting color picker",
          },
          {
            id: "marked-components-toggle",
            type: "change",
            action: async () => await handleMarkedComponentsToggle(),
            description: "Toggle subtrees highlighting",
          },
          {
            id: "marked-color",
            type: "input",
            action: async (event) => {
              const { setMarkedColor } = useAppStore.getState();
              const newColor = event.target.value;
              setMarkedColor(newColor);
            },
            description: "Subtrees highlighting color picker",
          },
          {
            id: "dimmed-color",
            type: "input",
            action: async (event) => {
              const { setDimmedColor } = useAppStore.getState();
              const newColor = event.target.value;
              setDimmedColor(newColor);
            },
            description: "Dimmed elements color picker",
          },
          {
            id: "dim-non-descendants-toggle",
            type: "change",
            action: async () => await handleDimmingToggle(),
            description: "Toggle dimming for non-descendant elements",
          },

          // Motion Trails controls
          {
            id: "trails-toggle",
            type: "change",
            action: async () => await handleTrailsToggle(),
            description: "Toggle motion trails",
          },
          {
            id: "trail-length",
            type: "input",
            action: async (event) => await handleTrailLengthChange(event),
            description: "Adjust trail length",
          },
          {
            id: "trail-opacity",
            type: "input",
            action: async (event) => await handleTrailOpacityChange(event),
            description: "Adjust trail opacity",
          },
          {
            id: "trail-thickness",
            type: "input",
            action: async (event) => await handleTrailThicknessChange(event),
            description: "Adjust trail thickness",
          },
        ],
      },

      // Submenu toggle controls

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
            id: "chart-modal",
            action: () => {
              const { stop } = useAppStore.getState();
              stop(); // Dispatch stop action
              this.gui.displayCurrentChartInModal();
            },
            description: "Open chart modal",
          },
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
          {
            id: "msa-viewer-btn",
            action: async () => await handleOpenMSAViewer(),
            description: "Open MSA viewer window",
          },
        ],
      },

      // Toggle controls (switches) in buttons panel
      buttonsToggles: {
        type: "change",
        errorHandling: "notify",
        async: true,
        handlers: [
          {
            id: "enable-msa-sync-btn",
            action: async (event) => await handleMSASyncToggle(event, this.gui),
            description: "Toggle MSA window synchronization",
          }
        ]
      },
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
