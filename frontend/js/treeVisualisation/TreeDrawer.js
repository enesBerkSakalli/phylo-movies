import * as d3 from "d3";
import ParseUtil from "./ParseUtil.js";
// Removed empty import for treeSvgGenerator.js as functions are imported by name
import {COLOR_MAP} from "./ColorMap.js";

import {
  buildSvgString,
  buildSvgStringTime,
  buildLinkExtensionTime,
  buildSvgLinkExtension,
  orientText,
  getOrientTextInterpolator,
  anchorCalc,
  attr2TweenCircleX,
  attr2TweenCircleY,
} from "./treeSvgGenerator.js";

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

    // Initialize instance properties that were previously static
    this.sizeMap = {
      strokeWidth: "1", // Default stroke width
      fontSize: "1.7em",  // Default font size
    };
    this.markedLabelList = []; // List of labels to be marked/highlighted
    this.parser = new ParseUtil(); // Utility for parsing SVG path data etc.

    this.svg_container = TreeDrawer.getSVG(svgContainerId);
    // Robust error handling: fail fast if SVG container is missing
    if (!this.svg_container || this.svg_container.empty()) {
      throw new Error(
        `TreeDrawer: SVG container with id "${svgContainerId}" not found in the DOM.`
      );
    }
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
      // The main application SVG ("#application") is expected to be set up with a zoomable <g> element.
      // This <g> element itself is returned, as TreeDrawer will append directly to it.
      // Centering and viewbox are managed by the zoom behavior in the main application.
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

    // For other containers, ensure proper centering
    this._ensureProperCentering();
  }

  /**
   * Ensures proper centering for non-main application containers.
   * @private
   */
  _ensureProperCentering() {
    const containerNode = this.svg_container.node();
    if (!containerNode) return;

    // Find the parent SVG element
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
   * @param {Node} svgElement - The SVG element.
   * @param {number} width - The SVG width.
   * @param {number} height - The SVG height.
   * @private
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

      // Update the svg_container reference
      this.svg_container = treeContainer;
    } else {
      // Update existing container position
      treeContainer.attr("transform", `translate(${width / 2}, ${height / 2})`);

      // Ensure svg_container points to the tree-container
      if (this.svg_container.attr("class") !== "tree-container") {
        this.svg_container = treeContainer;
      }
    }
  }

  // Static properties 'markedLabelList' and 'parser' are now instance properties,
  // initialized in the constructor. Their static declarations are removed.
  // static markedLabelList = [];
  // static parser = new ParseUtil();

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
   * Example: link.target.data.split_indices = [0, 1, 2] -> "link-0-1-2"
   * @memberof TreeDrawer
   * @param {Object} link - The D3 link object. The link's target node must have `data.split_indices`.
   * @returns {string} A unique ID string for the link (e.g., "link-0-1-2").
   */
  getLinkId(link) {
    return `link-${link.target.data.split_indices.join("-")}`;
  }

  /**
   * Generates an SVG ID selector (e.g., "#link-0-1-2") for a leaf node's corresponding link.
   * This is typically used to find the link element associated with a leaf.
   * Assumes `getLinkId` structure for consistency.
   * @memberof TreeDrawer
   * @param {Object} node - The D3 node object for a leaf. Must have `data.split_indices` and `parent`.
   * @returns {string|null} The SVG ID selector string, or null if the node has no parent (e.g., root node).
   */
  generateLinkIdForLeave(node) {
    if (node.parent) {
      return `#link-${node.data.split_indices.join("-")}`;
    } else {
      return null;
    }
  }

  /**
   * Draws and updates the tree branch paths (links) using D3's general update pattern.
   * Handles enter, update, and exit selections for branch paths.
   * @memberof TreeDrawer
   * @param {Array<Object>|null} [linksSubset=null] - Optional subset of D3 link objects to draw or update.
   *                                                If null, all links from `this.root.links()` are used.
   * @returns {void}
   */
  updateLinks(linksSubset = null) {
    // Only center for non-main application containers
    if (this.svg_container.attr("id") !== "application") {
      this.centerTree();
    }

    const linksData = linksSubset || this.root.links();
    let links = this.svg_container
      .selectAll(".links")
      .data(linksData, (d) => this.getLinkId(d));

    // EXIT old elements not present in new data.
    links.exit().remove();

    // ENTER new elements present in new data.
    links
      .enter()
      .append("path")
      .style("stroke", (d) => this.colorBranches(d))
      .attr("class", "links")
      .attr("stroke-width", this.sizeMap.strokeWidth) // Use instance property 'this.sizeMap'
      .attr("fill", "none")
      .attr("id", (d) => this.getLinkId(d))
      .attr("d", (d) => buildSvgString(d))
      .style("stroke-opacity", 1)
      .attr("neededHighlightingTaxa", 0);

    // UPDATE old elements present in new data.
    links
      .attr("stroke-width", this.sizeMap.strokeWidth) // Use instance property 'this.sizeMap'
      .style("stroke", (d) => this.colorBranches(d))
      .transition()
      .ease(d3.easePolyInOut) // changed from d3.easeCubic
      .duration(this.drawDuration)
      .attrTween("d", this.getArcInterpolationFunction());
  }

  /**
   * Determines the color for a branch based on whether any of its descendant leaves are marked.
   * It checks if the branch's `target.data.split_indices` (representing all leaves under that branch)
   * form a complete subset of any single marked component's indices.
   * @memberof TreeDrawer
   * @param {Object} d - The D3 link data object for the branch.
   *                     `d.target.data.split_indices` contains indices of leaves under this branch.
   * @returns {string} The color string (e.g., hex code) for the branch.
   *                   Returns `COLOR_MAP.colorMap.markedColor` if highlighted, otherwise `COLOR_MAP.colorMap.defaultColor`.
   */
  colorBranches(d) {
    if (this.marked.size === 0) {
      return COLOR_MAP.colorMap.defaultColor; // No items are marked, so all branches are default color.
    } else {
      // Create a Set from the current branch's target node's leaf split indices.
      // These indices represent all leaves descending from this branch.
      const treeSplit = new Set(d.target.data.split_indices);
      // Iterate over each marked component (a set of leaf indices).
      for (const components of this.marked) {
        const markedSet = new Set(components); // Ensure 'components' is a Set for efficient lookup.
        // Check if all indices in treeSplit (leaves under this branch) are present in the current markedSet.
        // This means this branch leads exclusively to a subset of currently marked leaves from ONE component.
        const isSubset = [...treeSplit].every((x) => markedSet.has(x));
        if (isSubset) {
          return COLOR_MAP.colorMap.markedColor; // Highlight this branch.
        }
      }
      return COLOR_MAP.colorMap.defaultColor; // This branch does not lead exclusively to a fully marked component.
    }
  }

  /**
   * Draws and updates the branch extension paths (dashed lines from terminal branches to leaf labels).
   * Uses D3's general update pattern (join, exit, enter, update).
   * @memberof TreeDrawer
   * @param {number} currentMaxRadius - The current maximum radius of the tree layout, used for positioning extensions.
   * @returns {void}
   */
  updateLinkExtension(currentMaxRadius) {
    // JOIN new data with old elements.
    const linkExtension = this.svg_container
      .selectAll(".link-extension") //updates the links
      .data(this.root.leaves(), (leaf) => {
        return leaf.data.name.toString();
      });

    // UPDATE old elements present in new data.
    linkExtension
      .transition()
      .attr("stroke-width", this.sizeMap.strokeWidth) // Use instance property 'this.sizeMap'
      .ease(d3.easePolyInOut) // changed from d3.easeExpInOut
      .duration(this.drawDuration)
      .attrTween("d", this.getLinkExtensionInterpolator(currentMaxRadius - 40))
      .style("stroke", (d) => this.colorCircle(d));

    // ENTER new elements present in new data.
    linkExtension
      .enter()
      .append("path")
      .attr("class", "link-extension")

      .attr("stroke-width", this.sizeMap.strokeWidth) // Use instance property 'this.sizeMap'
      .attr("stroke-dasharray", () => {
        return "5,5";
      })
      .attr("fill", "none")
      .attr("d", (d) => {
        return buildSvgLinkExtension(d, currentMaxRadius - 40);
      })
      .style("stroke", (d) => this.colorCircle(d));
  }

  /**
   * Draws and updates the leaf label text elements using D3's general update pattern.
   * @memberof TreeDrawer
   * @param {number} currentMaxRadius - The current maximum radius of the tree layout, used for positioning labels.
   * @returns {void}
   */
  updateLabels(currentMaxRadius) {
    // JOIN new data with old svg elements
    const textLabels = this.svg_container
      .selectAll(".label")
      .data(this.root.leaves(), (d) => {
        return d.data.name;
      });

    // UPDATE old elements present in new data
    textLabels
      .transition()
      .ease(d3.easeSinInOut) // changed from d3.easeExpInOut
      .duration(this.drawDuration)
      .attrTween("transform", getOrientTextInterpolator(currentMaxRadius))
      .attr("text-anchor", (d) => anchorCalc(d))
      .style("font-size", this.sizeMap.fontSize) // Use instance property 'this.sizeMap'
      .style("fill", (d) => this.colorCircle(d));

    // ENTER new elements present in new data
    textLabels
      .enter()
      .append("text")
      .style("fill", (d) => this.colorCircle(d))
      .attr("class", "label")
      .attr("id", (d) => {
        return `label-${d.data.split_indices}`;
      })
      .attr("dy", ".31em")
      .style("font-size", this.sizeMap.fontSize) // Use instance property 'this.sizeMap'
      .text((d) => {
        return `${d.data.name}`;
      })
      .attr("transform", (d) => orientText(d, currentMaxRadius))
      .attr("text-anchor", (d) => anchorCalc(d))
      .attr("font-weight", "bold")
      .attr("font-family", "Courier New")
      .style("fill", (d) => this.colorCircle(d));
  }

  /**
   * Draws and updates the leaf circle nodes using D3's general update pattern.
   * Attaches a click event listener to these circles for node flipping (handled by `this.flipNode`).
   * @memberof TreeDrawer
   * @param {number} currentMaxRadius - The current maximum radius of the tree layout, used for positioning circles.
   * @returns {void}
   */
  updateLeafCircles(currentMaxRadius) {
    // JOIN new data with old svg elements
    const leaf_circles = this.svg_container
      .selectAll(".leaf")
      .data(this.root.leaves(), (d) => {
        return d.data.split_indices;
      });

    // UPDATE old elements present in new data
    leaf_circles
      .style("fill", (d) => this.colorCircle(d))
      .transition()
      .ease(d3.easeSinInOut) // changed from d3.easeExpInOut
      .duration(this.drawDuration)
      .attrTween("cx", attr2TweenCircleX(currentMaxRadius))
      .attrTween("cy", attr2TweenCircleY(currentMaxRadius))
      .style("fill", (d) => this.colorCircle(d));

    // ENTER new elements present in new data
    leaf_circles
      .enter()
      .append("circle")
      .style("fill", (d) => this.colorCircle(d))
      .attr("id", (d) => {
        return `circle-${d.data.split_indices}`;
      })
      .attr("class", "leaf")
      .attr("cx", (d) => {
        return (currentMaxRadius - 30) * Math.cos(d.angle);
      })
      .attr("cy", (d) => {
        return (currentMaxRadius - 30) * Math.sin(d.angle);
      })
      .style("stroke", COLOR_MAP.colorMap.strokeColor)
      .attr("stroke-width", "0.1em")
      .attr("r", "0.4em");

    d3.selectAll(".leaf").on("click", (event, d) => {
      this.flipNode(d);
    });
  }

  /**
   * Calculates and updates a 'neededHighlightingTaxa' attribute on a link element.
   * This attribute seems to count how many highlighted taxa (by specific name, from `this.markedLabelList`)
   * are descendants of this link.
   * Note: This method's utility depends on how `this.markedLabelList` is populated.
   *       It's initialized as an empty array in the constructor and not directly populated by `drawTree`'s `toBeHighlighted` parameter.
   * @memberof TreeDrawer
   * @param {Object} ancestor - The D3 node object (typically a leaf or an internal node considered as an ancestor).
   * @param {string} nodeName - The name of a specific node (taxon) to check against `this.markedLabelList`.
   * @returns {void}
   */
  calculateHighlightingTaxa(ancestor, nodeName) {
    const linkId = this.generateLinkIdForLeave(ancestor); // Get the ID of the link leading to this ancestor.
    if (!linkId) return; // No parent link.

    const svgElement = d3.select(linkId);
    if (svgElement.empty()) return; // Link element not found.

    let neededHighlightingTaxa = svgElement.attr("neededHighlightingTaxa");
    neededHighlightingTaxa =
      neededHighlightingTaxa == null ? 0 : parseInt(neededHighlightingTaxa, 10);

    // If the given nodeName is in the list of marked labels, increment the count.
    if (this.markedLabelList.includes(nodeName)) {
      neededHighlightingTaxa += 1;
    }
    svgElement.attr("neededHighlightingTaxa", neededHighlightingTaxa);
  }

  /**
   * Determines the color for a leaf circle or label.
   * If the leaf's `split_indices` are a subset of any marked component (from `this.marked`), it gets the marked color.
   * Otherwise, it attempts to get a color from `COLOR_MAP.colorMap` based on the leaf's name.
   * @memberof TreeDrawer
   * @param {Object} d - The D3 node data object for a leaf.
   *                     `d.data.split_indices` contains its own indices.
   *                     `d.data.name` is the leaf's name.
   * @returns {string} The color string. Defaults to `COLOR_MAP.colorMap.defaultColor` if no specific color found.
   */
  colorCircle(d) {
    // Check if this leaf is part of any marked component.
    const treeSplit = new Set(d.data.split_indices); // Indices of the current leaf.
    for (const components of this.marked) { // `this.marked` is a Set of components (arrays/sets of split_indices)
      const markedSet = new Set(components);
      // Check if this leaf's indices are a subset of the current marked component.
      // For a single leaf, this means its indices must be within the marked component.
      const isSubset = [...treeSplit].every((x) => markedSet.has(x));
      if (isSubset) {
        return COLOR_MAP.colorMap.markedColor; // Highlight this leaf.
      }
    }
    // If not part of a marked component, try to get a color by its name.
    // Fallback to defaultColor if name not in COLOR_MAP or if COLOR_MAP.colorMap[d.data.name] is undefined.
    return COLOR_MAP.colorMap[d.data.name] || COLOR_MAP.colorMap.defaultColor;
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
}

