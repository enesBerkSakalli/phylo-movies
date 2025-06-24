import * as d3 from "d3";
import ParseUtil from "../utils/ParseUtil.js";
import { LinkRenderer } from "./rendering/LinkRenderer.js";
import { NodeRenderer } from "./rendering/NodeRenderer.js";
import { ExtensionRenderer } from "./rendering/ExtensionRenderer.js";
import { ColorManager } from "./systems/ColorManager.js";
import { getLinkSvgId } from "./utils/KeyGenerator.js";

import {
  buildSvgStringTime,
  buildLinkExtensionTime,
  orientText,
  getOrientTextInterpolator,
  anchorCalc,
} from "./treeSvgGenerator.js";

let STYLE_MAP = {
  strokeWidth: "1", // Default stroke width
  fontSize: "1.7em",  // Default font size
};

export { STYLE_MAP };

/** Class For drawing Hierarchical Trees. */
export class TreeDrawer {

  /**
   * Create a TreeDrawer.
   * @param {Object} _currentRoot - The root of the tree structure.
   * @param {string} svgContainerId - The ID of the SVG container element.
   *        Defaults to "application", which has special handling for the main visualization's zoomable SVG.
   */
  constructor(_currentRoot, svgContainerId = "application") {
    this._colorInternalBranches = true;
    this.root = _currentRoot;
    this.marked = new Set(); // To store marked taxa/components for highlighting
    this.leaveOrder = []; // Stores the order of leaves, potentially for layout or comparison
    this._drawDuration = 1000; // Default animation duration
    this.s_edges = []; // Stores edges for comparison or additional rendering logic
    // Initialize instance properties that were previously static

    this.markedLabelList = []; // List of labels to be marked/highlighted
    this.parser = new ParseUtil(); // Utility for parsing SVG path data etc.

    this.svg_container = TreeDrawer.getSVG(svgContainerId);
    // Robust error handling: fail fast if SVG container is missing
    if (!this.svg_container || this.svg_container.empty()) {
      throw new Error(
        `TreeDrawer: SVG container with id "${svgContainerId}" not found in the DOM.`
      );
    }

    // Initialize rendering systems
    this.colorManager = new ColorManager(this.marked);
    this.linkRenderer = new LinkRenderer(this.svg_container, this.colorManager, STYLE_MAP);
    this.nodeRenderer = new NodeRenderer(this.svg_container, this.colorManager, STYLE_MAP);
    this.extensionRenderer = new ExtensionRenderer(this.svg_container, this.colorManager, STYLE_MAP);
  }

  /**
   * Get the D3 selection for the SVG container by id.
   * @param {string} svgContainerId - The id of the SVG or HTML container.
   * @returns {d3.Selection} The D3 selection of the SVG container.
   */
  static getSVG(svgContainerId) {
    // First try to select the element directly
    let container = d3.select(`#${svgContainerId}`);

    if (container.empty()) {
      throw new Error(`Container with id "${svgContainerId}" not found`);
    }

    // Handle the main application case - return the group element directly
    if (svgContainerId === "application") {
      return container;
    }

    // For comparison containers (groups), return them directly
    if (container.node().tagName.toLowerCase() === "g") {
      return container;
    }

    // For other containers, ensure proper SVG structure with centering
    return TreeDrawer._ensureSVGStructure(container);
  }

  /**
   * Ensures proper SVG structure with centered container group.
   * @param {d3.Selection} container - The container element.
   * @returns {d3.Selection} The tree container group.
   * @private
   */
  static _ensureSVGStructure(container) {
    // If the container is already an SVG
    if (container.node().tagName.toLowerCase() === "svg") {
      return TreeDrawer._ensureTreeContainer(container);
    }

    // Look for existing SVG child
    let svgChild = container.select("svg");
    if (svgChild.empty()) {
      // Create new SVG with proper dimensions
      const containerRect = container.node().getBoundingClientRect();
      const width = containerRect.width || 800;
      const height = containerRect.height || 600;

      svgChild = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block");
    }

    return TreeDrawer._ensureTreeContainer(svgChild);
  }

  /**
   * Ensures the SVG has a centered tree-container group.
   * @param {d3.Selection} svg - The SVG element.
   * @returns {d3.Selection} The tree container group.
   * @private
   */
  static _ensureTreeContainer(svg) {
    let treeContainer = svg.select(".tree-container");

    if (treeContainer.empty()) {
      const width = +svg.attr("width") || 800;
      const height = +svg.attr("height") || 600;

      treeContainer = svg
        .append("g")
        .attr("class", "tree-container")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
    }

    return treeContainer;
  }

