import * as d3 from "d3";
import { useAppStore } from '../../store.js';
import { COLOR_MAP } from "../../treeColoring/ColorMap.js";
import { attrTweenCircleX, attrTweenCircleY } from "../radialTreeGeometry.js";
import { getNodeKey, getNodeSvgId } from "../utils/KeyGenerator.js";
import { getEasingFunction } from "../utils/animationUtils.js";

/**th
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

    // Cache for previous node positions to avoid DOM parsing
    this.previousPositionsCache = new Map();
  }


  /**
   * Updates the cache with current node positions
   * @param {Array} nodesData - Array of node objects
   */
  updatePositionsCache(nodesData) {
    for (const node of nodesData) {
      const nodeKey = getNodeKey(node);
      this.previousPositionsCache.set(nodeKey, {
        angle: node.angle,
        radius: node.radius
      });
    }
  }

  /**
   * Sets previous positions on node data from cache
   * @param {Array} nodesData - Array of node objects
   */
  setPreviousPositions(nodesData) {
    for (const node of nodesData) {
      const nodeKey = getNodeKey(node);
      if (this.previousPositionsCache.has(nodeKey)) {
        const cached = this.previousPositionsCache.get(nodeKey);
        node.prevAngle = cached.angle;
        node.prevRadius = cached.radius;
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
    this.previousPositionsCache.clear();
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
   * Renders leaf circles with Stage 2 timing coordination (Update only - no enter/exit needed)
   * Since leaf circles always exist for every leaf, we only need to animate position updates
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} maxLeafRadius - Maximum radius for positioning (unused but kept for API consistency)
   * @param {number} stageDuration - Stage 2 duration (should be totalDuration/3)
   * @param {string} easing - D3 easing function name (default: "easePolyInOut")
   * @param {Function} clickHandler - Optional click handler function
   * @returns {Promise} Promise that resolves when Stage 2 animation completes
   */
  renderLeafCirclesWithPromise(leafData, maxLeafRadius, stageDuration = 333, easing = "easePolyInOut", clickHandler = null) {
    // Handle empty data case
    if (!leafData || leafData.length === 0) {
      return Promise.resolve();
    }

    // Set previous positions from cache before animation
    this.setPreviousPositions(leafData);

    // JOIN: Bind data to existing elements (circles should already exist)
    const leafCircles = this.svgContainer
      .selectAll(`.${this.leafClass}`)
      .data(leafData, getNodeKey);

    // ENTER: Create any missing circles (should be rare since leaves are constant)
    const enterCircles = leafCircles.enter()
      .append("circle")
      .attr("class", this.leafClass)
      .attr("id", (d) => getNodeSvgId(d, "circle"))
      .attr("cx", (d) => d.radius * Math.cos(d.angle))
      .attr("cy", (d) => d.radius * Math.sin(d.angle))
      .attr("r", this.sizeConfig.leafRadius || "0.4em")
      .attr("stroke-width", this.sizeConfig.leafStrokeWidth || "0.1em")
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .style("stroke", COLOR_MAP.colorMap.strokeColor);

    // EXIT: Remove any extra circles (should be rare since leaves are constant)
    leafCircles.exit().remove();

    // UPDATE: Animate all circles (merged enter + existing) to new positions
    const allCircles = leafCircles.merge(enterCircles);

    if (allCircles.empty()) {
      return Promise.resolve();
    }

    const easingFunction = getEasingFunction(easing);

    // Stage 2 Animation: Move circles to new positions with synchronized timing
    const transition = allCircles
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .transition("leaf-circles-stage2-update")
      .ease(easingFunction)
      .duration(stageDuration) // Use stage duration for synchronization
      .attrTween("cx", attrTweenCircleX())
      .attrTween("cy", attrTweenCircleY())
      .style("fill", (d) => this.colorManager.getNodeColor(d));

    // Bind click handlers if provided
    if (clickHandler) {
      this._bindLeafClickHandlers(clickHandler);
    }

    // Convert D3 transition to Promise with proper error handling
    return transition.end().then(() => {
      // Update cache after animation completes
      this.updatePositionsCache(leafData);
    }).catch(() => {});
  }

  /**
   * Renders leaf circles instantly without animation (for scrubbing/interpolation)
   * @param {Array} leafData - Array of D3 leaf nodes from tree.leaves()
   * @param {number} currentMaxRadius - Maximum radius for positioning
   * @param {Function} clickHandler - Optional click handler function
   * @returns {d3.Selection} The updated leaf circles selection
   */
  renderLeafCirclesInstant(leafData, currentMaxRadius, clickHandler = null) {
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
      .style("stroke", COLOR_MAP.colorMap.strokeColor)
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
      .style("stroke", COLOR_MAP.colorMap.strokeColor)
      .attr("cx", (d) => d.source ? d.source.x : d.x) // Initial position for new nodes
      .attr("cy", (d) => d.source ? d.source.y : d.y);

    // MERGE and apply instant updates with transition
    // MERGE and apply instant updates with transition
    enterSelection.merge(internalNodes)
      .attr("cx", (d) => d.radius * Math.cos(d.angle))
      .attr("cy", (d) => d.radius * Math.sin(d.angle))
      .style("fill", (d) => this.colorManager.getInternalNodeColor(d))
      .style("opacity", (d) => (d._opacity !== undefined ? d._opacity : 1));

    return internalNodes;
  }

  /**
   * Renders all nodes (leaves and internal) instantly without animation.
   * This is the primary method for scrubbing/interpolation.
   * @param {Array} allNodesData - Array of all D3 nodes from tree.descendants()
   * @param {number} maxRadius - Maximum radius for positioning leaf nodes
   * @param {Function} clickHandler - Optional click handler for leaf nodes
   */
  renderAllNodesInstant(allNodesData, maxRadius, clickHandler = null) {
    const leafData = allNodesData.filter(d => !d.children);
    const internalNodeData = allNodesData.filter(d => d.children);

    this.renderLeafCirclesInstant(leafData, maxRadius, clickHandler);
    this.renderInternalNodesInstant(internalNodeData);
  }

  /**
   * Renders nodes with interpolation support (for animated transitions)
   * @param {Array} nodesFrom - Array of D3 nodes with interpolated positions
   * @param {number} timeFactor - Time factor for controlling animation speed
   * @param {Function} clickHandler - Optional click handler function
   */
  renderAllNodesInterpolated(nodesFrom, nodesTo, maxRadiusFrom, maxRadiusTo, timeFactor, clickHandler) {
    // Only animate leaves (outer circles)
    const leafDataFrom = nodesFrom.filter(d => !d.children);
    const leafDataTo = nodesTo.filter(d => !d.children);

    // Build a map from key to from-node for fast lookup
    const fromMap = new Map();
    for (const node of leafDataFrom) {
      fromMap.set(getNodeKey(node), node);
    }

    // For each to-node, set prevAngle/prevRadius from the matching from-node
    for (const node of leafDataTo) {
      const fromNode = fromMap.get(getNodeKey(node));
      if (fromNode) {
        node.prevAngle = fromNode.angle;
        node.prevRadius = fromNode.radius;
      } else {
        node.prevAngle = node.angle;
        node.prevRadius = node.radius;
      }
    }

    // D3 data join and update using robust keys for leaves only
    const selection = this.svgContainer
      .selectAll("circle.leaf")
      .data(leafDataTo, getNodeKey);

    selection.exit().remove();

    const enter = selection.enter()
      .append("circle")
      .attr("class", "leaf")
      .attr("id", d => getNodeSvgId(d, "circle"))
      .attr("r", d => d.radius)
      .style("stroke", COLOR_MAP.colorMap.strokeColor);

    // For scrubbing: set attributes directly for the current timeFactor (no transition)
    const merged = enter.merge(selection)
      .attr("cx", d => {
        // Calculate interpolated x position
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          const fromX = fromNode.radius * Math.cos(fromNode.angle);
          const toX = d.radius * Math.cos(d.angle);
          return fromX + (toX - fromX) * timeFactor;
        }
        return d.radius * Math.cos(d.angle);
      })
      .attr("cy", d => {
        // Calculate interpolated y position
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          const fromY = fromNode.radius * Math.sin(fromNode.angle);
          const toY = d.radius * Math.sin(d.angle);
          return fromY + (toY - fromY) * timeFactor;
        }
        return d.radius * Math.sin(d.angle);
      })
      .style("fill", (d) => this.colorManager.getNodeColor(d))
      .attr("r", d => {
        // Use a fixed visual radius for the circle display (not the tree layout radius)
        return this.sizeConfig.leafRadius; // Use leafRadius from styleConfig
      })
      .style("opacity", d => {
        const fromNode = fromMap.get(getNodeKey(d));
        if (fromNode) {
          return 1; // Always visible if exists in both
        } else {
          return timeFactor; // Fade in if only in target
        }
      });

    // Optionally update color, opacity, etc.
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
      .style("fill", (d) => this.colorManager.getInternalNodeColor(d));
  }
}