/**
 * Main function to draw/update a tree visualization using the TreeDrawer class.
 * It instantiates TreeDrawer, configures it with provided parameters, and calls its rendering methods.
 *
 * @export
 * @param {Object} treeConstructor - An object containing the tree structure and layout information.
 *                                 Expected to have `tree` (the D3 hierarchy root) and `max_radius`.
 * @param {Set<Array<number>>} toBeHighlighted - A Set where each element is an array (or Set) of `split_indices`
 *                                        representing a component of leaves to be highlighted.
 *                                        This is assigned to `treeDrawerInstance.marked`.
 * @param {number} drawDurationFrontend - Animation duration in milliseconds for D3 transitions.
 * @param {Array<string>} leaveOrder - An array specifying the desired order of leaves. (Currently assigned to `treeDrawerInstance.leaveOrder` but not directly used in drawing methods shown).
 * @param {string|number} fontSize - Font size for labels (e.g., "1.5em" or 1.5).
 * @param {string|number} strokeWidth - Stroke width for branches.
 * @param {string} [svgContainerId="application"] - The ID of the SVG container element where the tree will be drawn.
 * @param {Object} [options={}] - Additional options (currently not used in the function body, but could be for future extensions like `instant` drawing).
 * @returns {boolean} True if the drawing process was initiated successfully.
 */
