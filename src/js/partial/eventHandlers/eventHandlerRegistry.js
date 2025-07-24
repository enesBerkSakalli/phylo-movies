import { notifications } from "./notificationSystem.js";
import { SpeedKnobController } from "../../controllers/speedKnobController.js";
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
    this.speedKnobController = null;
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
            id: "start-button",
            action: () => {
              const { playing, play, stop } = useAppStore.getState();
              if (playing) {
                stop(); // Only call store action - let subscription handle update
              } else {
                // For play, we need to keep the GUI method since it manages the animation loop
                if (this.gui) {
                  this.gui.play();
                }
              }
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
            action: () => this.gui.saveSVG(),
            description: "Save SVG",
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
            id: "sidebar-toggle",
            action: () => this.toggleSidebar(),
            description: "Toggle sidebar visibility",
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
              // Skip if the speed knob controller is currently dragging to avoid conflicts
              if (this.speedKnobController && this.speedKnobController.isDragging) {
                return;
              }
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
            description: "Font size adjustment",
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
              const enabled = event.target.checked;
              setMonophyleticColoring(enabled);

              if (treeController) {
                // Update from store - single source of truth approach
                // Store already updated by setMonophyleticColoring above
                treeController.updateFromStore();
                await treeController.renderAllElements();
              }
            },
            description: "Monophyletic group coloring toggle",
          },
          {
            id: "webgl-rendering",
            type: "change",
            action: async (event) => {
              const { setWebglEnabled, setTreeController } = useAppStore.getState();
              const enabled = event.target.checked;
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
        ],
      },

      // Submenu toggle controls
      submenuToggles: {
        type: "click",
        errorHandling: "log",
        handlers: [
          {
            id: "toggle-appearance-submenu",
            action: (event) => this.toggleSubmenu(event, "appearance-submenu"),
            description: "Toggle appearance submenu",
          },
          {
            id: "toggle-recording-submenu",
            action: (event) => this.toggleSubmenu(event, "recording-submenu"),
            description: "Toggle recording submenu",
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
        ],
      },
    };
  }

  /**
   * Toggle submenu visibility
   */
  toggleSubmenu(event, submenuId) {
    const submenu = document.getElementById(submenuId);
    const toggleIcon = event.target;
    const container = submenu?.closest('.card-container');

    if (submenu && container) {
      const isCollapsed = container.getAttribute('data-collapsed') === 'true';

      if (isCollapsed) {
        // Show submenu
        submenu.style.display = 'block';
        container.setAttribute('data-collapsed', 'false');
        toggleIcon.textContent = '▼';
      } else {
        // Hide submenu
        submenu.style.display = 'none';
        container.setAttribute('data-collapsed', 'true');
        toggleIcon.textContent = '▶';
      }
    }
  }


  // Note: Removed redundant handleFactorChange method as it duplicates the functionality
  // in the navigationControls.handlers array for the factor-range input

  /**
   * Initialize the speed knob controller for interactive knob behavior
   *
   * Note: This method creates a SpeedKnobController that uses the same
   * value update logic as the factor-range input handler, but for knob
   * rotation events instead of direct input changes.
   */
  initializeSpeedKnob() {
    const knobElement = document.querySelector('.speed-knob');
    const inputElement = document.getElementById('animation-speed-range');

    if (knobElement && inputElement && !this.speedKnobController) {
      // Create a value change handler that matches the animation-speed-range input handler
      const handleValueChange = (value) => {
        const { setAnimationSpeed } = useAppStore.getState();
        setAnimationSpeed(value);

        // Update the displayed value
        const speedValue = document.querySelector('.speed-value');
        if (speedValue) {
          speedValue.textContent = `${value.toFixed(1)}×`;
        }
      };

      this.speedKnobController = new SpeedKnobController(knobElement, inputElement, {
        onValueChange: handleValueChange
      });
    }
  }

  // Note: Removed redundant handleChartModal and handleScatterPlot methods
  // as they duplicate functionality in the modalControls.handlers array


  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    const sidebar = document.querySelector('.menu');
    const toggleButton = document.querySelector('.sidebar-toggle');

    if (sidebar && toggleButton) {
      sidebar.classList.toggle('hidden');

      // Update toggle button position class
      if (sidebar.classList.contains('hidden')) {
        toggleButton.classList.remove('sidebar-visible');
        toggleButton.classList.add('sidebar-hidden');
        toggleButton.textContent = '☰';
      } else {
        toggleButton.classList.remove('sidebar-hidden');
        toggleButton.classList.add('sidebar-visible');
        toggleButton.textContent = '✕';
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

    this.logAttachmentSummary(summary);

    // Initialize special controllers after all handlers are attached
    this.initializeSpeedKnob();

    return summary;
  }

  /**
   * Log comprehensive attachment summary
   */
  logAttachmentSummary(summary) {
    if (summary.successfulHandlers !== summary.totalHandlers) {
    }
  }

  /**
   * Detach all attached handlers (cleanup)
   */
  detachAll() {
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
   * Get attachment statistics
   */
  getStats() {
    return {
      attachedCount: this.attachedHandlers.length,
      // Return descriptions or IDs for stats, not full elements/handlers
      attachedHandlers: this.attachedHandlers.map(h => `${h.description} (${h.elementId}:${h.type})`),
    };
  }
}
