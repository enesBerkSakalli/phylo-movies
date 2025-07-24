import * as d3 from "d3";
import { useAppStore } from '../../core/store.js';
import { TREE_COLOR_CATEGORIES } from "../../core/store.js";
import { attrTweenCircleX, attrTweenCircleY, attrTweenCircleXWithT, attrTweenCircleYWithT } from "../radialTreeGeometry.js";
import { getNodeKey, getNodeSvgId } from "../utils/KeyGenerator.js";
import { getEasingFunction, EASING_FUNCTIONS } from "../utils/animationUtils.js";

/**
 * NodeRenderer - Specialized renderer for tree nodes (circles, internal nodes, etc.)
 *
 * Handles rendering and updating of SVG elements that represent
 * the nodes in phylogenetic trees. Follows the Container/Presentational
 * component pattern by focusing solely on node rendering concerns.
 */
export class NodeRenderer {

  /**
   * Create a NodeRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining node colors
   * @param {Object} sizeConfig - Configuration object for node sizes and styling
   */
  constructor(svgContainer, colorManager) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    const { styleConfig } = useAppStore.getState();
    this.sizeConfig = styleConfig;

    // CSS classes for different node types
    this.leafClass = "leaf";
    this.internalNodeClass = "internal-node";


    // Note: Position caching now handled by store - no local cache needed
  }



  /**
   * Sets previous positions on node data from store cache
   * @param {Array} nodesData - Array of node objects
   */
  setPreviousPositions(nodesData) {
    // Get previous positions from store cache
    const { previousTreeIndex, getTreePositions } = useAppStore.getState();
    const previousPositions = getTreePositions(previousTreeIndex);

    for (const node of nodesData) {
      const nodeKey = getNodeKey(node);

      // Use store cache or appropriate fallback for entering nodes
      if (previousPositions && previousPositions.nodes.has(nodeKey)) {
        const cached = previousPositions.nodes.get(nodeKey);
        node.prevAngle = cached.angle;
        node.prevRadius = cached.radius;
      } else {
        // For entering nodes, start at their target position (no animation from origin)
        node.prevAngle = node.angle;
        node.prevRadius = node.radius; // Start at target position for entering nodes
      }
    }
  }

  /**
   * Binds click event handlers to leaf circles
   * @param {Function} clickHandler - The click handler function
   * @private
   */
  _bindLeafClickHandlers(clickHandler) {
    this.svgContainer.selectAll(`.${this.leafClass}`)
      .on("click", clickHandler);
  }

  /**
   * Clears all node elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.leafClass}`).remove();
    this.svgContainer.selectAll(`.${this.internalNodeClass}`).remove();
  }

  /**
   * Gets the current leaf circles selection (useful for external operations)
   * @returns {d3.Selection} Current leaf circles selection
   */
  getLeafCirclesSelection() {
    return this.svgContainer.selectAll(`.${this.leafClass}`);
  }

  /**
   * Gets the current internal nodes selection (useful for external operations)
   * @returns {d3.Selection} Current internal nodes selection
   */
  getInternalNodesSelection() {
    return this.svgContainer.selectAll(`.${this.internalNodeClass}`);
  }

  /**
   * Renders all node circles (leaves + internal) with Stage 2 timing coordination
   * @param {Array} allNodesData - Array of all D3 nodes from tree.descendants()
   * @param {number} stageDuration - Stage 2 duration (should be totalDuration/3)
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @param {Function} clickHandler - Optional click handler function for leaf nodes
   * @param {Object} filteredNodeData - Pre-filtered node data {entering, updating, exiting}
   * @returns {Promise} Promise that resolves when Stage 2 animation completes
   */
  renderAllNodesWithPromise(allNodesData, stageDuration = 333, easing = EASING_FUNCTIONS.POLY_IN_OUT, clickHandler = null, filteredNodeData) {
    // Handle empty data case
    if (!allNodesData || allNodesData.length === 0) {
      return Promise.resolve();
    }

    // Trust the pre-filtered data from TreeAnimationController
    if (!filteredNodeData) {
      throw new Error('NodeRenderer: filteredNodeData must be provided by TreeAnimationController');
    }

    // Set previous positions from cache before animation
    this.setPreviousPositions(allNodesData);

    // Separate leaf and internal nodes
    const leafData = allNodesData.filter(d => !d.children);
    const internalNodeData = allNodesData.filter(d => d.children);

    // Use pre-filtered data directly - no key-based filtering needed
    const enteringNodes = filteredNodeData.entering || [];
    const updatingNodes = filteredNodeData.updating || [];
    const exitingNodes = filteredNodeData.exiting || [];

    const easingFunction = getEasingFunction(easing);
    const promises = [];
    let updatingLeafCircles = d3.select(null).selectAll(null); // Initialize empty selection
    let updatingInternalNodes = d3.select(null).selectAll(null); // Initialize empty selection

    // Render leaf circles
    if (leafData.length > 0) {
      const leafCircles = this.svgContainer
        .selectAll(`.${this.leafClass}`)
        .data(leafData, getNodeKey);

      leafCircles.enter()
        .append("circle")
        .attr("class", this.leafClass)
        .attr("id", (d) => getNodeSvgId(d, "circle"))
        .attr("cx", (d) => {
          // Start entering nodes at their previous position if available, otherwise current
          const startAngle = d.prevAngle ?? d.angle;
          const startRadius = d.prevRadius ?? d.radius;
          return startRadius * Math.cos(startAngle);
        })
        .attr("cy", (d) => {
          const startAngle = d.prevAngle ?? d.angle;
          const startRadius = d.prevRadius ?? d.radius;
          return startRadius * Math.sin(startAngle);
        })
        .attr("r", this.sizeConfig.leafRadius || "0.4em")
        .attr("stroke-width", this.sizeConfig.leafStrokeWidth || "0.1em")
        .style("fill", (d) => this.colorManager.getNodeColor(d))
        .style("stroke", TREE_COLOR_CATEGORIES.strokeColor)
        .style("opacity", 0); // Start transparent

      // Animate exiting leaves
      const exitingLeafCircles = this._createLeafExitSelection(exitingNodes.filter(d => !d.children));

      if (!exitingLeafCircles.empty()) {
        const exitTransition = exitingLeafCircles
          .transition("leaf-circles-stage2-exit")
          .ease(easingFunction)
          .duration(stageDuration / 2) // Fade out faster
          .style("opacity", 0)
          .remove();
        promises.push(exitTransition.end().catch(() => {}));
      }


      // Animate both entering and updating leaves to their final state
      updatingLeafCircles = this._createLeafUpdateSelection(
        [...enteringNodes, ...updatingNodes].filter(d => !d.children)
      );

      if (!updatingLeafCircles.empty()) {
        const leafTransition = updatingLeafCircles
          .transition("leaf-circles-stage2-update")
          .ease(easingFunction)
          .duration(stageDuration)
          .attrTween("cx", attrTweenCircleX())
          .attrTween("cy", attrTweenCircleY())
          .style("fill", (d) => this.colorManager.getNodeColor(d))
          .style("opacity", 1); // Fade in

        promises.push(leafTransition.end().catch(() => {}));
      }

      // Bind click handlers for leaf nodes if provided
      if (clickHandler) {
        this._bindLeafClickHandlers(clickHandler);
      }
    }

    // Render internal node circles
    if (internalNodeData.length > 0) {
      const internalNodes = this.svgContainer
        .selectAll(`.${this.internalNodeClass}`)
        .data(internalNodeData, getNodeKey);

      const enterInternalNodes = internalNodes.enter()
        .append("circle")
        .attr("class", this.internalNodeClass)
        .attr("id", (d) => getNodeSvgId(d, "internal-node"))
        .attr("cx", (d) => {
          const startAngle = d.prevAngle ?? d.angle;
          const startRadius = d.prevRadius ?? d.radius;
          return startRadius * Math.cos(startAngle);
        })
        .attr("cy", (d) => {
          const startAngle = d.prevAngle ?? d.angle;
          const startRadius = d.prevRadius ?? d.radius;
          return startRadius * Math.sin(startAngle);
        })
        .attr("r", this.sizeConfig.internalNodeRadius || "0.2em")
        .style("fill", (d) => this.colorManager.getNodeColor(d))
        .style("stroke", TREE_COLOR_CATEGORIES.strokeColor)
        .style("opacity", 0); // Start transparent

      // Animate exiting internal nodes
      const exitingInternalNodes = this._createInternalExitSelection(exitingNodes.filter(d => d.children));

      if (!exitingInternalNodes.empty()) {
        const internalExitTransition = exitingInternalNodes
          .transition("internal-nodes-stage2-exit")
          .ease(easingFunction)
          .duration(stageDuration / 2)
          .style("opacity", 0)
          .remove();
        promises.push(internalExitTransition.end().catch(() => {}));
      }

      internalNodes.merge(enterInternalNodes);

      // Animate both entering and updating internal nodes
      updatingInternalNodes = this._createInternalUpdateSelection(
        [...enteringNodes, ...updatingNodes].filter(d => d.children)
      );

      if (!updatingInternalNodes.empty()) {
        const internalTransition = updatingInternalNodes
          .transition("internal-nodes-stage2-update")
          .ease(easingFunction)
          .duration(stageDuration)
          .attrTween("cx", attrTweenCircleX())
          .attrTween("cy", attrTweenCircleY())
          .style("fill", (d) => this.colorManager.getNodeColor(d))
          .style("opacity", 1); // Fade in

        promises.push(internalTransition.end().catch(() => {}));
      }
    }

    // Return promise that resolves when both leaf and internal node animations complete
    const result = Promise.all(promises);

    // Add debug info
    result.filteredNodeData = filteredNodeData;
    result.stats = {
      total: allNodesData.length,
      entering: enteringNodes.length,
      updating: updatingNodes.length,
      exiting: exitingNodes.length,
      // Show our diffing vs D3's detection
      actuallyAnimated: updatingInternalNodes.size() + updatingLeafCircles.size()
    };

    return result;
  }

  /**
   * Renders leaf circles instantly without animation (for scrubbing/interpolation)
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {Function} clickHandler - Optional click handler function
   * @returns {d3.Selection} The updated leaf circles selection
   */
  renderLeafCirclesInstant(leafData, clickHandler = null) {
    const leafCircles = this.svgContainer
      .selectAll(`.${this.leafClass}`)
      .data(leafData, getNodeKey);

    // EXIT
    leafCircles.exit().remove();

    // ENTER
    const enterSelection = leafCircles.enter()
      .append("circle")
      .attr("class", this.leafClass)
      .attr("id", (d) => getNodeSvgId(d, "circle"))
      .attr("r", this.sizeConfig.leafRadius || "0.4em")
      .attr("stroke-width", this.sizeConfig.leafStrokeWidth || "0.1em")
      .style("stroke", TREE_COLOR_CATEGORIES.strokeColor)
      .attr("cx", (d) => d.source ? d.source.x : d.x) // Initial position for new nodes
      .attr("cy", (d) => d.source ? d.source.y : d.y);

    // MERGE and apply instant updates with transition
    enterSelection.merge(leafCircles)
      .attr("cx", (d) => d.radius * Math.cos(d.angle))
      .attr("cy", (d) => d.radius * Math.sin(d.angle))
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", (d) => (d._opacity !== undefined ? d._opacity : 1));

    if (clickHandler) {
      this._bindLeafClickHandlers(clickHandler);
    }

    return leafCircles;
  }

  /**
   * Renders internal nodes instantly without animation
   * @param {Array} internalNodeData - Array of D3 internal nodes
   * @returns {d3.Selection} The updated internal nodes selection
   */
  renderInternalNodesInstant(internalNodeData) {
    const internalNodes = this.svgContainer
      .selectAll(`.${this.internalNodeClass}`)
      .data(internalNodeData, getNodeKey);

    // EXIT
    internalNodes.exit().remove();

    // ENTER
    const enterSelection = internalNodes.enter()
      .append("circle")
      .attr("class", this.internalNodeClass)
      .attr("id", (d) => getNodeSvgId(d, "internal-node"))
      .attr("r", this.sizeConfig.internalNodeRadius || "0.2em")
      .style("stroke", TREE_COLOR_CATEGORIES.strokeColor)
      .attr("cx", (d) => d.source ? d.source.x : d.x) // Initial position for new nodes
      .attr("cy", (d) => d.source ? d.source.y : d.y);

    // MERGE and apply instant updates
    enterSelection.merge(internalNodes)
      .attr("cx", (d) => d.radius * Math.cos(d.angle))
      .attr("cy", (d) => d.radius * Math.sin(d.angle))
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", (d) => (d._opacity !== undefined ? d._opacity : 1));

    return internalNodes;
  }

  /**
   * Renders all nodes (leaves and internal) instantly without animation.
   * This is the primary method for scrubbing/interpolation.
   * @param {Array} allNodesData - Array of all D3 nodes from tree.descendants()
   * @param {Function} clickHandler - Optional click handler for leaf nodes
   */
  renderAllNodesInstant(allNodesData, clickHandler = null) {
    const leafData = allNodesData.filter(d => !d.children);
    const internalNodeData = allNodesData.filter(d => d.children);

    this.renderLeafCirclesInstant(leafData, clickHandler);
    this.renderInternalNodesInstant(internalNodeData);
  }

  /**
   * Renders all nodes (leaves + internal) with interpolation support (for animated transitions)
   * @param {Array} nodesFrom - Array of D3 nodes from source tree
   * @param {Array} nodesTo - Array of D3 nodes from target tree
   * @param {number} timeFactor - Time factor for controlling animation speed
   * @param {Function} clickHandler - Optional click handler function for leaf nodes
   */
  renderAllNodesInterpolated(nodesFrom, nodesTo, timeFactor, clickHandler) {
    // Separate leaf and internal nodes
    const leafDataFrom = nodesFrom.filter(d => !d.children);
    const leafDataTo = nodesTo.filter(d => !d.children);
    const internalDataFrom = nodesFrom.filter(d => d.children);
    const internalDataTo = nodesTo.filter(d => d.children);

    // Build maps for fast lookup
    const leafFromMap = new Map(leafDataFrom.map(node => [getNodeKey(node), node]));
    const internalFromMap = new Map(internalDataFrom.map(node => [getNodeKey(node), node]));

    // Render leaf circles
    const leafSelection = this.svgContainer
      .selectAll(`circle.${this.leafClass}`)
      .data(leafDataTo, getNodeKey);

    leafSelection.exit().remove();

    const enterLeafCircles = leafSelection.enter()
      .append("circle")
      .attr("class", this.leafClass)
      .attr("id", d => getNodeSvgId(d, "circle"))
      .attr("r", this.sizeConfig.leafRadius || "0.4em")
      .style("stroke", TREE_COLOR_CATEGORIES.strokeColor);

    enterLeafCircles.merge(leafSelection)
      .attr("cx", d => {
        const fromNode = leafFromMap.get(getNodeKey(d));
        if (fromNode) {
          // Set up previous positions for consistent interpolation
          d.prevAngle = fromNode.angle;
          d.prevRadius = fromNode.radius;

          // Use the same interpolation system as LinkRenderer
          const interpolatorFn = attrTweenCircleXWithT(timeFactor);
          const interpolator = interpolatorFn(d);
          return interpolator();
        }
        return d.radius * Math.cos(d.angle);
      })
      .attr("cy", d => {
        const fromNode = leafFromMap.get(getNodeKey(d));
        if (fromNode) {
          // Set up previous positions for consistent interpolation
          d.prevAngle = fromNode.angle;
          d.prevRadius = fromNode.radius;

          // Use the same interpolation system as LinkRenderer
          const interpolatorFn = attrTweenCircleYWithT(timeFactor);
          const interpolator = interpolatorFn(d);
          return interpolator();
        }
        return d.radius * Math.sin(d.angle);
      })
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", d => {
        const fromNode = leafFromMap.get(getNodeKey(d));
        return fromNode ? 1 : timeFactor;
      });

    // Render internal node circles
    const internalSelection = this.svgContainer
      .selectAll(`circle.${this.internalNodeClass}`)
      .data(internalDataTo, getNodeKey);

    internalSelection.exit().remove();

    const enterInternalCircles = internalSelection.enter()
      .append("circle")
      .attr("class", this.internalNodeClass)
      .attr("id", d => getNodeSvgId(d, "internal-node"))
      .attr("r", this.sizeConfig.internalNodeRadius || "0.2em")
      .style("stroke", TREE_COLOR_CATEGORIES.strokeColor);

    enterInternalCircles.merge(internalSelection)
      .attr("cx", d => {
        const fromNode = internalFromMap.get(getNodeKey(d));
        if (fromNode) {
          // Set up previous positions for consistent interpolation
          d.prevAngle = fromNode.angle;
          d.prevRadius = fromNode.radius;

          // Use the same interpolation system as LinkRenderer
          const interpolatorFn = attrTweenCircleXWithT(timeFactor);
          const interpolator = interpolatorFn(d);
          return interpolator();
        }
        return d.radius * Math.cos(d.angle);
      })
      .attr("cy", d => {
        const fromNode = internalFromMap.get(getNodeKey(d));
        if (fromNode) {
          // Set up previous positions for consistent interpolation
          d.prevAngle = fromNode.angle;
          d.prevRadius = fromNode.radius;

          // Use the same interpolation system as LinkRenderer
          const interpolatorFn = attrTweenCircleYWithT(timeFactor);
          const interpolator = interpolatorFn(d);
          return interpolator();
        }
        return d.radius * Math.sin(d.angle);
      })
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("opacity", d => {
        const fromNode = internalFromMap.get(getNodeKey(d));
        return fromNode ? 1 : timeFactor;
      });

    // Bind click handlers for leaf nodes if provided
    if (clickHandler) {
      this._bindLeafClickHandlers(clickHandler);
    }
  }


  /**
   * Updates node colors based on current marked components
   * @param {Set} markedComponents - Set of marked components for highlighting
   */
  updateNodeColors(markedComponents) {
    if (this.colorManager.updateMarkedComponents) {
      this.colorManager.updateMarkedComponents(markedComponents);
    }

    // Update colors for all nodes
    this.svgContainer.selectAll(`.${this.leafClass}`)
      .style("fill", (d) => this.colorManager.getNodeColor(d));

    this.svgContainer.selectAll(`.${this.internalNodeClass}`)
      .style("fill", (d) => this.colorManager.getNodeColor(d));
  }

  /**
   * Creates leaf exit selection directly from pre-filtered exiting leaf data
   * @param {Array} exitingLeaves - Array of leaf objects that should exit
   * @returns {d3.Selection} The exit selection
   * @private
   */
  _createLeafExitSelection(exitingLeaves) {
    if (exitingLeaves.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.leafClass}`)
      .data(exitingLeaves, getNodeKey)
      .exit();
  }

  /**
   * Creates leaf update selection directly from pre-filtered updating leaf data
   * @param {Array} updatingLeaves - Array of leaf objects that should update
   * @returns {d3.Selection} The update selection
   * @private
   */
  _createLeafUpdateSelection(updatingLeaves) {
    if (updatingLeaves.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.leafClass}`)
      .data(updatingLeaves, getNodeKey);
  }

  /**
   * Creates internal node exit selection directly from pre-filtered exiting internal node data
   * @param {Array} exitingInternalNodes - Array of internal node objects that should exit
   * @returns {d3.Selection} The exit selection
   * @private
   */
  _createInternalExitSelection(exitingInternalNodes) {
    if (exitingInternalNodes.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.internalNodeClass}`)
      .data(exitingInternalNodes, getNodeKey)
      .exit();
  }

  /**
   * Creates internal node update selection directly from pre-filtered updating internal node data
   * @param {Array} updatingInternalNodes - Array of internal node objects that should update
   * @returns {d3.Selection} The update selection
   * @private
   */
  _createInternalUpdateSelection(updatingInternalNodes) {
    if (updatingInternalNodes.length === 0) {
      return d3.select(null).selectAll(null); // Empty selection
    }

    return this.svgContainer
      .selectAll(`.${this.internalNodeClass}`)
      .data(updatingInternalNodes, getNodeKey);
  }

}