export default function drawTree(
  treeConstructor,
  toBeHighlighted, // This is a Set of components (arrays/sets of split_indices)
  drawDurationFrontend,
  leaveOrder,
  fontSize,
  strokeWidth,
  svgContainerId = "application",
  options = {}
) {
  let currentRoot = treeConstructor["tree"];
  let currentMaxRadius = treeConstructor["max_radius"] + 30;

  let treeDrawerInstance = new TreeDrawer(currentRoot, svgContainerId);

  // Update instance properties for sizeMap
  treeDrawerInstance.sizeMap.fontSize = `${fontSize}em`;
  treeDrawerInstance.sizeMap.strokeWidth = strokeWidth;

  treeDrawerInstance.drawDuration = drawDurationFrontend;
  treeDrawerInstance.leaveOrder = leaveOrder;
  treeDrawerInstance.marked = new Set(toBeHighlighted); // This is for component highlighting

  // Note: `treeDrawerInstance.markedLabelList` is initialized as [] in the constructor.
  // If `calculateHighlightingTaxa` relies on specific labels being populated into this list
  // via the `drawTree` function, that logic needs to be added here or where `toBeHighlighted`
  // (if it were a list of labels) is processed.
  // For now, `markedLabelList` is an instance property that can be managed by other methods if needed.
  // The current `toBeHighlighted` (a Set of components) is used for branch/circle coloring via `treeDrawerInstance.marked`.

  console.log("TreeDrawer: Marked taxa for highlighting (components):", treeDrawerInstance.marked);
  console.log("toBeHighlighted (components for coloring):", toBeHighlighted);


  // Draw all tree elements
  treeDrawerInstance.updateLinks();
  treeDrawerInstance.updateLinkExtension(currentMaxRadius);
  treeDrawerInstance.updateLabels(currentMaxRadius);
  treeDrawerInstance.updateLeafCircles(currentMaxRadius);

  return true;
}
