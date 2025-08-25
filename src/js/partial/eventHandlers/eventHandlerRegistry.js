import { notifications } from "./notificationSystem.js";
import { useAppStore } from '../../core/store.js';
import { WebGLTreeAnimationController } from '../../treeVisualisation/WebGLTreeAnimationController.js';

/**
 * Centralized event handler registry with data-driven configuration
 */
export class EventHandlerRegistry {
  constructor(gui) {
    this.gui = gui;
    // Store objects with {id, type, element, boundAction} to allow for proper removal
    this.attachedHandlers = [];
    this.recorder = null;
    this.isRecording = false;
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
              console.log('[EventHandler] Start button clicked');
              const { playing } = useAppStore.getState();
              if (playing) {
                this.gui.stop(); // Call GUI's stop method which handles both store and controller
              } else {
                await this.gui.play(); // Call GUI's play method which handles tree controller creation
              }
              this.updatePlayButton(playing)
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
            action: () => this.toggleNavigation(),
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
            action: (event) => {
              const { setAnimationSpeed } = useAppStore.getState();
              const value = parseFloat(event.target.value);
              if (!isNaN(value) && value >= 0.1 && value <= 5) {
                setAnimationSpeed(value); // Dispatch action
                // Update the displayed value
                const speedValue = document.querySelector('.speed-value');
                if (speedValue) {
                  speedValue.textContent = `${value.toFixed(1)}×`;
                }
              }
            },
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
          {
            id: "barPlotOption",
            type: "change",
            action: async (event) => {
              const { setBarOption } = useAppStore.getState();
              setBarOption(event.target.value); // This is handled by chart-specific subscriptions
            },
            description: "Bar plot option change",
          },
          {
            id: "branch-length-options",
            type: "change",
            action: async (event) => {
              const { setBranchTransformation, treeController, treeList, currentTreeIndex } = useAppStore.getState();
              const newTransform = event.target.value;

              setBranchTransformation(newTransform);

              if (treeController && treeList[currentTreeIndex]) {
                // WebGL controllers manage animation duration internally via store
                if (treeController instanceof WebGLTreeAnimationController) {
                  // WebGL controller manages duration internally
                  treeController.updateLayout(treeList[currentTreeIndex]);
                  await treeController.renderAllElements();
                } else {
                  // SVG controller allows duration manipulation
                  const originalDuration = treeController.drawDuration;
                  treeController.drawDuration = 0; // Make animation instant

                  treeController.updateLayout(treeList[currentTreeIndex]);
                  await treeController.renderAllElements();

                  treeController.drawDuration = originalDuration; // Restore duration
                }
              }
            },
            description: "Branch length options selector",
          },
          {
            id: "font-size",
            type: "input",
            action: async (event) => {
              const { setFontSize, treeController } = useAppStore.getState();
              setFontSize(event.target.value);
              document.getElementById('font-size-value').textContent = event.target.value + 'em';

              if (treeController && treeController.updateLabelStyles) {
                console.log('[EventHandler] Calling updateLabelStyles...');
                // Use optimized font size update instead of full re-render
                await treeController.updateLabelStyles();
              }
            },
            description: "Font size adjustment - optimized",
          },
          {
            id: "stroke-width",
            type: "input",
            action: async (event) => {
              const { setStrokeWidth, treeController } = useAppStore.getState();
              setStrokeWidth(event.target.value);
              document.getElementById('stroke-width-value').textContent = event.target.value;

              if (treeController) {
                // Only manipulate drawDuration for SVG controllers (WebGL controllers have getter-only drawDuration)
                if (treeController instanceof WebGLTreeAnimationController) {
                  // WebGL controller manages duration internally
                  await treeController.renderAllElements();
                } else {
                  // SVG controller allows duration manipulation
                  const originalDuration = treeController.drawDuration;
                  treeController.drawDuration = 0;
                  await treeController.renderAllElements();
                  treeController.drawDuration = originalDuration;
                }
              }
            },
            description: "Stroke width adjustment",
          },
          {
            id: "monophyletic-coloring",
            type: "change",
            action: async (event) => {
              const { setMonophyleticColoring, treeController } = useAppStore.getState();
              const switchElement = document.getElementById('monophyletic-coloring');
              const enabled = switchElement ? switchElement.selected : false;
              setMonophyleticColoring(enabled);

              if (treeController) {
                // Store already updated by setMonophyleticColoring above
                // renderAllElements will read the updated value directly from store
                await treeController.renderAllElements();
              }
            },
            description: "Monophyletic group coloring toggle",
          },
          {
            id: "red-coloring-mode",
            type: "change",
            action: async (event) => {
              const { setRedColoringMode } = useAppStore.getState();
              const selectElement = document.getElementById('red-coloring-mode');
              const mode = selectElement ? selectElement.value : 'highlight_solutions';
              console.log('[EventHandler] Red coloring mode changed to:', mode);
              setRedColoringMode(mode);
            },
            description: "Red coloring mode selector (highlight_solutions vs subtree_tracking)",
          },
          {
            id: "webgl-rendering",
            type: "change",
            action: async (event) => {
              const { setWebglEnabled, setTreeController } = useAppStore.getState();
              const switchElement = document.getElementById('webgl-rendering');
              const enabled = switchElement ? switchElement.selected : false;
              setWebglEnabled(enabled);

              // Show/hide appropriate containers
              const webglContainer = document.getElementById('webgl-container');
              const svgContainer = document.getElementById('application-container');

              if (enabled) {
                webglContainer.style.display = 'block';
                svgContainer.style.display = 'none';
              } else {
                webglContainer.style.display = 'none';
                svgContainer.style.display = 'block';
              }

              // Force creation of new controller with updated WebGL setting
              setTreeController(null);
              console.log(`[EventHandler] WebGL rendering ${enabled ? 'enabled' : 'disabled'}`);
            },
            description: "WebGL rendering toggle",
          },
          {
            id: "camera-mode-button",
            type: "click",
            action: async () => {
              const { toggleCameraMode, treeController } = useAppStore.getState();
              const newMode = toggleCameraMode();

              // Update button text
              const buttonText = document.getElementById('camera-mode-text');
              if (buttonText) {
                buttonText.textContent = newMode === 'orthographic' ? '2D View' : '3D View';
              }

              // Apply camera mode to tree controller if it supports it
              if (treeController && typeof treeController.setCameraMode === 'function') {
                treeController.setCameraMode(newMode);
              }
            },
            description: "Toggle camera mode between orthographic and orbit",
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
            id: "marked-color",
            type: "input",
            action: async (event) => {
              const { setMarkedColor } = useAppStore.getState();
              const newColor = event.target.value;
              setMarkedColor(newColor);
            },
            description: "Marked components highlighting color picker",
          },
          {
            id: "dimmed-color",
            type: "input",
            action: async (event) => {
              const { setDimmedColor } = useAppStore.getState();
              const newColor = event.target.value;
              console.log('[EventHandler] Dimmed elements color changed to:', newColor);
              setDimmedColor(newColor);
            },
            description: "Dimmed elements color picker",
          },
          {
            id: "dim-non-descendants-toggle",
            type: "change",
            action: (event) => {
              const { setDimmingEnabled, treeController } = useAppStore.getState();
              const switchElement = document.getElementById('dim-non-descendants-toggle');
              if (switchElement) {
                // The .selected property is an alias for .checked. Let's try it.
                const value = switchElement.selected;
                console.log(`[EventHandler] 'Focus on Active Subtree' toggled. Value from .selected property:`, value);
                setDimmingEnabled(value);
              } else {
                console.error("[EventHandler] Could not find #dim-non-descendants-toggle");
              }
              // Trigger re-render to apply dimming changes
              if (treeController && treeController.renderAllElements) {
                treeController.renderAllElements();
              }
            },
            description: "Toggle dimming for non-descendant elements",
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
            action: async () => {
              console.log("[EventHandler] MSA viewer button clicked");
              
              // Import MSA viewer module
              const { showMSAViewer } = await import('../../msaViewer/index.js');
              
              // Get phylo data for MSA sequences
              const { phyloData } = await import('../../services/dataService.js');
              const data = await phyloData.get();
              
              if (!data || !data.msa || !data.msa.sequences) {
                console.warn("[EventHandler] No MSA data available");
                notifications.show("No alignment data available. Please upload an MSA file.", "warning");
                return;
              }
              
              // Show the MSA viewer window with data directly
              showMSAViewer(data);
              console.log("[EventHandler] MSA viewer window opened with data");
            },
            description: "Open MSA viewer window",
          },
        ],
      },
    };
  }

  /**
   * Toggle sidebar visibility
   */
  toggleNavigation() {
    const navigationDrawer = document.getElementById('navigation-drawer');
    const moviePlayerBar = document.querySelector('.movie-player-bar');
    const mainContainer = document.querySelector('.container');
    const toggleButton = document.getElementById('nav-toggle-button');
    const toggleIcon = toggleButton?.querySelector('md-icon');

    if (navigationDrawer && moviePlayerBar && mainContainer) {
      const isHidden = navigationDrawer.style.transform === 'translateX(-100%)';

      if (isHidden) {
        // Show navigation
        navigationDrawer.style.transform = 'translateX(0)';
        moviePlayerBar.classList.remove('nav-hidden');
        mainContainer.style.marginLeft = 'var(--navigation-drawer-width)';
        if (toggleIcon) toggleIcon.textContent = 'menu_open';
      } else {
        // Hide navigation
        navigationDrawer.style.transform = 'translateX(-100%)';
        moviePlayerBar.classList.add('nav-hidden');
        mainContainer.style.marginLeft = '0';
        if (toggleIcon) toggleIcon.textContent = 'menu';
      }
    }
  }

  /**
   * Handle errors based on configuration
   */
  handleError(error, config, handlerInfo) {
    const errorMessage = `Error in ${handlerInfo.description}: ${error.message}`;

    switch (config.errorHandling) {
      case "notify":
        console.error(errorMessage, error);
        notifications.show(errorMessage, "error");
        break;
      case "log":
        console.error(errorMessage, error);
        break;
      case "silent":
        // Silent error handling
        break;
      default:
        console.error(errorMessage, error);
    }
  }

  /**
   * Attach a single event handler with error handling
   */
  async attachSingleHandler(handler, config) {
    const {
      id,
      event, // Specific event type for this handler
      type = config.type, // Default event type from group config (e.g., "click", "change")
      action,
      fallbackCreation,
      description,
    } = handler;

    try {
      let element = null;
      const isWindowHandler = type === "window" || id === "window";

      if (id && !isWindowHandler) {
        element = document.getElementById(id);
        if (!element) {
          // Element not found - this is expected during initialization
        }
        if (!element && fallbackCreation) {
          element = fallbackCreation();
        }
      } else if (isWindowHandler) {
        element = window;
      }

      if (element) {
        const eventTypeToListen = event || type || "click";

        // Create a bound action that includes error handling
        const boundAction = async (e) => {
          try {
            const result = action(e);
            if (result && typeof result.then === 'function') {
              await result;
            }
          } catch (error) {
            this.handleError(error, config, handler);
          }
        };

        element.addEventListener(eventTypeToListen, boundAction);
        console.log(`[EventHandlerRegistry] Successfully attached ${eventTypeToListen} handler to element: ${id}`);

        // Store details needed for detachment
        this.attachedHandlers.push({
          elementId: id || "window",
          element: element,
          type: eventTypeToListen,
          handler: boundAction,
          description: description || `Handler for ${id || "window"} on ${eventTypeToListen}`
        });

        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.handleError(error, config, handler);
      return false;
    }
  }

  /**
   * Attach handlers for a specific configuration group
   */
  async attachHandlerGroup(groupName, config) {

    const results = await Promise.allSettled(
      config.handlers.map((handler) =>
        this.attachSingleHandler(handler, config)
      )
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    const total = config.handlers.length;


    return { successful, total, results };
  }

  /**
   * Main method to attach all event handlers using iterator pattern
   */
  async attachAll() {

    const configs = this.getEventHandlerConfigs();
    const summary = {
      totalGroups: 0,
      successfulGroups: 0,
      totalHandlers: 0,
      successfulHandlers: 0,
    };

    // Use for...of to iterate through configurations
    for (const [groupName, config] of Object.entries(configs)) {
      summary.totalGroups++;

      const result = await this.attachHandlerGroup(groupName, config);
      summary.totalHandlers += result.total;
      summary.successfulHandlers += result.successful;

      if (result.successful === result.total) {
        summary.successfulGroups++;
      }
    }

    return summary;
  }

  /**
   * Detach all attached handlers (cleanup)
   */
  detachAll() {
    // Unsubscribe from the store to prevent memory leaks
    if (this.unsubscribeFromStore) {
        this.unsubscribeFromStore();
        this.unsubscribeFromStore = null;
    }

    this.attachedHandlers.forEach(handlerInfo => {
      try {
        handlerInfo.element.removeEventListener(handlerInfo.type, handlerInfo.handler);
      } catch (error) {
        console.error(`Error detaching handler ${handlerInfo.description}:`, error);
      }
    });
    this.attachedHandlers = [];
  }

  /**
   * Set the recorder instance for recording functionality
   * @param {ScreenRecorder} recorder - The ScreenRecorder instance
   */
  setRecorder(recorder) {
    console.log('[EventHandler] Setting recorder instance:', !!recorder);
    this.recorder = recorder;
    if (recorder) {
      console.log('[EventHandler] Setting up recorder callbacks...');
      // Set up recorder callbacks to update UI and state
      recorder.onStart = () => this.onRecordingStart();
      recorder.onStop = (blob) => this.onRecordingStop(blob);
      recorder.onError = (error) => this.onRecordingError(error);
      console.log('[EventHandler] Recorder callbacks set up successfully');
    }
  }

  /**
   * Handle start recording button click
   */
  async handleStartRecording() {
    console.log('[EventHandler] Start recording button clicked');

    if (!this.recorder) {
      console.error("No recorder instance available");
      notifications.show("Recording not available", "error");
      return;
    }

    if (this.isRecording) {
      console.warn("Already recording");
      return;
    }

    console.log('[EventHandler] Attempting to start recording...');
    try {
      await this.recorder.start();
      console.log('[EventHandler] Recording started successfully');
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

    if (!this.isRecording) {
      console.warn("Not currently recording");
      return;
    }

    console.log('[EventHandler] Attempting to stop recording...');
    this.recorder.stop();
  }

  /**
   * Callback when recording starts - update UI
   */
  onRecordingStart() {
    this.isRecording = true;
    console.log("Recording started");

    // Update UI
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop-record");

    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Recording...";
      startBtn.style.backgroundColor = "#e14390";
    }

    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.style.backgroundColor = "#ff4444";
    }
  }

  /**
   * Callback when recording stops - update UI
   */
  onRecordingStop(blob) {
    this.isRecording = false;
    console.log("Recording stopped, blob size:", blob.size);

    // Update UI
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop-record");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start Recording";
      startBtn.style.backgroundColor = "";
    }

    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.style.backgroundColor = "";
    }

    // If auto-save is not enabled, prompt user to save manually
    if (this.recorder && !this.recorder.autoSave) {
      this.promptManualSave();
    }
  }

  /**
   * Callback when recording encounters an error - update UI
   */
  onRecordingError(error) {
    this.isRecording = false;
    console.error("Recording error:", error);

    // Reset UI
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop-record");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start Recording";
      startBtn.style.backgroundColor = "";
    }

    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.style.backgroundColor = "";
    }

    notifications.show(`Recording error: ${error.message || error}`, "error");
  }

  /**
   * Prompt user to save recording manually
   */
  promptManualSave() {
    const saveChoice = confirm("Recording complete! Would you like to save it now?");
    if (saveChoice && this.recorder) {
      try {
        const filename = this.recorder.performAutoSave();
        console.log(`Recording saved as: ${filename}.webm`);
        notifications.show(`Recording saved as: ${filename}.webm`, "success");
      } catch (error) {
        console.error("Failed to save recording:", error);
        notifications.show("Failed to save recording. Please try again.", "error");
      }
    }
  }

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
