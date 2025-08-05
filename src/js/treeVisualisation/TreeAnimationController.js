import * as d3 from "d3";
import { useAppStore } from '../core/store.js';
import { transformBranchLengths } from "../utils/branchTransformUtils.js";
import { LinkRenderer } from "./rendering/LinkRenderer.js";
import { NodeRenderer } from "./rendering/NodeRenderer.js";
import { ExtensionRenderer } from "./rendering/ExtensionRenderer.js";
import { LabelRenderer } from "./rendering/LabelRenderer.js";
import { RadialTreeLayout } from "./RadialTreeLayout.js";
import { EASING_FUNCTIONS } from "./utils/animationUtils.js";
import { createStoreIntegratedUpdatePattern } from "./utils/IndependentUpdatePattern.js";

// Layout constants for consistent spacing
const LAYOUT_CONSTANTS = {
  EXTENSION_OFFSET: 20,  // Distance from leaf radius to extension end
  LABEL_OFFSET: 30,      // Distance from leaf radius to label position
  LABEL_OFFSET_WITH_EXTENSIONS: 40  // Distance when extensions are shown
};

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
    this.activeChangeEdges = [];

    // Transition tracking for phase-aware animations
    this.previousTreeIndex = -1;
    this.currentTreeIndex = -1;
    this.transitionResolver = null;


    // Layout calculator management - test reusing single instance
    this.layoutCalculator = null;
    this.margin = 40; // Default margin, can be overridden

    this.svg_container = this._initializeContainer(svgContainerId);

    // Centralized update pattern - single source of truth for all diffing
    this.updatePattern = createStoreIntegratedUpdatePattern();

    // Get ColorManager from store - single source of truth for colors (same as WebGL controller)
    this.colorManager = useAppStore.getState().getColorManager();
    this.linkRenderer = new LinkRenderer(this.svg_container, this.colorManager);
    this.nodeRenderer = new NodeRenderer(this.svg_container, this.colorManager);
    this.extensionRenderer = new ExtensionRenderer(this.svg_container, this.colorManager);
    this.labelRenderer = new LabelRenderer(this.svg_container, this.colorManager);
  }

  /**
   * Initializes the SVG container, creating it if necessary, and ensures a centered
   * drawing group exists. This is the single source of truth for container setup.
   * @private
   */
  _initializeContainer() {
    const containerSelection = d3.select(`#${this.containerId}`);
    if (containerSelection.empty()) {
      throw new Error(`TreeAnimationController: SVG container with id "${this.containerId}" not found.`);
    }

    // If the target is the main application's zoom-able group, use it directly.
    if (this.containerId === "application" && containerSelection.node().tagName.toLowerCase() === "g") {
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
    // Use store action to update ColorManager instead of direct call
    const { updateColorManagerMarkedComponents } = useAppStore.getState();
    updateColorManagerMarkedComponents(this.marked);
  }

  /**
   * Gets the previous tree from store cache for diffing
   * @returns {Object|null} Previous tree or null if not available
   * @private
   */
  _getPreviousTree() {
    const { previousTreeIndex, getLayoutCache } = useAppStore.getState();
    const previousLayout = getLayoutCache(previousTreeIndex);
    return previousLayout?.tree || null;
  }


  async renderAllElements() {
    this.synchronizeRenderers();
    await this.renderWithCoordinatedAnimations();
  }

  /**
   * Update label font sizes reactively without full re-render
   * Called when fontSize changes in the UI for optimized updates
   */
  async updateLabelStyles() {
    if (!this.labelRenderer) {
      return Promise.resolve();
    }

    // Call the label renderer's updateLabelStyles method
    return await this.labelRenderer.updateLabelStyles();
  }

  async renderWithCoordinatedAnimations() {
    try {
      if (!this.root) {
        return;
      }

      // Centralized diffing for all elements - single source of truth
      const previousTree = this._getPreviousTree();
      const allUpdates = this.updatePattern.diffAllElements(this.root, previousTree);

      // Log centralized diffing results for debugging
      const linksData = this.root.links();

      // Extract actual data objects from diffing results - pass directly to renderers
      const filteredData = {
        links: {
          enter: allUpdates.links.enter.map(op => op.current),
          update: allUpdates.links.update.map(op => op.current),
          exit: allUpdates.links.exit.map(op => op.previous)
        },
        nodes: {
          enter: allUpdates.nodes.enter.map(op => op.current),
          update: allUpdates.nodes.update.map(op => op.current),
          exit: allUpdates.nodes.exit.map(op => op.previous)
        },
        leaves: {
          enter: allUpdates.leaves.enter.map(op => op.current),
          update: allUpdates.leaves.update.map(op => op.current),
          exit: allUpdates.leaves.exit.map(op => op.previous)
        }
      };

      const leaves = this.root.leaves();
      const allNodes = this.root.descendants();

      const currentMaxLeafRadius = leaves.length > 0 ? Math.max(...leaves.map(d => d.radius)) : 0;

      // Use current radius for layout calculations
      const maxLeafRadius = currentMaxLeafRadius;

      const { showExtensions } = useAppStore.getState();
      const labelOffset = showExtensions
        ? maxLeafRadius + LAYOUT_CONSTANTS.LABEL_OFFSET_WITH_EXTENSIONS
        : maxLeafRadius + LAYOUT_CONSTANTS.LABEL_OFFSET;

      // Pass pre-filtered data to renderer - no more filtering needed in renderer
      const linkStages = this.linkRenderer.getAnimationStages(
        linksData,
        this.drawDuration,
        this.activeChangeEdges,
        filteredData.links
      );

      // Execute animation sequence directly based on data analysis
      await this._executeAnimationSequence(filteredData, {
        linkStages,
        leaves,
        allNodes,
        maxLeafRadius,
        labelOffset
      });

    } catch (error) {
      throw error;
    }
  }


  /**
   * Checks if any renderer has exiting elements
   * @param {Object} filteredData - Pre-filtered data
   * @returns {boolean} True if any exiting elements exist
   * @private
   */
  _hasExitingElements(filteredData) {
    return filteredData.links.exit.length > 0 ||
           filteredData.nodes.exit.length > 0 ||
           filteredData.leaves.exit.length > 0;
  }

  /**
   * Checks if any renderer has entering elements
   * @param {Object} filteredData - Pre-filtered data
   * @returns {boolean} True if any entering elements exist
   * @private
   */
  _hasEnteringElements(filteredData) {
    return filteredData.links.enter.length > 0 ||
           filteredData.nodes.enter.length > 0 ||
           filteredData.leaves.enter.length > 0;
  }

  /**
   * Checks if any renderer has updating elements
   * @param {Object} filteredData - Pre-filtered data
   * @returns {boolean} True if any updating elements exist
   * @private
   */
  _hasUpdatingElements(filteredData) {
    return filteredData.links.update.length > 0 ||
           filteredData.nodes.update.length > 0 ||
           filteredData.leaves.update.length > 0;
  }

  /**
   * Executes animation sequence directly based on data analysis
   * Uses specific sequence logic based on which states are present
   * @param {Object} filteredData - Pre-filtered data with enter/update/exit arrays
   * @param {Object} context - Animation context with renderers and data
   * @private
   */
  async _executeAnimationSequence(filteredData, context) {
    const { linkStages, leaves, allNodes, maxLeafRadius, labelOffset } = context;
    const hasExiting = this._hasExitingElements(filteredData);
    const hasEntering = this._hasEnteringElements(filteredData);
    const hasUpdating = this._hasUpdatingElements(filteredData);

    // When all three states are present: Exit → Enter → Update
    if (hasExiting && hasEntering && hasUpdating) {
      await linkStages.stageExit();
      await linkStages.stageEnter();
      await this._executeUpdateStage(linkStages, leaves, allNodes, maxLeafRadius, labelOffset, filteredData, EASING_FUNCTIONS.SIN_IN_OUT);
    }
    // When hasEnter is activated: Enter → Update → Exit
    else if (hasEntering && !hasExiting && hasUpdating) {
      console.log('Executing: Enter → Update → Exit sequence (enter priority)');
      await linkStages.stageEnter();
      await this._executeUpdateStage(linkStages, leaves, allNodes, maxLeafRadius, labelOffset, filteredData, EASING_FUNCTIONS.SIN_IN_OUT);
      if (hasExiting) await linkStages.stageExit();
    }
    // When hasExit is activated: Update → Enter → Exit
    else if (hasExiting && !hasEntering && hasUpdating) {
      console.log('Executing: Update → Enter → Exit sequence (exit priority)');
      await this._executeUpdateStage(linkStages, leaves, allNodes, maxLeafRadius, labelOffset, filteredData, EASING_FUNCTIONS.SIN_IN_OUT);
      if (hasEntering) await linkStages.stageEnter();
      await linkStages.stageExit();
    }
    // Other combinations - follow standard logic
    else {
      await linkStages.stageExit();
      await linkStages.stageEnter();
      await this._executeUpdateStage(linkStages, leaves, allNodes, maxLeafRadius, labelOffset, filteredData, EASING_FUNCTIONS.SIN_IN_OUT);
    }
  }

  /**
   * Executes the update stage across all renderers simultaneously
   * @param {Object} linkStages - Link animation stages
   * @param {Array} leaves - Leaf data
   * @param {Array} allNodes - All node data
   * @param {number} maxLeafRadius - Maximum leaf radius
   * @param {number} labelOffset - Label positioning offset
   * @param {Object} filteredData - Pre-filtered data
   * @param {string} easing - Easing function
   * @private
   */
  async _executeUpdateStage(linkStages, leaves, allNodes, maxLeafRadius, labelOffset, filteredData, easing) {
    const updatePromises = [
      linkStages.stageUpdate(), // Update links
      this.extensionRenderer.renderExtensionsWithPromise(
        leaves,
        maxLeafRadius + LAYOUT_CONSTANTS.EXTENSION_OFFSET,
        this.drawDuration,
        easing,
        filteredData.leaves
      ),
      this.labelRenderer.renderUpdating(
        leaves,
        labelOffset,
        this.drawDuration,
        easing,
        filteredData.leaves
      ),
      this.nodeRenderer.renderAllNodesWithPromise(
        allNodes,
        this.drawDuration,
        easing,
        null,
        filteredData.nodes
      )
    ];

    await Promise.all(updatePromises);
  }

  /**
   * Calculates a tree layout without modifying the controller's state.
   * @param {Object} treeData - Raw tree data.
   * @returns {Object} A layout object with tree, dimensions, etc.
   */
  calculateLayout(treeData) {
    // Get the current transformation setting from the store
    const { branchTransformation } = useAppStore.getState();

    // Apply the selected transformation to a deep copy of the tree data
    const transformedTreeData = transformBranchLengths(treeData, branchTransformation);

    const d3hierarchy = d3.hierarchy(transformedTreeData);

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

    const layoutCalculator = new RadialTreeLayout(d3hierarchy);
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
   * @returns {Object} Layout object with tree, dimensions, etc.
   */
  updateLayout(treeData) {
    const layout = this.calculateLayout(treeData);

    this.root = layout.tree;

    if (!this.svg_container.attr("transform")) {
      this.svg_container.attr("transform", `translate(${layout.width / 2},${layout.height / 2})`);
    }

    // Cache tree positions in store for renderer optimization
    const { currentTreeIndex, cacheTreePositions } = useAppStore.getState();
    cacheTreePositions(currentTreeIndex, layout);

    return layout;
  }


  /**
   * Update parameters of the TreeAnimationController instance.
   * @param {Object} params - Parameters to update
   */
  updateParameters({
    root,
    treeData,
    drawDuration,
    marked,
    activeChangeEdges = [],
    monophyleticColoring,
    treeIndex,
    transitionResolver
  }) {
    // Handle layout updates - prefer treeData over root
    if (treeData) {
      this.updateLayout(treeData);
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

      // Ensure ColorManager is immediately updated using store action
      const { updateColorManagerMarkedComponents } = useAppStore.getState();
      updateColorManagerMarkedComponents(this.marked);
    }
    if (activeChangeEdges) this.activeChangeEdges = activeChangeEdges;


    // Style updates are handled directly by store actions - no need for styleConfig updates

    // Update monophyletic coloring using store action
    if (monophyleticColoring !== undefined) {
      const { setColorManagerMonophyleticColoring } = useAppStore.getState();
      setColorManagerMonophyleticColoring(monophyleticColoring);
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
   * Update controller from store data - single source of truth approach
   * Gets all required data directly from the store instead of requiring parameters
   */
  updateFromStore() {
    const {
      currentTreeIndex,
      treeList,
      branchTransformation,
      monophyleticColoringEnabled,
      animationSpeed,
      getActualHighlightData,
      activeChangeEdgeTracking,
      transitionResolver
    } = useAppStore.getState();

    const currentTreeData = treeList[currentTreeIndex];

    // Update layout with current tree data from store
    if (currentTreeData) {
      // Apply branch transformation
      const transformedTreeData = branchTransformation !== 'none'
        ? transformBranchLengths(currentTreeData, branchTransformation)
        : currentTreeData;
      this.updateLayout(transformedTreeData);
    }

    // Update animation duration from store
    const baseTime = 1000;
    this.drawDuration = Math.max(200, baseTime / (animationSpeed || 1));

    // Update marked components from store
    const markedComponents = getActualHighlightData();
    if (Array.isArray(markedComponents) && markedComponents.length > 0) {
      const isArrayOfArrays = markedComponents.every(item => Array.isArray(item));
      if (isArrayOfArrays) {
        this.marked = markedComponents.map((innerArray) => new Set(innerArray));
      } else {
        this.marked = [new Set(markedComponents)];
      }
    } else {
      this.marked = [];
    }

    // Update other properties from store
    this.activeChangeEdges = activeChangeEdgeTracking || [];

    // Use store actions for ColorManager updates
    const { setColorManagerMonophyleticColoring, updateColorManagerMarkedComponents } = useAppStore.getState();
    setColorManagerMonophyleticColoring(monophyleticColoringEnabled);
    updateColorManagerMarkedComponents(this.marked);

    this.transitionResolver = transitionResolver;
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
      showExtensions = true
    } = options;

    // Validate input tree data
    if (!fromTreeData || !toTreeData) {
      return;
    }

    // Clamp timeFactor to [0, 1]
    let t = Math.max(0, Math.min(1, timeFactor));

    // If trees are identical by reference, just render one
    if (fromTreeData === toTreeData) {
      t = 0;
    }

    // --- INTERPOLATION: Pass both layouts and t to renderers ---
    // Compute layouts for both trees (do not mutate controller state)
    const layoutFrom = this.calculateLayout(fromTreeData);
    const layoutTo = this.calculateLayout(toTreeData);

    // Cache interpolated layouts for renderer optimization
    const { cacheTreePositions } = useAppStore.getState();
    // Use negative indices to avoid conflicts with regular tree indices
    cacheTreePositions(-1, layoutFrom); // From tree
    cacheTreePositions(-2, layoutTo);   // To tree

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
      t,
      clickHandler
    );

      this.extensionRenderer.renderExtensionsInterpolated(
        layoutFrom.tree.leaves(),
        layoutTo.tree.leaves(),
        layoutFrom.max_radius + LAYOUT_CONSTANTS.EXTENSION_OFFSET,
        layoutTo.max_radius + LAYOUT_CONSTANTS.EXTENSION_OFFSET,
        t
      );

      this.labelRenderer.renderLabelsInterpolated(
        layoutFrom.tree.leaves(),
        layoutTo.tree.leaves(),
        layoutFrom.max_radius + (showExtensions ? LAYOUT_CONSTANTS.LABEL_OFFSET_WITH_EXTENSIONS : LAYOUT_CONSTANTS.LABEL_OFFSET),
        layoutTo.max_radius + (showExtensions ? LAYOUT_CONSTANTS.LABEL_OFFSET_WITH_EXTENSIONS : LAYOUT_CONSTANTS.LABEL_OFFSET),
        t
      );


    return { success: true, timeFactor: t };
  }

  /**
   * Starts animation playback - delegates to store for state management
   */
  startAnimation() {
    const { play } = useAppStore.getState();
    console.log('[SVG Controller] Starting animation - calling store.play()');
    play();
  }

  /**
   * Stops animation playback - delegates to store for state management
   */
  stopAnimation() {
    const { stop } = useAppStore.getState();
    console.log('[SVG Controller] Stopping animation - calling store.stop()');
    stop();
  }
}
