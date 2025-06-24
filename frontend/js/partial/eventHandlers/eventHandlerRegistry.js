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
        handlers: [
          {
            id: "start-button",
            action: () => this.gui.play(),
            description: "Start playback",
          },
          {
            id: "stop-button",
            action: () => this.gui.stop(),
            description: "Stop playback",
          },
          {
            id: "forward-button",
            action: () => this.gui.forward(),
            description: "Step forward",
          },
          {
            id: "backward-button",
            action: () => this.gui.backward(),
            description: "Step backward",
          },
          {
            id: "save-button",
            action: () => this.gui.saveSVG(),
            description: "Save SVG",
          },
          {
            id: "forwardStepButton",
            action: () => this.gui.nextTree(),
            description: "Next tree",
          },
          {
            id: "backwardStepButton",
            action: () => this.gui.prevTree(),
            description: "Previous tree",
          },
        ],
      },

      // Position and navigation controls
      navigationControls: {
        type: "mixed",
        errorHandling: "notify",
        handlers: [
          {
            id: "positionButton",
            type: "click",
            action: () => this.handlePositionNavigation(),
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
        handlers: [
          {
            id: "barPlotOption",
            type: "change",
            action: (event) => {
              this.gui.barOptionValue = event.target.value;
              this.gui.update();
            },
            description: "Bar plot option change",
          },
          {
            id: "branch-length",
            type: "change",
            action: (event) => {
              this.gui.ignoreBranchLengths = event.target.checked;
              this.gui.update();
            },
            description: "Branch length setting",
          },
          {
            id: "font-size",
            type: "input",
            action: (event) => {
              this.gui.setFontSize(event.target.value);
              this.gui.updateMain();
            },
            description: "Font size adjustment",
          },
          {
            id: "stroke-width",
            type: "input",
            action: (event) => {
              this.gui.strokeWidth = parseFloat(event.target.value);
              this.gui.updateMain();
            },
            description: "Stroke width adjustment",
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
            fallbackCreation: () => this.createScatterPlotButton(),
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
  handlePositionNavigation() {
    const positionInput = document.getElementById("positionValue");
    if (positionInput) {
      let position = Math.max(1, parseInt(positionInput.value, 10));
      positionInput.value = position;
      this.gui.goToPosition(position - 1);
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
      
      console.log('Speed knob controller initialized');
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
    console.log("Opening scatter plot visualization...");
    if (this.gui && typeof this.gui.openScatterplotModal === "function") {
      await this.gui.openScatterplotModal();
    } else {
      throw new Error("Scatter plot function not available");
    }
  }

  /**
   * Create scatter plot button dynamically
   */
  createScatterPlotButton() {
    const navSubmenu = document.getElementById("navigation-submenu");
    if (!navSubmenu) return null;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "nav-action-container";
    buttonContainer.innerHTML = `
      <button id="open-scatter-plot-dynamic" class="nav-action-button">
        <i class="fa fa-cube"></i> Tree Space Visualization (UMAP)
      </button>
    `;

    const positionControl = navSubmenu.querySelector(".position-control");
    if (positionControl) {
      navSubmenu.insertBefore(buttonContainer, positionControl);
    } else {
      navSubmenu.appendChild(buttonContainer);
    }

    return document.getElementById("open-scatter-plot-dynamic");
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
            if (config.async) {
              await action(e);
            } else {
              action(e);
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

        console.log(
          `✓ Attached handler: ${description} (${id || "window"}:${eventTypeToListen})`
        );
        return true;
      } else {
        console.warn(`⚠ Element not found (or not created by fallback) for ID: ${id} for ${description}`);
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
    console.log(`📎 Attaching handler group: ${groupName}`);

    const results = await Promise.allSettled(
      config.handlers.map((handler) =>
        this.attachSingleHandler(handler, config)
      )
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    const total = config.handlers.length;

    console.log(
      `📊 ${groupName}: ${successful}/${total} handlers attached successfully`
    );

    return { successful, total, results };
  }

  /**
   * Main method to attach all event handlers using iterator pattern
   */
  async attachAll() {
    console.log("🚀 Starting event handler attachment process...");

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
    console.log("📋 Event Handler Attachment Summary:");
    console.log(
      `   Groups: ${summary.successfulGroups}/${summary.totalGroups} successful`
    );
    console.log(
      `   Handlers: ${summary.successfulHandlers}/${summary.totalHandlers} successful`
    );
    console.log(
      `   Attached handlers: [${this.attachedHandlers.map(h => `${h.elementId}-${h.type}`).join(", ")}]`
    );

    if (summary.successfulHandlers === summary.totalHandlers) {
      console.log("✅ All event handlers attached successfully!");
    } else {
      console.log("⚠ Some event handlers could not be attached");
    }
  }

  /**
   * Detach all attached handlers (cleanup)
   */
  detachAll() {
    console.log(`🧹 Cleaning up ${this.attachedHandlers.length} event handlers...`);
    this.attachedHandlers.forEach(handlerInfo => {
      try {
        handlerInfo.element.removeEventListener(handlerInfo.type, handlerInfo.handler);
        console.log(`✓ Detached handler: ${handlerInfo.description} (${handlerInfo.elementId}:${handlerInfo.type})`);
      } catch (error) {
        console.error(`Error detaching handler ${handlerInfo.description} (${handlerInfo.elementId}:${handlerInfo.type}):`, error);
      }
    });
    this.attachedHandlers = []; // Clear the array after removing listeners
    console.log("✅ Event handler cleanup complete.");
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
