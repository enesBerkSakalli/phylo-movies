import * as d3 from "d3";
import ParseUtil from "./ParseUtil.js";
import {} from "./treeSvgGenerator.js";
import{COLOR_MAP} from "./ColorMap.js";

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


  static sizeMap = {
    strokeWidth: "1",
    fontSize: "1.7em",
  };

  /**
   * Create a TreeDrawer.
   * @param _currentRoot
   */
  constructor(_currentRoot, svgContainerId = "application") {
    this._colorInternalBranches = true;
    this.root = _currentRoot;
    this.marked = new Set();
    this.leaveOrder = [];
    this._drawDuration = 1000;
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
      // The main application uses zoom, so return the existing group
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
      // The main application uses zoom transforms, don't interfere
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

  //marked labels list
  static markedLabelList = [];

  static parser = new ParseUtil();

  /**
   *
   * @return {void}
   */
  /**
   * Returns an interpolator function for animating branch paths.
   * @returns {function(Object): function(Number): string} Interpolator for D3 transitions.
   */
  getArcInterpolationFunction() {
    return function (d) {
      // previous svg instance
      let prev_d = d3.select(this).attr("d");
      // parse SVG to current positions/angles
      let pathArray = TreeDrawer.parser.parsePathData(prev_d);
      return function (t) {
        return buildSvgStringTime(d, t, pathArray);
      };
    };
  }

  /**
   *
   * @return {function(*): function(*): *}
   */
  /**
   * Returns an interpolator function for animating branch extension paths.
   * @param {number} currentMaxRadius - The current maximum radius for the tree layout.
   * @returns {function(Object): function(Number): string} Interpolator for D3 transitions.
   */
  getLinkExtensionInterpolator(currentMaxRadius) {
    return function (d) {
      // parse SVG to current positions/angles
      let pathArray = TreeDrawer.parser.parsePathData(
        d3.select(this).attr("d")
      );
      return function (t) {
        return buildLinkExtensionTime(d, t, pathArray, currentMaxRadius);
      };
    };
  }

  /**
   * Generating id for a link by combining the name of the source node name and the target name
   * @param  {Object} link
   * @return {string}
   */
  /**
   * Generate a unique id for a link based on its target node's split indices.
   * @param {Object} link - The link object with target node data.
   * @returns {string} The unique link id.
   */
  getLinkId(link) {
    return `link-${link.target.data.split_indices.join("-")}`;
  }

  /**
   * Generating the path for a leave.
   * @param  {Object} ancestor
   * @return {string|null}
   */
  /**
   * Generate the SVG id selector for a leaf node's link.
   * @param {Object} node - The node object.
   * @returns {string|null} The SVG id selector or null if no parent.
   */
  generateLinkIdForLeave(node) {
    if (node.parent) {
      return `#link-${node.data.split_indices.join("-")}`;
    } else {
      return null;
    }
  }

  /**
   * This function is drawing the branches of the trees.
   * @param {Array} linksSubset Optional. If provided, only animate these links.
   * @return {void}
   */
  /**
   * Draws and updates the tree branch paths.
   * @param {Array|null} linksSubset - Optional subset of links to animate.
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
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .attr("fill", "none")
      .attr("id", (d) => this.getLinkId(d))
      .attr("d", (d) => buildSvgString(d))
      .style("stroke-opacity", 1)
      .attr("neededHighlightingTaxa", 0);

    // UPDATE old elements present in new data.
    links
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .style("stroke", (d) => this.colorBranches(d))
      .transition()
      .ease(d3.easePolyInOut) // changed from d3.easeCubic
      .duration(this.drawDuration)
      .attrTween("d", this.getArcInterpolationFunction());
  }

  /**
   * Determines the color for a branch based on marked taxa.
   * @param {Object} d - The branch data object.
   * @returns {string} The color for the branch.
   */
  colorBranches(d) {
    if (this.marked.size === 0) {
      return COLOR_MAP.colorMap.defaultColor;
    } else {
      // Create a Set from the current leave split indices
      const treeSplit = new Set(d.target.data.split_indices);
      // Iterate over each marked components
      for (const components of this.marked) {
        // Assume 'components' is iterable (e.g., an array)
        const markedSet = new Set(components);
        // Check if treeSplit is subset of markedSet
        const isSubset = [...treeSplit].every((x) => markedSet.has(x));
        if (isSubset) {
          return COLOR_MAP.colorMap.markedColor;
        }
      }
      return COLOR_MAP.colorMap.defaultColor;
    }
  }

  /**
   * This function is drawing the extension of the branches in the trees.
   * @return {void}
   */
  /**
   * Draws and updates the branch extension paths.
   * @param {number} currentMaxRadius - The current maximum radius for the tree layout.
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
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .ease(d3.easePolyInOut) // changed from d3.easeExpInOut
      .duration(this.drawDuration)
      .attrTween("d", this.getLinkExtensionInterpolator(currentMaxRadius - 40))
      .style("stroke", (d) => this.colorCircle(d));

    // ENTER new elements present in new data.
    linkExtension
      .enter()
      .append("path")
      .attr("class", "link-extension")

      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
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
   * Draws and updates the leaf label text elements.
   * @param {number} currentMaxRadius - The current maximum radius for the tree layout.
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
      .style("font-size", TreeDrawer.sizeMap.fontSize)
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
      .style("font-size", TreeDrawer.sizeMap.fontSize)
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
   * Draws and updates the leaf circle nodes.
   * @param {number} currentMaxRadius - The current maximum radius for the tree layout.
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
   * Calculates and updates the highlighting taxa count for a given ancestor and node name.
   * @param {Object} ancestor - The ancestor node.
   * @param {string} nodeName - The name of the node to check for highlighting.
   * @returns {void}
   */
  calculateHighlightingTaxa(ancestor, nodeName) {
    const linkId = this.generateLinkIdForLeave(ancestor);
    if (!linkId) return;
    const svgElement = d3.select(linkId);
    if (svgElement.empty()) return;
    let neededHighlightingTaxa = svgElement.attr("neededHighlightingTaxa");
    neededHighlightingTaxa =
      neededHighlightingTaxa == null ? 0 : parseInt(neededHighlightingTaxa);
    if (TreeDrawer.markedLabelList.includes(nodeName)) {
      neededHighlightingTaxa += 1;
    }
    svgElement.attr("neededHighlightingTaxa", neededHighlightingTaxa);
  }

  /**
   * Determines the color for a leaf node or label based on marked taxa.
   * @param {Object} d - The node data object.
   * @returns {string} The color for the node or label.
   */
  colorCircle(d) {
    const treeSplit = new Set(d.data.split_indices);
    for (const components of this.marked) {
      // Assume 'components' is iterable (e.g., an array)
      const markedSet = new Set(components);
      // Check if treeSplit is subset of markedSet
      const isSubset = [...treeSplit].every((x) => markedSet.has(x));
      if (isSubset) {
        return COLOR_MAP.colorMap.markedColor;
      }
    }
    return COLOR_MAP.colorMap[d.data.name];
  }

  /**
   * Set the animation duration for tree transitions.
   * @param {number} duration - The duration in milliseconds.
   */
  set drawDuration(duration) {
    this._drawDuration = duration;
  }

  /**
   * Get the animation duration for tree transitions.
   * @returns {number} The duration in milliseconds.
   */
  get drawDuration() {
    return this._drawDuration;
  }
}

