import * as d3 from "d3";
import { orientText, getOrientTextInterpolator } from "../radialTreeGeometry.js";
import { getNodeKey } from "../utils/KeyGenerator.js";
import { shortestAngle } from "../../utils/MathUtils.js";
import { getEasingFunction, EASING_FUNCTIONS } from "../utils/animationUtils.js";
import { useAppStore } from '../../core/store.js';
import { calculateTextAnchor as calculateTextAnchorFromModule, LABEL_OFFSETS } from "../utils/LabelPositioning.js";

// Re-export for backward compatibility
const calculateTextAnchor = (d) => calculateTextAnchorFromModule(d.angle);

/**
 * LabelRenderer - Specialized renderer for tree leaf labels
 * Follows the same pattern as LinkRenderer, NodeRenderer, and ExtensionRenderer
 */
export class LabelRenderer {

  /**
   * Create a LabelRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining label colors
   * @param {Object} sizeConfig - Configuration object for font size and styling
   */
  constructor(svgContainer, colorManager) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.labelClass = "label";

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
      const leafKey = getNodeKey(leaf);

      // Use store cache or default for entering leaves
      if (previousPositions && previousPositions.leaves.has(leafKey)) {
        const cached = previousPositions.leaves.get(leafKey);
        leaf.prevAngle = cached.angle;
      } else {
        // Default for entering leaves, animate from same angle.
        leaf.prevAngle = leaf.angle;
      }
    }
  }

  /**
   * Updates labels with Stage 2 timing coordination (Update only - no enter/exit needed)
   * Since labels always exist for every leaf, we only need to animate position updates
   * @param {Array} leafData - Array of leaf data
   * @param {number} labelRadius - Radius for positioning
   * @param {number} stageDuration - Stage 2 duration (should be totalDuration/3)
   * @param {string} easing - D3 easing function name for synchronization
   * @param {Object} filteredLeafData - Pre-filtered leaf data {entering, updating, exiting}
   * @returns {Promise} Promise that resolves when Stage 2 animation completes
   */
  async renderUpdating(leafData, labelRadius, stageDuration = 333, easing = EASING_FUNCTIONS.POLY_IN_OUT, filteredLeafData) {
    // Handle empty data case
    if (!leafData || leafData.length === 0) {
      return Promise.resolve();
    }

    // Trust the pre-filtered data from TreeAnimationController
    if (!filteredLeafData) {
      throw new Error('LabelRenderer: filteredLeafData must be provided by TreeAnimationController');
    }

    // Set previous positions from cache before animation
    this.setPreviousPositions(leafData);

    // Get the old label radius for smooth transitions
    const { previousTreeIndex, getLayoutCache } = useAppStore.getState();
    const previousLayout = getLayoutCache(previousTreeIndex);
    const oldLabelRadius = (previousLayout && typeof previousLayout.maxRadius === 'number')
      ? previousLayout.maxRadius + LABEL_OFFSETS.DEFAULT
      : labelRadius;

    // Use pre-filtered data directly
    const enteringLabels = filteredLeafData.entering || [];
    const updatingLabels = filteredLeafData.updating || [];
    const exitingLabels = filteredLeafData.exiting || [];


    // JOIN: Bind data to existing elements (labels should already exist) - use consistent key function
    const labels = this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(leafData, getNodeKey);

    // ENTER: Create any missing labels (should be rare since leaves are constant)
    const enterLabels = labels.enter()
      .append("text")
      .attr("class", this.labelClass)
      .attr("transform", (d) => orientText(d, labelRadius))
      .attr("text-anchor", (d) => calculateTextAnchor(d))
      .style("font-size", useAppStore.getState().fontSize || "2.6em") // Use store default
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .text((d) => d.data.name);

    // EXIT: Remove only labels that our diffing identified as exiting
    const exitingLabelSelection = this._createLabelExitSelection(exitingLabels);
    exitingLabelSelection.remove();

    // UPDATE: Animate all labels (merged enter + existing) to new positions
    const allLabels = labels.merge(enterLabels);

    if (allLabels.empty()) {
      return Promise.resolve();
    }

    // Filter to only labels that our diffing identified as updating
    const updatingLabelSelection = this._createLabelUpdateSelection([...enteringLabels, ...updatingLabels]);

    // IMPORTANT: If no labels are updating structurally but fontSize might have changed,
    // we still need to apply style updates to all labels
    const labelsToUpdate = updatingLabelSelection.empty() ? allLabels : updatingLabelSelection;

    if (labelsToUpdate.empty()) {
      return Promise.resolve();
    }

    // Get easing function for synchronization
    const easingFunction = getEasingFunction(easing);

    // Stage 2 Animation: Move labels to new positions with synchronized timing
    const result = labelsToUpdate
      .transition("label-stage2-update")
      .ease(easingFunction)
      .duration(stageDuration) // Use stage duration for synchronization
      .attrTween("transform", getOrientTextInterpolator(labelRadius, oldLabelRadius))
      .attr("text-anchor", (d) => calculateTextAnchor(d))
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("font-size", useAppStore.getState().fontSize || "2.6em") // Use store default
      .end().catch(() => {});

    // Add debug info
    result.filteredLeafData = filteredLeafData;
    result.stats = {
      total: leafData.length,
      entering: enteringLabels.length,
      updating: updatingLabels.length,
      exiting: exitingLabels.length,
      // Show our diffing vs D3's detection
      actuallyAnimated: labelsToUpdate.size()
    };

    return result;
  }


  /**
   * Renders labels instantly without animation (for scrubbing/interpolation)
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} labelRadius - Radius for label positioning
   * @returns {d3.Selection} The updated labels selection
   */
  renderLabelsInstant(leafData, labelRadius) {
    const labels = this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(leafData, getNodeKey);

    // EXIT
    labels.exit().remove();

    // ENTER
    const enterSelection = labels.enter()
      .append("text")
      .attr("class", this.labelClass)
      .attr("id", (d) => `label-${getNodeKey(d)}`)
      .attr("dy", ".31em")
      .attr("font-family", "sans-serif")
      .attr("font-size", useAppStore.getState().fontSize)
      .text((d) => d.data.name.replace(/_/g, " "))
      .attr("transform", (d) => orientText(d, labelRadius)); // Initial position for new labels

    // MERGE and apply instant updates (NO transition/tween)
    enterSelection.merge(labels)
      .attr("transform", (d) => orientText(d, labelRadius))
      .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : "start"))
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", (d) => (d._opacity !== undefined ? d._opacity : 1));

    return labels;
  }


  /**
   * Renders labels with interpolation between two tree states for scrubbing
   * @param {Array} fromLeafData - Array of leaf nodes from the source tree (t=0)
   * @param {Array} toLeafData - Array of leaf nodes from the target tree (t=1)
   * @param {number} fromLabelRadius - Label radius for source tree
   * @param {number} toLabelRadius - Label radius for target tree
   * @param {number} timeFactor - Interpolation factor [0,1]
   * @returns {d3.Selection} The updated labels selection
   */
  renderLabelsInterpolated(fromLeafData, toLeafData, fromLabelRadius, toLabelRadius, timeFactor) {
    // Try to get positions from store cache first
    const { previousTreeIndex, getTreePositions } = useAppStore.getState();
    const previousPositions = getTreePositions(previousTreeIndex);

    // Create map for quick lookup of 'from' nodes by key
    const fromMap = new Map(fromLeafData.map(d => [getNodeKey(d), d]));

    // Enhance fromMap with store cache if available
    if (previousPositions) {
      toLeafData.forEach(node => {
        const nodeKey = getNodeKey(node);
        if (previousPositions.leaves.has(nodeKey) && !fromMap.has(nodeKey)) {
          const cached = previousPositions.leaves.get(nodeKey);
          fromMap.set(nodeKey, {
            ...node,
            angle: cached.angle,
            radius: cached.radius
          });
        }
      });
    }

    // Use standard D3 data binding with toLeafData and getNodeKey (like other renderers)
    const labels = this.svgContainer
      .selectAll("text")
      .data(toLeafData, getNodeKey);

    // EXIT: Remove labels that no longer exist
    labels.exit().remove();

    // ENTER: Add new labels
    const enterSelection = labels.enter()
      .append("text")
      .attr("id", (d) => `label-${getNodeKey(d)}`)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", useAppStore.getState().fontSize)
      .style("font-family", "Arial, sans-serif")
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", 0);

    // MERGE and UPDATE: Handle all labels
    const allLabels = enterSelection.merge(labels);

    // For scrubbing: set attributes directly for the current timeFactor (no transition)
    allLabels
      .text(d => d.data.name || "")
      .attr("transform", d => {
        // Use the same interpolation logic as other functions
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          // Set up previous angle data for consistent interpolation
          d.prevAngle = fromNode.angle;

          // Create interpolator using the same function as other methods
          const interpolator = getOrientTextInterpolator(toLabelRadius, fromLabelRadius);
          const interpolatorFn = interpolator(d);

          // Get the interpolated transform at the current timeFactor
          return interpolatorFn(timeFactor);
        }
        return orientText(d, toLabelRadius);
      })
      .attr("text-anchor", d => {
        // Use consistent text anchor calculation
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          // Interpolate the angle using the same method as transform
          const fromAngle = fromNode.angle;
          const toAngle = d.angle;
          const adjustedAngleDiff = shortestAngle(fromAngle, toAngle);
          const interpolatedAngle = fromAngle + adjustedAngleDiff * timeFactor;

          // Use the same logic as calculateTextAnchor but with interpolated angle
          const interpolatedAngleDegrees = (interpolatedAngle * 180) / Math.PI;
          return interpolatedAngleDegrees < 270 && interpolatedAngleDegrees > 90 ? "end" : "start";
        }
        return calculateTextAnchor(d);
      })
      .style("opacity", d => {
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          return 1; // Always visible if exists in both
        } else {
          return timeFactor; // Fade in if only in target
        }
      })
      .style("fill", (d) => this.colorManager.getNodeColor(d));

    return allLabels;
  }

  /**
   * Update label font sizes reactively without full re-render
   * Called when fontSize changes in the UI
   */
  updateLabelStyles() {
    const { fontSize } = useAppStore.getState();

    // Update all existing labels with new font size
    this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .style("font-size", fontSize);

    return Promise.resolve();
  }

  /**
   * Clears all label elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.labelClass}`).remove();
  }

  /**
   * Creates label exit selection directly from pre-filtered exiting label data
   * @param {Array} exitingLabels - Array of leaf objects that should exit
   * @returns {d3.Selection} The exit selection
   * @private
   */
  _createLabelExitSelection(exitingLabels) {
    if (exitingLabels.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(exitingLabels, getNodeKey)
      .exit();
  }

  /**
   * Creates label update selection directly from pre-filtered updating label data
   * @param {Array} updatingLabels - Array of leaf objects that should update
   * @returns {d3.Selection} The update selection
   * @private
   */
  _createLabelUpdateSelection(updatingLabels) {
    if (updatingLabels.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.labelClass}`)
      .data(updatingLabels, getNodeKey);
  }

}
