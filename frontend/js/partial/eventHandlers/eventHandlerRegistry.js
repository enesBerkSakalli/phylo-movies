import { notifications } from "./notificationSystem.js";

/**
 * Centralized event handler registry with data-driven configuration
 */
export class EventHandlerRegistry {
  constructor(gui) {
    this.gui = gui;
    this.attachedHandlers = new Set();
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
            id: "factor",
            type: "change",
            action: (event) => {
              this.gui.factor = parseFloat(event.target.value);
            },
            description: "Speed factor change",
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
              this.gui.fontSize = parseFloat(event.target.value);
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
   * Chart modal handler with error handling
   */
  handleChartModal() {
    this.gui.stop();
    this.gui.generateModalChart();
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
      event,
      type = config.type,
      action,
      fallbackCreation,
      description,
    } = handler;

    try {
      let element = null;

      if (id) {
        element = document.getElementById(id);

        // Try fallback creation if element not found
        if (!element && fallbackCreation) {
          element = fallbackCreation();
        }
      }

      if (element || type === "window") {
        const eventType = event || type || "click";
        const wrappedAction = async (event) => {
          try {
            if (config.async) {
              await action(event);
            } else {
              action(event);
            }
          } catch (error) {
            this.handleError(error, config, handler);
          }
        };

        if (type === "window") {
          window.addEventListener(eventType, wrappedAction);
        } else {
          element.addEventListener(eventType, wrappedAction);
        }

        this.attachedHandlers.add(`${id || "window"}-${eventType}`);
        console.log(
          `✓ Attached handler: ${description} (${id || "window"}:${eventType})`
        );
        return true;
      } else {
        console.warn(`⚠ Element not found: ${id} for ${description}`);
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
      `   Attached handlers: [${Array.from(this.attachedHandlers).join(", ")}]`
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
    console.log("🧹 Cleaning up event handlers...");
    // Implementation for cleanup if needed
    this.attachedHandlers.clear();
  }

  /**
   * Get attachment statistics
   */
  getStats() {
    return {
      attachedCount: this.attachedHandlers.size,
      attachedHandlers: Array.from(this.attachedHandlers),
    };
  }
}