  /**
   * Center the tree within its SVG container
   */
  centerTree() {
    // Handle the main application case - skip manual centering
    if (this.svg_container.attr("id") === "application") {
      // For the main application container ("application"), centering is handled by its existing
      // zoom and pan capabilities. Manual centering here would conflict with that.
      return;
    }

    const containerNode = this.svg_container.node();
    if (!containerNode) return;

    // For comparison containers (groups), don't modify their structure
    // They're already positioned correctly by TreeComparison
    if (containerNode.tagName.toLowerCase() === "g" &&
        containerNode.classList.contains("tree-container")) {
      return;
    }

    // For other containers, ensure proper centering
    const svgElement = this._findParentSVG(containerNode);
    if (!svgElement) return;

    // Update SVG dimensions based on current container size
    const containerRect = svgElement.getBoundingClientRect();
    const width = containerRect.width || svgElement.clientWidth || 800;
    const height = containerRect.height || svgElement.clientHeight || 600;

    // Update SVG attributes
    d3.select(svgElement)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Ensure we're working with the tree-container group
    this._ensureTreeContainerStructure(svgElement, width, height);
  }

  /**
   * Finds the parent SVG element for a given node.
   * @param {Node} node - The starting node.
   * @returns {Node|null} The parent SVG element or null if not found.
   * @private
   */
  _findParentSVG(node) {
    let current = node;
    while (current && current.tagName.toLowerCase() !== "svg") {
      current = current.parentElement;
    }
    return current;
  }

  /**
   * Ensures the tree-container structure exists and is properly centered.
   * Simplified version without complex comparison logic.
   */
  _ensureTreeContainerStructure(svgElement, width, height) {
    const svgSelection = d3.select(svgElement);
    let treeContainer = svgSelection.select(".tree-container");

    if (treeContainer.empty()) {
      // Move all existing elements to a new centered container
      const existingElements = this.svg_container.selectAll("*").remove();

      treeContainer = svgSelection
        .append("g")
        .attr("class", "tree-container")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

      // Re-append existing elements to the container
      existingElements.each(function () {
        treeContainer.node().appendChild(this);
      });

      this.svg_container = treeContainer;
    } else {
      // Update existing container position
      treeContainer.attr("transform", `translate(${width / 2}, ${height / 2})`);

      if (this.svg_container.attr("class") !== "tree-container") {
        this.svg_container = treeContainer;
      }
    }
  }

  /**
   * Returns an interpolator function for animating branch paths (arcs) during transitions.
   * It parses the existing 'd' attribute of the path and tweens it to the new path definition.
   * @memberof TreeDrawer
   * @returns {function(Object): function(number): string} A function that, when given link data `d`,
   * returns an interpolator function for use with D3's `attrTween`.
   * The interpolator function takes a time `t` (0 to 1) and returns the interpolated SVG path string.
   */
  getArcInterpolationFunction() {
    const self = this; // Keep a reference to 'this' TreeDrawer instance for access to 'this.parser'
    return function (d) {
      // 'this' inside this inner function refers to the DOM element (the path)
      let prev_d = d3.select(this).attr("d");
      // parse SVG to current positions/angles
      let pathArray = self.parser.parsePathData(prev_d);
      return function (t) {
        return buildSvgStringTime(d, t, pathArray);
      };
    };
  }

  /**
   * Returns an interpolator function for animating branch extension paths during transitions.
   * Similar to `getArcInterpolationFunction`, but for the dashed lines extending to leaf labels.
   * @memberof TreeDrawer
   * @param {number} currentMaxRadius - The current maximum radius of the tree layout, used to determine line end points.
   * @returns {function(Object): function(number): string} A function that, when given leaf data `d`,
   * returns an interpolator function for D3's `attrTween`.
   * The interpolator function takes a time `t` (0 to 1) and returns the interpolated SVG path string for the extension.
   */
  getLinkExtensionInterpolator(currentMaxRadius) {
    const self = this; // Keep a reference to 'this' TreeDrawer instance for access to 'this.parser'
    return function (d) {
      // 'this' inside this inner function refers to the DOM element (the path)
      let pathArray = self.parser.parsePathData(
        d3.select(this).attr("d")
      );
      return function (t) {
        return buildLinkExtensionTime(d, t, pathArray, currentMaxRadius);
      };
    };
  }

  /**
   * Generates a unique ID string for a link element based on its target node's split indices.
   * This ID is used to bind data to DOM elements in D3.
   * Now uses centralized key generation for consistency.
   * @memberof TreeDrawer
   * @param {Object} link - The D3 link object. The link's target node must have `data.split_indices`.
   * @returns {string} A unique ID string for the link (e.g., "link-0-1-2").
   */
  getLinkId(link) {
    return getLinkSvgId(link);
  }