/**
 * @param treeConstructor
 * @param toBeHighlighted
 * @param drawDurationFrontend
 * @param leaveOrder
 * @param fontSize
 * @param strokeWidth
 * @param svgContainerId
 * @param options (optional) - { instant: true } disables staged animation
 * @returns {boolean}
 */
export default function drawTree(
  treeConstructor,
  toBeHighlighted,
  drawDurationFrontend,
  leaveOrder,
  fontSize,
  strokeWidth,
  svgContainerId = "application",
  options = {}
) {
  let currentRoot = treeConstructor["tree"];
  let currentMaxRadius = treeConstructor["max_radius"] + 30;

  let currentTreeDrawer = new TreeDrawer(currentRoot, svgContainerId);

  TreeDrawer.sizeMap.fontSize = `${fontSize}em`;
  TreeDrawer.sizeMap.strokeWidth = strokeWidth;

  currentTreeDrawer.drawDuration = drawDurationFrontend;

  // Set up highlighting for jumping taxa

  console.log("TreeDrawer: Marked taxa for highlighting:", currentTreeDrawer.marked);
  console.log(toBeHighlighted);

  currentTreeDrawer.leaveOrder = leaveOrder;
  currentTreeDrawer.marked = new Set(toBeHighlighted);

  // Draw all tree elements
  currentTreeDrawer.updateLinks();
  currentTreeDrawer.updateLinkExtension(currentMaxRadius);
  currentTreeDrawer.updateLabels(currentMaxRadius);
  currentTreeDrawer.updateLeafCircles(currentMaxRadius);

  return true;
}
