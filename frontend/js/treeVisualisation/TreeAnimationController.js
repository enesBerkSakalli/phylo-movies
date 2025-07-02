import * as d3 from "d3";
import ParseUtil from "../utils/ParseUtil.js";
import { LinkRenderer } from "./rendering/LinkRenderer.js";
import { NodeRenderer } from "./rendering/NodeRenderer.js";
import { ExtensionRenderer } from "./rendering/ExtensionRenderer.js";
import { LabelRenderer } from "./rendering/LabelRenderer.js";
import { ColorManager } from "./systems/ColorManager.js";
import { getLinkSvgId } from "./utils/KeyGenerator.js";
import { buildSvgStringTime } from "./treeSvgGenerator.js";
import { TreeConstructor } from "./LayoutCalculator.js";

let STYLE_MAP = {
  strokeWidth: "1",
  fontSize: "1.7em",
};

export { STYLE_MAP };

/**
 * Controller class for orchestrating hierarchical tree animations and rendering.
 * Coordinates animation stages and manages multiple renderers.
 */
export class TreeAnimationController {
  /**
   * Create a TreeAnimationController.
   * @param {Object} _currentRoot - The root of the D3 hierarchy structure.
   * @param {string} svgContainerId - The ID of the target container element.
   */
  constructor(_currentRoot, svgContainerId = "application") {
    this.containerId = svgContainerId;
    this.root = _currentRoot; // Can be null initially
    this.marked = new Set();
    this.leaveOrder = [];
    this._drawDuration = 1000;
    this.lattice_edges = [];
    this.parser = new ParseUtil();

    // Layout calculator management - test reusing single instance
    this.layoutCalculator = null;
    this.ignoreBranchLengths = false;

    this.svg_container = this._initializeContainer(svgContainerId);

    this.colorManager = new ColorManager(this.marked);
    this.linkRenderer = new LinkRenderer(this.svg_container, this.colorManager, STYLE_MAP);
    this.nodeRenderer = new NodeRenderer(this.svg_container, this.colorManager, STYLE_MAP);
    this.extensionRenderer = new ExtensionRenderer(this.svg_container, this.colorManager, STYLE_MAP);
    this.labelRenderer = new LabelRenderer(this.svg_container, this.colorManager, STYLE_MAP);

    // Track tree types for transition detection
    this.currentTreeType = null;
    this.previousTreeType = null;
  }

  /**
   * Initializes the SVG container, creating it if necessary, and ensures a centered
   * drawing group exists. This is the single source of truth for container setup.
   * @private
   */
  _initializeContainer(containerId) {
    const containerSelection = d3.select(`#${containerId}`);
    if (containerSelection.empty()) {
      throw new Error(`TreeAnimationController: SVG container with id "${containerId}" not found.`);
    }

    // If the target is the main application's zoomable group, use it directly.
    if (containerId === "application" && containerSelection.node().tagName.toLowerCase() === "g") {
      return containerSelection;
    }

    // For comparison modals, the container is a div. We need to find or create the SVG and the centered group.
    const parentSvgNode = containerSelection.node().closest('svg');
    let svg = parentSvgNode ? d3.select(parentSvgNode) : containerSelection.select('svg');

    if (svg.empty()) {
      const rect = containerSelection.node().getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 600;
      svg = containerSelection.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);
    }

