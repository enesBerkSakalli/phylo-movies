import * as d3 from "d3";
import { useAppStore } from '../../core/store.js';
import { buildSvgLinkExtension, getLinkExtensionInterpolator } from "../radialTreeGeometry.js";
import { getExtensionKey, getExtensionSvgId } from "../utils/KeyGenerator.js";
import { shortestAngle } from "../../utils/MathUtils.js";
import { getEasingFunction, EASING_FUNCTIONS } from "../utils/animationUtils.js";

/**
 * ExtensionRenderer - Specialized renderer for tree link extensions
 *
 * Handles rendering and updating of SVG path elements that represent
 * the dashed extension lines from tree branches to leaf labels.
 * Follows the Container/Presentational component pattern by focusing
 * solely on extension rendering concerns.
 */
export class ExtensionRenderer {

  /**
   * Create an ExtensionRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining extension colors
   * @param {Object} sizeConfig - Configuration object for stroke width and styling
   */
  constructor(svgContainer, colorManager) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    const { styleConfig } = useAppStore.getState();
    this.sizeConfig = styleConfig;

    // CSS class for extension elements
    this.extensionClass = "link-extension";


    // Note: Position caching now handled by store - no local cache needed
  }


  /**
   * Sets previous positions on leaf data from store cache
   * @param {Array} leafData - Array of leaf node objects
   */
  setPreviousPositions(leafData) {
    // Get previous positions from store cache
    const { previousTreeIndex, getTreePositions } = useAppStore.getState();
    const previousPositions = getTreePositions(previousTreeIndex);

    for (const leaf of leafData) {
      const leafKey = getExtensionKey(leaf);

      // Use store cache or default to current position
      if (previousPositions && previousPositions.leaves.has(leafKey)) {
        const cached = previousPositions.leaves.get(leafKey);
        leaf.prevAngle = cached.angle;
        leaf.prevRadius = cached.radius;
      } else {
        // Default to current position for entering leaves
        leaf.prevAngle = leaf.angle;
        leaf.prevRadius = leaf.radius;
      }
    }
  }

  /**
   * Renders and updates link extension elements using D3's general update pattern
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @param {Function} interpolationFunction - Function for D3 attrTween animations
   * @param {number} duration - Animation duration in milliseconds
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @returns {d3.Selection} The updated extensions selection
   */
  renderExtensions(leafData, extensionEndRadius, interpolationFunction, duration = 1000, easing = EASING_FUNCTIONS.POLY_IN_OUT) {
    // JOIN: Bind data to existing elements
    const linkExtensions = this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(leafData, getExtensionKey);

    // EXIT: Remove elements not in new data
    this._handleExit(linkExtensions);

    // ENTER: Create new elements
    this._handleEnter(linkExtensions, extensionEndRadius);

    // UPDATE: Update existing elements with animation
    this._handleUpdate(linkExtensions, interpolationFunction, duration, easing);

    return linkExtensions;
  }

  /**
   * Renders extensions instantly without animation (for scrubbing/interpolation)
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @returns {d3.Selection} The updated extensions selection
   */
  renderExtensionsInstant(leafData, extensionRadius) {
    const extensions = this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(leafData, getExtensionKey);

    // EXIT
    extensions.exit().remove();

    // ENTER
    const enterSelection = extensions.enter()
      .append("path") // Changed to path
      .attr("class", this.extensionClass)
      .attr("id", (d) => getExtensionSvgId(d))
      .attr("stroke", (d) => this.colorManager.getNodeColor(d))
      .attr("stroke-width", this.sizeConfig.extensionStrokeWidth || "0.06em")
      .attr("stroke-dasharray", "0.2,0.2")
      .attr("fill", "none") // Paths need fill none
      .attr("d", (d) => buildSvgLinkExtension(d, d.radius)); // Initial collapsed state

    // MERGE and apply instant updates (no transition)
    enterSelection.merge(extensions)
      .attr("d", (d) => buildSvgLinkExtension(d, extensionRadius)) // Use attr for instant positioning
      .style("opacity", (d) => (d._opacity !== undefined ? d._opacity : 1));

    return extensions;
  }

  /**
   * Handles the EXIT selection - removes old extensions
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @private
   */
  _handleExit(linkExtensions) {
    linkExtensions.exit().remove();
  }

  /**
   * Handles the ENTER selection - creates new extension elements
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @private
   */
  _handleEnter(linkExtensions, extensionEndRadius) {
    linkExtensions
      .enter()
      .append("path")
      .attr("class", this.extensionClass)
      .attr("id", (d) => getExtensionSvgId(d))
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .attr("stroke-dasharray", this.sizeConfig.dashArray || "5,5")
      .attr("fill", "none")
      .attr("d", (d) => buildSvgLinkExtension(d, extensionEndRadius))
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .style("stroke-opacity", this.sizeConfig.extensionOpacity || 0.7);
  }

  /**
   * Handles the UPDATE selection - animates existing extensions to new positions
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @param {Function} interpolationFunction - D3 attrTween interpolation function
   * @param {number} duration - Animation duration
   * @param {string} easing - D3 easing function name
   * @private
   */
  _handleUpdate(linkExtensions, interpolationFunction, duration, easing) {
    const easingFunction = getEasingFunction(easing);

    linkExtensions
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .transition()
      .ease(easingFunction)
      .duration(duration)
      .attrTween("d", interpolationFunction);
  }





  /**
   * Renders extensions with Stage 2 timing coordination (Update only - no enter/exit needed)
   * Since extensions always exist for every leaf, we only need to animate position updates
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @param {number} stageDuration - Stage 2 duration (should be totalDuration/3)
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @param {Object} filteredLeafData - Pre-filtered leaf data {entering, updating, exiting}
   * @returns {Promise} Promise that resolves when Stage 2 animation completes
   */
  renderExtensionsWithPromise(leafData, extensionEndRadius, stageDuration = 333, easing = EASING_FUNCTIONS.POLY_IN_OUT, filteredLeafData) {
    // Handle empty data case
    if (!leafData || leafData.length === 0) {
      return Promise.resolve();
    }

    // Trust the pre-filtered data from TreeAnimationController
    if (!filteredLeafData) {

      throw new Error('ExtensionRenderer: filteredLeafData must be provided by TreeAnimationController');
    }

    // Set previous positions from cache before animation
    this.setPreviousPositions(leafData);

    // Use pre-filtered data directly - extensions correspond to leaves
    const enteringExtensions = filteredLeafData.entering || [];
    const updatingExtensions = filteredLeafData.updating || [];
    const exitingExtensions = filteredLeafData.exiting || [];


    // JOIN: Bind data to existing elements (extensions should already exist)
    const linkExtensions = this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(leafData, getExtensionKey);

    // ENTER: Create any missing extensions
    const enterExtensions = this._createExtensionEnterSelection(enteringExtensions)
      .append("path")
      .attr("class", this.extensionClass)
      .attr("stroke", "#999")
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .attr("stroke-dasharray", "3,3")
      .attr("fill", "none")
      .attr("id", (d) => getExtensionSvgId(d))
      .style("opacity", 1)
      .attr("d", (d) => buildSvgLinkExtension(d, extensionEndRadius));

    // EXIT: Remove only extensions that our diffing identified as exiting
    const exitingExtensionSelection = this._createExtensionExitSelection(exitingExtensions);
    exitingExtensionSelection.remove();

    // UPDATE: Animate all extensions (merged enter + existing) to new positions
    const allExtensions = linkExtensions.merge(enterExtensions);

    if (allExtensions.empty()) {
      return Promise.resolve();
    }

    // Filter to only extensions that our diffing identified as updating
    const updatingExtensionSelection = this._createExtensionUpdateSelection([...enteringExtensions, ...updatingExtensions]);

    // If no diffing updates but we have extensions, update all (for resize scenarios)
    const extensionsToUpdate = updatingExtensionSelection.empty() ? allExtensions : updatingExtensionSelection;

    if (extensionsToUpdate.empty()) {
      return Promise.resolve();
    }

    const easingFunction = getEasingFunction(easing);

    // Stage 2 Animation: Move extensions to new positions with synchronized timing
    const transition = extensionsToUpdate
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .transition("extension-stage2-update")
      .ease(easingFunction)
      .duration(stageDuration) // Use stage duration for synchronization
      .attrTween("d", getLinkExtensionInterpolator(extensionEndRadius));

    // Convert D3 transition to Promise with proper error handling
    const result = transition.end().catch(() => {});

    // Add debug info
    result.filteredLeafData = filteredLeafData;
    result.stats = {
      total: leafData.length,
      entering: enteringExtensions.length,
      updating: updatingExtensions.length,
      exiting: exitingExtensions.length,
      // Show our diffing vs D3's detection
      actuallyAnimated: extensionsToUpdate.size()
    };

    return result;
  }

  /**
   * Clears all extension elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.extensionClass}`).remove();
  }

  /**
   * Gets the current extensions selection (useful for external operations)
   * @returns {d3.Selection} Current extensions selection
   */
  getExtensionsSelection() {
    return this.svgContainer.selectAll(`.${this.extensionClass}`);
  }

  /**
   * Updates extension colors based on current marked components
   * @param {Set} markedComponents - Set of marked components for highlighting
   */
  updateExtensionColors(markedComponents) {
    if (this.colorManager.updateMarkedComponents) {
      this.colorManager.updateMarkedComponents(markedComponents);
    }

    // Update colors for all extensions
    this.svgContainer.selectAll(`.${this.extensionClass}`)
      .style("stroke", (d) => this.colorManager.getNodeColor(d));
  }



  /**
   * Shows or hides extensions based on visibility settings
   * @param {boolean} visible - Whether extensions should be visible
   */
  setVisibility(visible = true) {
    this.svgContainer.selectAll(`.${this.extensionClass}`)
      .style("display", visible ? "block" : "none");
  }

  /**
   * Renders extensions with interpolation between two tree states for scrubbing
   * @param {Array} fromLeafData - Array of leaf nodes from the source tree (t=0)
   * @param {Array} toLeafData - Array of leaf nodes from the target tree (t=1)
   * @param {number} fromExtensionRadius - Extension radius for source tree
   * @param {number} toExtensionRadius - Extension radius for target tree
   * @param {number} timeFactor - Interpolation factor [0,1]
   * @returns {d3.Selection} The updated extensions selection
   */
  renderExtensionsInterpolated(fromLeafData, toLeafData, fromExtensionRadius, toExtensionRadius, timeFactor) {

    // Try to get positions from store cache first
    const { previousTreeIndex, getTreePositions } = useAppStore.getState();
    const previousPositions = getTreePositions(previousTreeIndex);

    // Create map for quick lookup of 'from' nodes by key
    const fromMap = new Map(fromLeafData.map(d => [getExtensionKey(d), d]));

    // Enhance fromMap with store cache if available
    if (previousPositions) {
      toLeafData.forEach(leaf => {
        const leafKey = getExtensionKey(leaf);
        if (previousPositions.leaves.has(leafKey) && !fromMap.has(leafKey)) {
          const cached = previousPositions.leaves.get(leafKey);
          fromMap.set(leafKey, {
            ...leaf,
            angle: cached.angle,
            radius: cached.radius
          });
        }
      });
    }

    // Use standard D3 data binding with toLeafData and getExtensionKey (like other renderers)
    const extensions = this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(toLeafData, getExtensionKey);

    // EXIT: Remove extensions that no longer exist
    extensions.exit().remove();

    // ENTER: Add new extensions
    const enterSelection = extensions.enter()
      .append("path")
      .attr("class", this.extensionClass)
      .attr("id", (d) => getExtensionSvgId(d))
      .attr("fill", "none")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-width", 0)
      .style("opacity", 0);

    // MERGE and UPDATE: Handle all extensions
    const allExtensions = enterSelection.merge(extensions);


    // Calculate interpolated extension radius
    const interpolatedRadius = fromExtensionRadius + (toExtensionRadius - fromExtensionRadius) * timeFactor;

    // For scrubbing: set attributes directly for the current timeFactor (no transition)
    allExtensions
      .attr("stroke-width", this.sizeConfig.strokeWidth || "1px")
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .attr("d", (d) => {
        // Calculate interpolated position using proper angle interpolation
        const fromNode = fromMap.get(getExtensionKey(d));
        if (fromNode) {
          // Interpolate angles using shortest path
          const fromAngle = fromNode.angle;
          const toAngle = d.angle;
          const adjustedAngleDiff = shortestAngle(fromAngle, toAngle);
          const interpolatedAngle = fromAngle + adjustedAngleDiff * timeFactor;

          // Interpolate node radius (the start point of the extension)
          const fromRadius = fromNode.radius;
          const toRadius = d.radius;
          const interpolatedNodeRadius = fromRadius + (toRadius - fromRadius) * timeFactor;

          // Create interpolated node data
          const interpolatedNode = {
            ...d,
            angle: interpolatedAngle,
            radius: interpolatedNodeRadius,
            x: interpolatedNodeRadius * Math.cos(interpolatedAngle),
            y: interpolatedNodeRadius * Math.sin(interpolatedAngle)
          };

          // Extension should go from node position to label position (extended radius)
          return buildSvgLinkExtension(interpolatedNode, interpolatedRadius);
        }
        return buildSvgLinkExtension(d, interpolatedRadius);
      })
      .style("opacity", d => {
        const fromNode = fromMap.get(getExtensionKey(d));
        if (fromNode) {
          return 1; // Always visible if exists in both
        } else {
          return timeFactor; // Fade in if only in target
        }
      });

    return allExtensions;
  }

  /**
   * Gets statistics about current extensions
   * @returns {Object} Statistics object with count and other metrics
   */
  getStatistics() {
    const extensions = this.svgContainer.selectAll(`.${this.extensionClass}`);
    return {
      count: extensions.size(),
      visible: extensions.filter(function() {
        return d3.select(this).style("display") !== "none";
      }).size()
    };
  }

  /**
   * Creates extension enter selection directly from pre-filtered entering extension data
   * @param {Array} enteringExtensions - Array of leaf objects that should enter
   * @returns {d3.Selection} The enter selection
   * @private
   */
  _createExtensionEnterSelection(enteringExtensions) {
    if (enteringExtensions.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(null) // Start with empty selection
      .data(enteringExtensions, getExtensionKey)
      .enter();
  }

  /**
   * Creates extension exit selection directly from pre-filtered exiting extension data
   * @param {Array} exitingExtensions - Array of leaf objects that should exit
   * @returns {d3.Selection} The exit selection
   * @private
   */
  _createExtensionExitSelection(exitingExtensions) {
    if (exitingExtensions.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(exitingExtensions, getExtensionKey)
      .exit();
  }

  /**
   * Creates extension update selection directly from pre-filtered updating extension data
   * @param {Array} updatingExtensions - Array of leaf objects that should update
   * @returns {d3.Selection} The update selection
   * @private
   */
  _createExtensionUpdateSelection(updatingExtensions) {
    if (updatingExtensions.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(updatingExtensions, getExtensionKey);
  }

}
