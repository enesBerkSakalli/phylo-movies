import * as d3 from "d3";
import { useAppStore } from '../store.js';
import { LinkRenderer } from "./rendering/LinkRenderer.js";
import { NodeRenderer } from "./rendering/NodeRenderer.js";
import { ExtensionRenderer } from "./rendering/ExtensionRenderer.js";
import { LabelRenderer } from "./rendering/LabelRenderer.js";
import { ColorManager } from "./systems/ColorManager.js";
import { RadialTreeLayout } from "./RadialTreeLayout.js";



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
    this._drawDuration = 1000;
    this.lattice_edges = [];



    // Transition tracking for phase-aware animations
    this.previousTreeIndex = -1;
    this.currentTreeIndex = -1;
    this.transitionResolver = null;

    // Radius preservation for animation consistency
    this.previousMaxLeafRadius = 0;
    this.isInITtoCTransition = false;
    this.preservedTransitionRadius = 0;

    // Layout calculator management - test reusing single instance
    this.layoutCalculator = null;
    this.ignoreBranchLengths = false;
    this.margin = 40; // Default margin, can be overridden

    this.svg_container = this._initializeContainer(svgContainerId);

    const { styleConfig } = useAppStore.getState();
    this.colorManager = new ColorManager(this.marked);
    this.linkRenderer = new LinkRenderer(this.svg_container, this.colorManager, styleConfig);
    this.nodeRenderer = new NodeRenderer(this.svg_container, this.colorManager, styleConfig);
    this.extensionRenderer = new ExtensionRenderer(this.svg_container, this.colorManager, styleConfig);
    this.labelRenderer = new LabelRenderer(this.svg_container, this.colorManager, styleConfig);
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

    // If the target is the main application's zoom-able group, use it directly.
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
        .attr("class", "tree-container");
    }
    return treeContainer;
  }


  set drawDuration(duration) {
    if (typeof duration === 'number' && duration >= 0) {
      this._drawDuration = duration;
    }
  }

  get drawDuration() {
    return this._drawDuration;
  }

  synchronizeRenderers() {
    this.colorManager.updateMarkedComponents(this.marked);
  }

  async renderAllElements() {
    this.synchronizeRenderers();
    await this.renderWithCoordinatedAnimations();
  }

  async renderWithCoordinatedAnimations() {
    try {
      if (!this.root) {
        return;
      }

      const linksData = this.root.links();
      const leaves = this.root.leaves();

      const currentMaxLeafRadius = leaves.length > 0 ? Math.max(...leaves.map(d => d.radius)) : 0;

      // Determine animation strategy and transition type
      const animationStrategy = this.getAnimationStrategy();
      const transitionType = this.transitionResolver?.getTransitionType(this.previousTreeIndex, this.currentTreeIndex);
      const isCurrentlyITtoC = animationStrategy === 'exit_first' && (transitionType?.isITDownToC || transitionType?.isITUpToC);

      let maxLeafRadius;

      if (isCurrentlyITtoC) {
        // Starting an IT → C transition: preserve the radius throughout the entire transition
        if (!this.isInITtoCTransition) {
          this.preservedTransitionRadius = currentMaxLeafRadius;
          this.isInITtoCTransition = true;
        }
        maxLeafRadius = this.preservedTransitionRadius;
      } else {
        // Not in IT → C transition anymore
        if (this.isInITtoCTransition) {
          // Just finished an IT → C transition, reset
          this.isInITtoCTransition = false;
          this.preservedTransitionRadius = 0;
        }
        // Use current radius (normal behavior)
        maxLeafRadius = currentMaxLeafRadius;
      }

      this.previousMaxLeafRadius = currentMaxLeafRadius;

      const linkStages = this.linkRenderer.getAnimationStages(
        linksData,
        this.drawDuration,
        this.lattice_edges
      );

      if (animationStrategy === 'exit_first') {
        // IT_DOWN → C: Simultaneous exit + update with complementary easing
        // IT_UP → C: Standard exit first, then enter + update
        const transitionType = this.transitionResolver?.getTransitionType(this.previousTreeIndex, this.currentTreeIndex);

        if (transitionType?.isITDownToC) {
          const simultaneousPromises = [
            linkStages.stage3(), // Exit old elements
            linkStages.stage2(), // Update existing elements
            this.extensionRenderer.renderExtensionsWithPromise(leaves, maxLeafRadius + 20, this.drawDuration, "easeInQuad"),
            this.labelRenderer.renderUpdating(leaves, maxLeafRadius + 30, this.drawDuration, "easeInQuad"),
            this.nodeRenderer.renderLeafCirclesWithPromise(leaves, maxLeafRadius, this.drawDuration, "easeInQuad")
          ];
          await Promise.all(simultaneousPromises);

          await linkStages.stage1();
        } else {
          const simultaneousPromises = [
            linkStages.stage3(), // Exit old elements
            linkStages.stage2(), // Update existing elements
            this.extensionRenderer.renderExtensionsWithPromise(leaves, maxLeafRadius + 20, this.drawDuration, "easeInQuad"),
            this.labelRenderer.renderUpdating(leaves, maxLeafRadius + 30, this.drawDuration, "easeInQuad"),
            this.nodeRenderer.renderLeafCirclesWithPromise(leaves, maxLeafRadius, this.drawDuration, "easeInQuad")
          ];
          await Promise.all(simultaneousPromises);

          await linkStages.stage1();
        }

      } else if (animationStrategy === 'animate_then_enter') {
        const updatePromises = [
          linkStages.stage2(), // Update existing links
          linkStages.stage3(), // Exit old elements
          this.extensionRenderer.renderExtensionsWithPromise(leaves, maxLeafRadius + 20, this.drawDuration, "easeSinInOut"),
          this.labelRenderer.renderUpdating(leaves, maxLeafRadius + 30, this.drawDuration, "easeSinInOut"),
          this.nodeRenderer.renderLeafCirclesWithPromise(leaves, maxLeafRadius, this.drawDuration, "easeSinInOut")
        ];
        await Promise.all(updatePromises);

        await linkStages.stage1();

      } else {
        await linkStages.stage1(); // Enter new elements

        const updatePromises = [
          linkStages.stage2(), // Update links
          this.extensionRenderer.renderExtensionsWithPromise(leaves, maxLeafRadius + 20, this.drawDuration, "easeSinInOut"),
          this.labelRenderer.renderUpdating(leaves, maxLeafRadius + 30, this.drawDuration, "easeSinInOut"),
          this.nodeRenderer.renderLeafCirclesWithPromise(leaves, maxLeafRadius, this.drawDuration, "easeSinInOut")
        ];
        await Promise.all(updatePromises);

        await linkStages.stage3(); // Exit old elements
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Determines the animation strategy based on transition type.
   * @returns {string} Animation strategy: 'default', 'exit_first', or 'animate_then_enter'
   */
  getAnimationStrategy() {
    if (!this.transitionResolver || this.previousTreeIndex === -1 || this.currentTreeIndex === -1) {
      return 'default';
    }

    try {
      const transitionType = this.transitionResolver.getTransitionType(this.previousTreeIndex, this.currentTreeIndex);
      return transitionType.animationStrategy;
    } catch (error) {
      return 'default';
    }
  }


  /**
   * Calculates a tree layout without modifying the controller's state.
   * @param {Object} treeData - Raw tree data.
   * @param {boolean} ignoreBranchLengths - Whether to ignore branch lengths.
   * @returns {Object} A layout object with tree, dimensions, etc.
   */
  calculateLayout(treeData, ignoreBranchLengths) {
    const d3hierarchy = d3.hierarchy(treeData);

    let width, height;
    const svgNode = this.svg_container.node().closest('svg');

    if (svgNode) {
      const viewBox = svgNode.getAttribute('viewBox');
      if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
        width = vbWidth;
        height = vbHeight;
      } else {
        const svgRect = svgNode.getBoundingClientRect();
        width = svgRect.width;
        height = svgRect.height;
      }
    } else {
      const appContainer = document.getElementById('application-container');
      if (appContainer) {
        const rect = appContainer.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      } else {
        width = 800;
        height = 600;
      }
    }

    const layoutCalculator = new RadialTreeLayout(d3hierarchy, ignoreBranchLengths);
    layoutCalculator.setDimension(width, height);
    layoutCalculator.setMargin(this.margin || 40);

    const layoutResult = layoutCalculator.constructRadialTree();

    return {
      tree: layoutResult,
      max_radius: layoutCalculator.getMaxRadius(layoutResult),
      width: width,
      height: height,
      margin: layoutCalculator.margin,
      scale: layoutCalculator.scale
    };
  }

  /**
   * Update layout with new tree data, reusing layout calculator when possible.
   * @param {Object} treeData - Raw tree data
   * @param {boolean} ignoreBranchLengths - Whether to ignore branch lengths
   * @returns {Object} Layout object with tree, dimensions, etc.
   */
  updateLayout(treeData, ignoreBranchLengths = false) {
    const layout = this.calculateLayout(treeData, ignoreBranchLengths);

    this.root = layout.tree;
    this.ignoreBranchLengths = ignoreBranchLengths;

    if (!this.svg_container.attr("transform")) {
      this.svg_container.attr("transform", `translate(${layout.width / 2},${layout.height / 2})`);
    }

    return layout;
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
    lattice_edges = [],
    fontSize,
    strokeWidth,
    monophyleticColoring,
    treeIndex,
    transitionResolver
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
    if (lattice_edges) this.lattice_edges = lattice_edges;


    // Update style if provided
    const { setStyleConfig } = useAppStore.getState();
    if (fontSize !== undefined) {
      const normalizedFontSize = typeof fontSize === 'number' ? `${fontSize}em` : fontSize;
      setStyleConfig({ fontSize: normalizedFontSize });
    }
    if (strokeWidth !== undefined) {
      setStyleConfig({ strokeWidth: strokeWidth });
    }

    // Update monophyletic coloring
    if (monophyleticColoring !== undefined) {
      this.colorManager.setMonophyleticColoring(monophyleticColoring);
    }

    // Update transition tracking for phase-aware animations
    if (transitionResolver !== undefined) {
      this.transitionResolver = transitionResolver;
    }
    if (treeIndex !== undefined) {
      this.previousTreeIndex = this.currentTreeIndex;
      this.currentTreeIndex = treeIndex;
    }
  }

  /**
   * Sets the transition resolver for phase-aware animations.
   * @param {Object} transitionResolver - TransitionIndexResolver instance
   */
  setTransitionResolver(transitionResolver) {
    this.transitionResolver = transitionResolver;
  }

  /**
   * Updates the current tree index for transition tracking.
   * @param {number} treeIndex - Current tree index
   */
  updateTreeIndex(treeIndex) {
    this.previousTreeIndex = this.currentTreeIndex;
    this.currentTreeIndex = treeIndex;

    // --- PATCH: Use store actions for step parameters (strokeWidth, fontSize) ---
    if (this.transitionResolver && this.transitionResolver.treeMetadata) {
      const metadata = this.transitionResolver.treeMetadata[this.currentTreeIndex];
      if (metadata) {
        const { strokeWidth, fontSize } = metadata;
        const store = useAppStore.getState();
        let updated = false;
        if (typeof strokeWidth !== 'undefined') {
          store.setStrokeWidth(strokeWidth);
          updated = true;
        }
        if (typeof fontSize !== 'undefined') {
          store.setFontSize(fontSize);
          updated = true;
        }
        if (updated) {
          // Get latest values from store and update styleConfig
          const styleUpdate = {
            strokeWidth: store.strokeWidth,
            fontSize: typeof store.fontSize === 'number' ? `${store.fontSize}em` : store.fontSize
          };
          store.setStyleConfig(styleUpdate);
          this.synchronizeRenderers();
        }
      }
    }
  }


  /**
   * RENDERER-BASED SCRUBBING METHOD (NO DATA-SIDE INTERPOLATION)
   *
   * Interpolates between two tree layouts by passing both layouts and the interpolation factor (t)
   * directly to the renderers, which handle all interpolation using D3 and SVG utilities.
   *
   * @param {Object} fromTreeData - Source tree data (at t=0)
   * @param {Object} toTreeData - Target tree data (at t=1)
   * @param {number} timeFactor - Interpolation factor [0,1]
   * @param {Object} options - Configuration options
   */
  renderInterpolatedFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    const {
      highlightEdges = [],
      clickHandler = null,
      showExtensions = true,
      showLabels = true
    } = options;

    // Validate input tree data
    if (!fromTreeData || !toTreeData) {
      return;
    }

    // Clamp timeFactor to [0, 1]
    let t = Math.max(0, Math.min(1, timeFactor));

    // If trees are identical (by reference or shallow structure), just render one
    if (fromTreeData === toTreeData || JSON.stringify(fromTreeData) === JSON.stringify(toTreeData)) {
      t = 0;
    }

    // --- INTERPOLATION: Pass both layouts and t to renderers ---
    // Compute layouts for both trees (do not mutate controller state)
    const layoutFrom = this.calculateLayout(fromTreeData, this.ignoreBranchLengths);
    const layoutTo = this.calculateLayout(toTreeData, this.ignoreBranchLengths);

    // Links
    this.linkRenderer.renderInterpolated(
      layoutFrom.tree.links(),
      layoutTo.tree.links(),
      t,
      highlightEdges
    );

    // Nodes (all nodes, not just leaves)
    this.nodeRenderer.renderAllNodesInterpolated(
      layoutFrom.tree.descendants(),
      layoutTo.tree.descendants(),
      layoutFrom.max_radius,
      layoutTo.max_radius,
      t,
      clickHandler
    );

      this.extensionRenderer.renderExtensionsInterpolated(
        layoutFrom.tree.leaves(),
        layoutTo.tree.leaves(),
        layoutFrom.max_radius + 20,
        layoutTo.max_radius + 20,
        t
      );

      this.labelRenderer.renderLabelsInterpolated(
        layoutFrom.tree.leaves(),
        layoutTo.tree.leaves(),
        layoutFrom.max_radius + (showExtensions ? 40 : 20),
        layoutTo.max_radius + (showExtensions ? 40 : 20),
        t
      );


    return { success: true, timeFactor: t };
  }
}