  /**
   * Draws and updates the tree branch paths (links) using LinkRenderer.
   * Now delegates to the specialized LinkRenderer for better separation of concerns.
   * Highlights edges whose split_indices match any in this.s_edges.
   * @param {Array|null} linksSubset - Optional subset of links to render.
   * @returns {d3.Selection} The updated links selection.
   */
  updateLinks(linksSubset = null) {
    const linksData = linksSubset || this.root.links();

    // Delegate rendering to LinkRenderer, passing s_edges for highlighting
    return this.linkRenderer.render(
      linksData,
      null,
      this.getArcInterpolationFunction(),
      this.drawDuration,
      "easePolyInOut",
      this.s_edges // <-- pass s_edges for highlighting
    );
  }

  /**
   * Draws and updates the branch extension paths using ExtensionRenderer.
   * Now delegates to the specialized ExtensionRenderer for better separation of concerns.
   */
  updateLinkExtension(currentMaxRadius) {
    // Calculate extension end point with standard buffer
    const extensionEndRadius = currentMaxRadius + 20;

    // Delegate rendering to ExtensionRenderer
    return this.extensionRenderer.renderExtensions(
      this.root.leaves(),
      extensionEndRadius,
      this.getLinkExtensionInterpolator(extensionEndRadius),
      this.drawDuration,
      "easePolyInOut"
    );
  }

  /**
   * Draws and updates the leaf label text elements using the original coordinate-based approach.
   * Uses D3's general update pattern with proper interpolation functions from treeSvgGenerator.
   */
  updateLabels(currentMaxRadius) {
    console.log('[TreeDrawer] updateLabels called with original coordinate system', currentMaxRadius);
    const labelRadius = currentMaxRadius + 30; // Standard label positioning

    // Use D3's general update pattern with original coordinate handling
    const labels = this.svg_container
      .selectAll(".label")
      .data(this.root.leaves(), (d) => d.data.name);

    // Remove exiting labels
    labels.exit()
      .transition("exitLabels")
      .duration(this.drawDuration / 2)
      .style("opacity", 0)
      .remove();

    // Add entering labels with initial positioning
    const enteringLabels = labels.enter()
      .append("text")
      .attr("class", "label")
      .attr("dy", ".31em")
      .style("font-size", STYLE_MAP.fontSize || "1.2em")
      .attr("font-weight", "bold")
      .attr("font-family", "Courier New")
      .text((d) => d.data.name)
      .style("opacity", 0)
      .attr("transform", (d) => orientText(d, labelRadius))
      .attr("text-anchor", (d) => anchorCalc(d))
      .style("fill", (d) => this.colorManager.getNodeColor(d));

    // Merge enter and update selections
    const allLabels = labels.merge(enteringLabels);

    // Apply transitions with original interpolation functions
    if (this.drawDuration > 0) {
      allLabels
        .transition("updateLabels")
        .duration(this.drawDuration)
        .ease(d3.easePolyInOut)
        .style("opacity", 1)
        .attrTween("transform", getOrientTextInterpolator(labelRadius))
        .attr("text-anchor", (d) => anchorCalc(d))
        .style("fill", (d) => this.colorManager.getNodeColor(d));
    } else {
      // No animation - set final positions directly
      allLabels
        .attr("transform", (d) => orientText(d, labelRadius))
        .attr("text-anchor", (d) => anchorCalc(d))
        .style("opacity", 1)
        .style("fill", (d) => this.colorManager.getNodeColor(d));
    }

    // Apply font size updates to all existing labels
    if (STYLE_MAP && STYLE_MAP.fontSize) {
      allLabels.style("font-size", STYLE_MAP.fontSize);
    }

    console.log('[TreeDrawer] Label update completed with original coordinate system');
    return allLabels;
  }

  /**
   * Draws and updates the leaf circle nodes using NodeRenderer.
   * Now delegates to the specialized NodeRenderer for better separation of concerns.
   */
  updateLeafCircles(currentMaxRadius) {

    // Delegate rendering to NodeRenderer with click handler
    return this.nodeRenderer.renderLeafCircles(
      this.root.leaves(),
      currentMaxRadius,
      this.drawDuration,
      "easePolyInOut",
    );
  }

  /**
   * Sets the animation duration for tree drawing transitions.
   * @memberof TreeDrawer
   * @param {number} duration - The duration in milliseconds. Must be a non-negative number.
   */
  set drawDuration(duration) {
    if (typeof duration === 'number' && duration >= 0) {
      this._drawDuration = duration;
    } else {
      console.warn(`TreeDrawer: Invalid duration value provided: ${duration}. Using current value: ${this._drawDuration}.`);
    }
  }

  /**
   * Gets the current animation duration for tree drawing transitions.
   * @memberof TreeDrawer
   * @returns {number} The duration in milliseconds.
   */
  get drawDuration() {
    return this._drawDuration;
  }