    let treeContainer = svg.select("g.tree-container");
    if (treeContainer.empty()) {
      const width = +svg.attr("width") || (svg.node().getBoundingClientRect().width);
      const height = +svg.attr("height") || (svg.node().getBoundingClientRect().height);
      treeContainer = svg.append("g")
        .attr("class", "tree-container")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
    }
    return treeContainer;
  }

  getArcInterpolationFunction() {
    const self = this;
    return function (d) {
      let prev_d = d3.select(this).attr("d");
      let pathArray = self.parser.parsePathData(prev_d);
      return function (t) {
        return buildSvgStringTime(d, t, pathArray);
      };
    };
  }

  getLinkId(link) {
    return getLinkSvgId(link);
  }

  set drawDuration(duration) {
    if (typeof duration === 'number' && duration >= 0) {
      this._drawDuration = duration;
    } else {
      console.warn(`TreeAnimationController: Invalid duration: ${duration}. Using current value.`);
    }
  }

  get drawDuration() {
    return this._drawDuration;
  }

  synchronizeRenderers() {
    this.colorManager.updateMarkedComponents(this.marked);
    const renderers = [this.linkRenderer, this.nodeRenderer, this.extensionRenderer, this.labelRenderer];
    renderers.forEach(renderer => {
      renderer.updateSizeConfig(STYLE_MAP);
      renderer.updateColorManager(this.colorManager);
    });
  }

  async renderAllElements() {
    this.synchronizeRenderers();
    await this.renderWithCoordinatedAnimations();
  }

  async renderWithCoordinatedAnimations() {
    try {
      if (!this.root) {
        console.error("[TreeAnimationController] No root node available for rendering.");
        return;
      }

      const linksData = this.root.links();
      
      // Check if we're transitioning from IT to C
      const isITtoCTransition = this.previousTreeType === 'IT' && this.currentTreeType === 'C';
      
      // Adjust duration based on transition type
      let adjustedDuration = this.drawDuration;
      let stageDuration = this.drawDuration / 3;
      
      if (isITtoCTransition) {
        console.log('[TreeAnimationController] Detected IT->C transition, adjusting animation timings');
        // For IT->C transitions, we want enter animations to be slower
        adjustedDuration = this.drawDuration * 1.2; // 20% slower overall for smoother enter
        stageDuration = adjustedDuration / 3;
      }

      const linkStages = this.linkRenderer.getAnimationStages(
        linksData,
        this.getArcInterpolationFunction(),
        adjustedDuration,
        "easeCubicInOut",  // Smoother than easePolyInOut
        this.lattice_edges
      );

      await this._executeEnterStage(linkStages, isITtoCTransition);
      await this._executeUpdateStage(linkStages, stageDuration);
      await this._executeExitStage(linkStages, isITtoCTransition);

    } catch (error) {
      console.error("[TreeAnimationController] Error in renderWithCoordinatedAnimations:", error, {
        rootExists: !!this.root,
        linkRendererExists: !!this.linkRenderer,
        drawDuration: this.drawDuration
      });
      throw error;
    }
  }

  /** @private */
  async _executeEnterStage(linkStages, isITtoCTransition) {
    if (linkStages.enterSelection.empty()) {
      return;
    }
    
    // The enter stage will use the adjusted duration from getAnimationStages
    await linkStages.stage1();
  }

  /** @private */
  async _executeUpdateStage(linkStages, stageDuration) {
    const updatePromises = [];
    const leaves = this.root.leaves();
    const maxLeafRadius = leaves.length > 0 ? Math.max(...leaves.map(d => d.radius)) : 0;

    if (!linkStages.updateSelection.empty()) {
      updatePromises.push(linkStages.stage2());
    }

    updatePromises.push(this.extensionRenderer.renderExtensionsWithPromise(leaves, maxLeafRadius + 20, stageDuration));
    updatePromises.push(this.labelRenderer.renderUpdating(leaves, maxLeafRadius + 30, stageDuration));
    updatePromises.push(this.nodeRenderer.renderLeafCirclesWithPromise(leaves, maxLeafRadius, stageDuration, "easeCircleInOut"));

    await Promise.all(updatePromises);
  }

  /** @private */
  async _executeExitStage(linkStages, isITtoCTransition) {
    if (linkStages.exitSelection.empty()) {
      return;
    }
    
    try {
      // For IT->C transitions, make deletions instant
      if (isITtoCTransition) {
        // Override the stage3 animation to be instant
        linkStages.exitSelection
          .transition("link-exit")
          .duration(0) // Instant removal
          .style("stroke-opacity", 0)
          .attr("stroke-width", 0)
          .remove();
        
        // Wait a minimal time to ensure DOM updates
        await new Promise(resolve => setTimeout(resolve, 10));
        return;
      } else {
        // Normal animated exit for other transitions
        await linkStages.stage3();
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.source && error.target) {
        console.error("[TreeAnimationController] Stage 3 (Exit) threw a link object as error:", error);
        throw new Error(`Stage 3 animation failed with malformed link: source=${error.source.id}, target=${error.target.id}`);
      }
      throw error;
    }
  }

  /**
   * Update layout with new tree data, reusing layout calculator when possible.
   * @param {Object} treeData - Raw tree data
   * @param {boolean} ignoreBranchLengths - Whether to ignore branch lengths
   * @returns {Object} Layout object with tree, dimensions, etc.
   */
  updateLayout(treeData, ignoreBranchLengths = false) {
    // Create fresh D3 hierarchy from tree data
    const d3hierarchy = d3.hierarchy(treeData);

    // Use fixed dimensions - 800x600 should be enough for most cases
    const width = 800;
    const height = 600;

    // Reuse TreeConstructor instance instead of creating fresh one
    if (!this.layoutCalculator || this.ignoreBranchLengths !== ignoreBranchLengths) {
      this.layoutCalculator = new TreeConstructor(d3hierarchy, ignoreBranchLengths);
      this.ignoreBranchLengths = ignoreBranchLengths;
    } else {
      // Update the root with new tree data
      this.layoutCalculator.root = d3hierarchy;
    }

    this.layoutCalculator.setDimension(width, height);
    this.layoutCalculator.setMargin(40);

    const layoutResult = this.layoutCalculator.constructRadialTree();

    // Update root with the calculated tree
    this.root = layoutResult;

    return {
      tree: layoutResult,
      max_radius: this.layoutCalculator.getMaxRadius(layoutResult),
      width: width,
      height: height,
      margin: this.layoutCalculator.margin,
      scale: this.layoutCalculator.scale
    };
  }


  /**
   * Update parameters of the TreeAnimationController instance.
   * @param {Object} params - Parameters to update
   */
  updateParameters({
    root,
    treeData,
    ignoreBranchLengths,
    drawDuration,
    marked,
    leaveOrder,
    lattice_edges = [],
    fontSize,
    strokeWidth,
    monophyleticColoring,
    currentTreeType,
    previousTreeType
  }) {
    // Handle layout updates - prefer treeData over root
    if (treeData) {
      this.updateLayout(treeData, ignoreBranchLengths);
    } else if (root) {
      this.root = root;
    }

    if (drawDuration !== undefined) this.drawDuration = drawDuration;
    if (marked !== undefined) {
      // Transform the data into an array of sets.
      if (Array.isArray(marked) && marked.length > 0) {
        // Check if this is an array of arrays (expected format) or a single array of indices
        const isArrayOfArrays = marked.every(item => Array.isArray(item));

        if (isArrayOfArrays) {
          // Expected format: array of arrays -> each inner array becomes a Set
          this.marked = marked.map((innerArray) => {
            return new Set(innerArray);
          });
        } else {
          // Single array of indices -> wrap in array and convert to Set
          this.marked = [new Set(marked)];
        }
      } else if (marked instanceof Set && marked.size > 0) {
        this.marked = [marked]; // Wrap single Set in array
      } else {
        this.marked = []; // Empty or invalid data
      }

      // Ensure ColorManager is immediately updated
      this.colorManager.updateMarkedComponents(this.marked);
    }
    if (leaveOrder) this.leaveOrder = leaveOrder;
    if (lattice_edges) this.lattice_edges = lattice_edges;


    // Update style if provided
    if (fontSize !== undefined) {
      const normalizedFontSize = typeof fontSize === 'number' ? `${fontSize}em` : fontSize;
      STYLE_MAP.fontSize = normalizedFontSize;
    }
    if (strokeWidth !== undefined) {
      STYLE_MAP.strokeWidth = strokeWidth;
    }

    // Update monophyletic coloring
    if (monophyleticColoring !== undefined) {
      this.colorManager.setMonophyleticColoring(monophyleticColoring);
    }

    // Update tree type information
    if (currentTreeType !== undefined) this.currentTreeType = currentTreeType;
    if (previousTreeType !== undefined) this.previousTreeType = previousTreeType;
  }

  /**
   * Static method to render a tree - simplified without caching.
   * This is the main entry point that replaces the standalone drawTree function.
   */
  static async draw({
    treeConstructor,
    toBeHighlighted = new Set(),
    drawDurationFrontend = 1000,
    leaveOrder = [],
    fontSize = "1.7em",
    strokeWidth = 1,
    svgContainerId = "application",
    lattice_edges = [],
    monophyleticColoring = true,
  }) {
    // Validation
    if (!treeConstructor || !treeConstructor.tree) {
      console.error("[TreeAnimationController.draw] Invalid treeConstructor object provided. Aborting.");
      return false;
    }

    const currentRoot = treeConstructor.tree;
    const isComparison = svgContainerId !== "application";
    const fontSizeAdjustment = isComparison ? 0.75 : 1;
    const strokeAdjustment = isComparison ? 0.8 : 1;

    // Create new instance (simplified - no caching)
    const instance = new TreeAnimationController(currentRoot, svgContainerId);

    // Normalize font size
    let normalizedFontSize = fontSize;
    if (typeof normalizedFontSize === 'number') {
      normalizedFontSize = `${normalizedFontSize}em`;
    }
    const finalFontSize = `${parseFloat(normalizedFontSize) * fontSizeAdjustment}em`;
    const finalStrokeWidth = strokeWidth * strokeAdjustment;

    // Update STYLE_MAP
    STYLE_MAP.fontSize = finalFontSize;
    STYLE_MAP.strokeWidth = finalStrokeWidth;

    // Set parameters directly
    instance.drawDuration = drawDurationFrontend;
    instance.leaveOrder = leaveOrder;
    instance.marked = toBeHighlighted;
    instance.lattice_edges = lattice_edges;
    instance.colorManager.setMonophyleticColoring(monophyleticColoring);

    // Ensure ColorManager is synchronized with marked components
    instance.colorManager.updateMarkedComponents(instance.marked);

    // Render
    try {
      await instance.renderAllElements();
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && error.source && error.target) {
        console.error("[TreeAnimationController.draw] D3 threw a link object as error. Tree structure may be malformed or contain circular references.", error);
        throw new Error(`Tree rendering failed: malformed link detected (source and target may be the same node).`);
      }
      console.error("[TreeAnimationController.draw] Tree rendering failed:", error);
      throw error;
    }
  }


}

/**
 * Main function to draw/update a tree visualization.
 * Uses TreeAnimationController.draw() for coordinated animation rendering.
 * Kept for backward compatibility.
 */
export default async function drawTree(params) {
  return await TreeAnimationController.draw(params);
}
