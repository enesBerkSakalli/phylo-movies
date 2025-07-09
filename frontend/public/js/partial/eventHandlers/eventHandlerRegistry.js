import { notifications } from "./notificationSystem.js";
import { SpeedKnobController } from "../../speedKnobController.js";

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
              if (this.gui.playing) {
                this.gui.stop();
              } else {
                this.gui.play();
              }
            },
            description: "Toggle play/pause",
          },
          // ❌ REDUNDANT - MARKED FOR DELETION
          // stop-button removed from UI but still referenced here
          // TODO: Remove this handler - button no longer exists
          {
            id: "stop-button",
            action: () => this.gui.stop(),
            description: "Stop playback",
          },
          {
            id: "forward-button",
            action: async () => await this.gui.forward(),
            description: "Step forward",
          },
          {
            id: "backward-button",
            action: async () => await this.gui.backward(),
            description: "Step backward",
          },
          {
            id: "save-button",
            action: () => this.gui.saveSVG(),
            description: "Save SVG",
          },
          {
            id: "forwardStepButton",
            action: async () => await this.gui.nextTree(),
            description: "Next tree",
          },
          {
            id: "backwardStepButton",
            action: async () => await this.gui.prevTree(),
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
            id: "positionButton",
            type: "click",
            action: async () => await this.handlePositionNavigation(),
            description: "Navigate to position",
          },
          {
            id: "positionValue",
            type: "change",
            action: () => this.gui.stop(),
            description: "Position input change",
          },
          {
            id: "factor-range",
            type: "input",
            action: (event) => this.handleFactorChange(event),
            description: "Speed factor change (range input)",
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
              this.gui.barOptionValue = event.target.value;
              await this.gui.update();
            },
            description: "Bar plot option change",
          },
          {
            id: "branch-length",
            type: "change",
            action: async (event) => {
              this.gui.ignoreBranchLengths = event.target.checked;
              
              // Hide/show branch transformation when ignoring branch lengths
              const transformRow = document.getElementById('branch-transformation-row');
              if (transformRow) {
                transformRow.style.display = event.target.checked ? 'none' : 'flex';
              }
              
              await this.gui.update();
            },
            description: "Branch length setting",
          },
          {
            id: "font-size",
            type: "input",
            action: async (event) => {
              await this.gui.setFontSize(event.target.value);
            },
            description: "Font size adjustment",
          },
          {
            id: "stroke-width",
            type: "input",
            action: async (event) => {
              this.gui.strokeWidth = parseFloat(event.target.value);
              await this.gui.updateMain();
            },
            description: "Stroke width adjustment",
          },
          {
            id: "branch-transformation",
            type: "change",
            action: async (event) => {
              const transformType = event.target.value;
              this.gui.branchTransformation = transformType;
              await this.gui.updateMain();
            },
            description: "Branch length transformation",
          },
          {
            id: "windowSize",
            type: "change",
            action: async (event) => {
              const newSize = parseInt(event.target.value, 10);
              if (newSize && newSize > 0 && newSize <= 10000) {
                this.gui.msaWindowSize = newSize;
                this.gui.uiController.update();
                this.gui.syncMSAIfOpen();
              }
            },
            description: "MSA window size adjustment",
          },
          {
            id: "windowStepSize",
            type: "change",
            action: async (event) => {
              const newStepSize = parseInt(event.target.value, 10);
              if (newStepSize && newStepSize > 0 && newStepSize <= 1000) {
                this.gui.msaStepSize = newStepSize;
                this.gui.uiController.update();
                this.gui.syncMSAIfOpen();
              }
            },
            description: "MSA step size adjustment",
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
            action: () => this.handleChartModal(),
            description: "Open chart modal",
          },
          {
            id: "compare-sequence-button",
            action: async () => await this.gui.openComparisonModal(),
            description: "Open tree comparison",
          },
          {
            id: "taxa-coloring-button",
            action: () => this.gui.openTaxaColoringModal(),
            description: "Open taxa coloring",
          },
          {
            id: "open-scatter-plot",
            action: async () => await this.handleScatterPlot(),
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
    const container = submenu?.closest('.submenu-container');
    
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

  /**
   * Position navigation handler
   */
  async handlePositionNavigation() {
    const positionInput = document.getElementById("positionValue");
    if (positionInput) {
      let position = Math.max(1, parseInt(positionInput.value, 10));
      positionInput.value = position;
      await this.gui.goToPosition(position - 1);
    }
  }

  /**
   * Factor change handler for range input
   */
  handleFactorChange(event) {
    // Skip if the speed knob controller is currently dragging to avoid conflicts
    if (this.speedKnobController && this.speedKnobController.isDragging) {
      return;
    }
    
    const value = parseFloat(event.target.value);
    // Validate factor is within bounds (now allowing values below 1 for slower animations)
    if (!isNaN(value) && value >= 0.1 && value <= 5) {
      this.gui.factor = value;

      // Update the displayed value
      const speedValue = document.querySelector('.speed-value');
      if (speedValue) {
        speedValue.textContent = `${value.toFixed(1)}×`;
      }
    }
  }

  /**
   * Initialize the speed knob controller for interactive knob behavior
   */
  initializeSpeedKnob() {
    const knobElement = document.querySelector('.speed-knob');
    const inputElement = document.getElementById('factor-range');
    
    if (knobElement && inputElement && !this.speedKnobController) {
      this.speedKnobController = new SpeedKnobController(knobElement, inputElement, {
        onValueChange: (value) => {
          this.gui.factor = value;
          
          // Update the displayed value
          const speedValue = document.querySelector('.speed-value');
          if (speedValue) {
            speedValue.textContent = `${value.toFixed(1)}×`;
          }
        }
      });
      
    }
  }

  /**
   * Chart modal handler with error handling
   */
  handleChartModal() {
    this.gui.stop();
    this.gui.displayCurrentChartInModal();
  }

  /**
   * Scatter plot handler
   */
  async handleScatterPlot() {
    if (this.gui && typeof this.gui.openScatterplotModal === "function") {
      await this.gui.openScatterplotModal();
    } else {
      throw new Error("Scatter plot function not available");
    }
  }


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
      const isWindowHandler = type === "window" || id === "window"; // Clarify window handler check

      if (id && !isWindowHandler) {
        element = document.getElementById(id);
        if (!element && fallbackCreation) {
          console.log(`Attempting fallback creation for element: ${id}`);
          element = fallbackCreation();
        }
      } else if (isWindowHandler) {
        element = window; // Use window object for window events
      }

      if (element) {
        const eventTypeToListen = event || type || "click"; // Determine the actual event type

        // Create a bound action that includes error handling
        const boundAction = async (e) => { // Renamed event to 'e' to avoid conflict
          try {
            // Check if the action is async by looking at its constructor
            const result = action(e);
            // If it's a promise, await it
            if (result && typeof result.then === 'function') {
              await result;
            }
          } catch (error) {
            this.handleError(error, config, handler);
          }
        };

        element.addEventListener(eventTypeToListen, boundAction);

        // Store details needed for detachment
        this.attachedHandlers.push({
          elementId: id || "window", // Store the original ID for logging/debugging
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
      console.warn(`⚠ Some event handlers could not be attached: ${summary.successfulHandlers}/${summary.totalHandlers} successful`);
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