  /**
   * Synchronizes all renderer configurations and updates
   * @param {Object} options - Options for rendering
   */
  synchronizeRenderers(options = {}) {
    // Update color manager for all renderers
    this.colorManager.updateMarkedComponents(this.marked);

    // Update size configuration for all renderers
    this.linkRenderer.updateSizeConfig(STYLE_MAP);
    this.nodeRenderer.updateSizeConfig(STYLE_MAP);
    this.extensionRenderer.updateSizeConfig(STYLE_MAP);

    // Update color manager for all renderers
    this.linkRenderer.updateColorManager(this.colorManager);
    this.nodeRenderer.updateColorManager(this.colorManager);
    this.extensionRenderer.updateColorManager(this.colorManager);
  }

  /**
   * Renders all tree elements with synchronized timing and configuration
   * @param {number} currentMaxRadius - The maximum radius of the tree
   * @param {Object} options - Rendering options
   */
  renderAllElements(currentMaxRadius, options = {}) {
    // Synchronize all renderers first
    this.synchronizeRenderers(options);

    // Render elements in sequence for better synchronization
    this.updateLinks();
    this.updateLinkExtension(currentMaxRadius);
    this.updateLabels(currentMaxRadius);
    this.updateLeafCircles(currentMaxRadius);
  }

}

/**
 * Main function to draw/update a tree visualization using the TreeDrawer class.
 * It instantiates TreeDrawer, configures it with provided parameters, and calls its rendering methods.
 *
 * @export
 * @param {Object} params - Named parameters for tree drawing.
 * @param {Object} params.treeConstructor - An object containing the tree structure and layout information.
 * @param {Set<Array<number>>} params.toBeHighlighted - A Set where each element is an array (or Set) of `split_indices` representing a component of leaves to be highlighted.
 * @param {number} params.drawDurationFrontend - Animation duration in milliseconds for D3 transitions.
 * @param {Array<string>} params.leaveOrder - An array specifying the desired order of leaves.
 * @param {string|number} params.fontSize - Font size for labels (e.g., "1.5em" or 1.5).
 * @param {string|number} params.strokeWidth - Stroke width for branches.
 * @param {string} [params.svgContainerId="application"] - The ID of the SVG container element where the tree will be drawn.
 * @param {Array|Set} [params.s_edges=[]] - Edges to highlight.
 * @param {Object} [params.options={}] - Additional options.
 * @returns {boolean} True if the drawing process was initiated successfully.
 */
export default function drawTree({
  treeConstructor,
  toBeHighlighted,
  drawDurationFrontend,
  leaveOrder,
  fontSize,
  strokeWidth,
  svgContainerId = "application",
  s_edges = [],
  atomCovers = [], // Accept atomCovers as a parameter
  monophyleticColoring = true, // Enable/disable monophyletic coloring
  options = {}
}) {
  let currentRoot = treeConstructor["tree"];
  let currentMaxRadius = treeConstructor["max_radius"];

  // For comparison views, reduce sizes to fit better
  const isComparison = svgContainerId.includes('comparison') ||
                       svgContainerId.includes('tree1') ||
                       svgContainerId.includes('tree2') ||
                       svgContainerId.includes('group');
  const fontSizeAdjustment = isComparison ? 0.75 : 1; // More aggressive font size reduction
  const strokeAdjustment = isComparison ? 0.8 : 1;

  let treeDrawerInstance = new TreeDrawer(currentRoot, svgContainerId);

  // Adjust font and stroke sizes for comparison views
  let normalizedFontSize = fontSize;
  if (typeof normalizedFontSize === 'string' && !normalizedFontSize.match(/(px|em|rem|pt|%)$/)) {
    normalizedFontSize = normalizedFontSize + 'em';
  } else if (typeof normalizedFontSize === 'number') {
    normalizedFontSize = normalizedFontSize + 'em';
  }
  STYLE_MAP.fontSize = `${parseFloat(normalizedFontSize) * fontSizeAdjustment}em`;

  console.log(`TreeDrawer: Using font size ${STYLE_MAP.fontSize} for labels.`);

  STYLE_MAP.strokeWidth = strokeWidth * strokeAdjustment;

  treeDrawerInstance.drawDuration = drawDurationFrontend;
  treeDrawerInstance.leaveOrder = leaveOrder;
  treeDrawerInstance.marked = toBeHighlighted;
  treeDrawerInstance.s_edges = s_edges;

  // Set monophyletic coloring option
  treeDrawerInstance.colorManager.setMonophyleticColoring(monophyleticColoring);

  // --- Pass atomCovers to label rendering for background highlighting ---
  // Note: These options are used in updateLabels() method internally

  // Draw all tree elements with synchronized timing and configuration
  treeDrawerInstance.renderAllElements(currentMaxRadius, { ...options, atomCovers });
  return true;
}
