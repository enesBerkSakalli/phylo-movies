import * as d3 from "d3";
import { useAppStore } from '../../store.js';
import { buildSvgLinkExtension, getLinkExtensionInterpolator } from "../radialTreeGeometry.js";
import { getExtensionKey, getExtensionSvgId } from "../utils/KeyGenerator.js";
import { shortestAngle } from "../../utils/MathUtils.js";
import { getEasingFunction } from "../utils/animationUtils.js";

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

    // Cache for previous leaf positions to avoid DOM parsing
    this.previousPositionsCache = new Map();
  }

  /**
   * Updates the cache with current leaf positions
   * @param {Array} leafData - Array of leaf node objects
   */
  updatePositionsCache(leafData) {
    for (const leaf of leafData) {
      const leafKey = getExtensionKey(leaf);
      this.previousPositionsCache.set(leafKey, {
        angle: leaf.angle,
        radius: leaf.radius
      });
    }
  }

  /**
   * Sets previous positions on leaf data from cache
   * @param {Array} leafData - Array of leaf node objects
   */
  setPreviousPositions(leafData) {
    for (const leaf of leafData) {
      const leafKey = getExtensionKey(leaf);
      if (this.previousPositionsCache.has(leafKey)) {
        const cached = this.previousPositionsCache.get(leafKey);
        leaf.prevAngle = cached.angle;
        leaf.prevRadius = cached.radius;
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
  renderExtensions(leafData, extensionEndRadius, interpolationFunction, duration = 1000, easing = "easePolyInOut") {
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

    // MERGE and apply instant updates with transition
    enterSelection.merge(extensions)
      .attrTween("d", getLinkExtensionInterpolator(extensionRadius)) // Use attrTween for path
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
   * Handles instant updates for extensions during scrubbing
   * @param {d3.Selection} linkExtensions - The extensions selection
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @private
   */
  _handleInstantUpdate(linkExtensions, extensionEndRadius) {
    linkExtensions
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .attr("d", (d) => buildSvgLinkExtension(d, extensionEndRadius))
      .style("opacity", (d) => {
        const baseOpacity = this.sizeConfig.extensionOpacity || 0.7;
        return d._opacity !== undefined ? d._opacity * baseOpacity : baseOpacity;
      }); // Handle fade effects
  }


  /**
   * Updates the styling configuration
   * @param {Object} newConfig - New size configuration
   */
  updateSizeConfig(newConfig) {
    // Removed updateSizeConfig: dynamic updates not needed
  }


  /**
   * Renders extensions with Stage 2 timing coordination (Update only - no enter/exit needed)
   * Since extensions always exist for every leaf, we only need to animate position updates
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} extensionEndRadius - End radius for extension positioning
   * @param {number} stageDuration - Stage 2 duration (should be totalDuration/3)
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @returns {Promise} Promise that resolves when Stage 2 animation completes
   */
  renderExtensionsWithPromise(leafData, extensionEndRadius, stageDuration = 333, easing = "easePolyInOut") {
    // Handle empty data case
    if (!leafData || leafData.length === 0) {
      return Promise.resolve();
    }

    // Set previous positions from cache before animation
    this.setPreviousPositions(leafData);

    // JOIN: Bind data to existing elements (extensions should already exist)
    const linkExtensions = this.svgContainer
      .selectAll(`.${this.extensionClass}`)
      .data(leafData, getExtensionKey);

    // ENTER: Create any missing extensions (should be rare since leaves are constant)
    const enterExtensions = linkExtensions.enter()
      .append("path")
      .attr("class", this.extensionClass)
      .attr("stroke", "#999")
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .attr("stroke-dasharray", "3,3")
      .attr("fill", "none")
      .attr("id", (d) => getExtensionSvgId(d))
      .style("opacity", 1)
      .attr("d", (d) => buildSvgLinkExtension(d, extensionEndRadius));

    // EXIT: Remove any extra extensions (should be rare since leaves are constant)
    linkExtensions.exit().remove();

    // UPDATE: Animate all extensions (merged enter + existing) to new positions
    const allExtensions = linkExtensions.merge(enterExtensions);

    if (allExtensions.empty()) {
      return Promise.resolve();
    }

    const easingFunction = getEasingFunction(easing);

    // Stage 2 Animation: Move extensions to new positions with synchronized timing
    const transition = allExtensions
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .style("stroke", (d) => this.colorManager.getNodeColor(d))
      .transition("extension-stage2-update")
      .ease(easingFunction)
      .duration(stageDuration) // Use stage duration for synchronization
      .attrTween("d", getLinkExtensionInterpolator(extensionEndRadius));

    // Convert D3 transition to Promise with proper error handling
    return transition.end().then(() => {
      // Update cache after animation completes
      this.updatePositionsCache(leafData);
    }).catch(() => {});
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
    // Debug logging
    console.log('[ExtensionRenderer] renderExtensionsInterpolated TRACE:', {
      fromLeafCount: fromLeafData.length,
      toLeafCount: toLeafData.length,
      fromExtensionRadius,
      toExtensionRadius,
      timeFactor
    });

    // Create map for quick lookup of 'from' nodes by key
    const fromMap = new Map(fromLeafData.map(d => [getExtensionKey(d), d]));

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

    // Debug logging
    console.log('[ExtensionRenderer] Extension counts:', {
      enterCount: enterSelection.size(),
      existingCount: extensions.size(),
      totalCount: allExtensions.size()
    });

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
}
