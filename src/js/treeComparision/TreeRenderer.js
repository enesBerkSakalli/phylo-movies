import createRadialTreeLayout from "../treeVisualisation/RadialTreeLayout.js";
import { TreeAnimationController } from "../treeVisualisation/TreeAnimationController.js";

/**
 * Handles tree rendering operations with proper parameter management
 */
export class TreeRenderer {
  constructor() {
    this.svgCounter = 0;
    // Cache TreeAnimationController instances by container ID
    this.treeControllers = new Map();
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix = 'tree-svg') {
    return `${prefix}-${Date.now()}-${++this.svgCounter}`;
  }

  /**
   * Get or create TreeAnimationController instance for a container
   */
  getTreeController(containerId) {
    if (!this.treeControllers.has(containerId)) {
      this.treeControllers.set(containerId, new TreeAnimationController(null, containerId));
    }
    return this.treeControllers.get(containerId);
  }

  /**
   * Create SVG container with proper initialization
   */
  createSvgContainer(id, parentElement) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", id);

    // Set explicit width/height based on parent container's size
    const parentRect = parentElement.getBoundingClientRect();
    const width = "100%";
    const height = "100%";

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.display = "block";

    parentElement.appendChild(svg);

    // Let TreeAnimationController handle the tree-container creation
    // This ensures consistency with the new unified approach
    return { svg, width, height };
  }

  /**
   * Create SVG container with side-by-side tree groups for comparison
   */
  createSideBySideContainer(id, parentElement) {
    // Clear any existing content
    parentElement.innerHTML = '';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", id);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.display = "block";
    svg.style.border = "1px solid rgba(255,255,255,0.1)";
    svg.style.borderRadius = "4px";
    svg.style.background = "rgba(255,255,255,0.01)";

    parentElement.appendChild(svg);

    // Get container dimensions properly
    const containerRect = parentElement.getBoundingClientRect();
    const width = Math.max(containerRect.width || 800, 600);
    const height = Math.max(containerRect.height || 600, 400);

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Create main container group
    const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainGroup.setAttribute("class", "comparison-main-container");
    svg.appendChild(mainGroup);

    // Calculate positions for side-by-side layout with better centering
    const treeWidth = width / 2;
    const tree1CenterX = treeWidth / 2;
    const tree2CenterX = treeWidth + (treeWidth / 2);
    const treeCenterY = height / 2;

    // Create left tree group - no extra translation since TreeAnimationController handles centering
    const tree1Group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tree1Group.setAttribute("class", "tree-container tree-left");
    tree1Group.setAttribute("id", `${id}-tree1-group`);
    // Let TreeAnimationController handle the centering - just provide the base position
    tree1Group.setAttribute("transform", `translate(${tree1CenterX}, ${treeCenterY})`);
    mainGroup.appendChild(tree1Group);

    // Create right tree group - no extra translation since TreeDrawer handles centering
    const tree2Group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tree2Group.setAttribute("class", "tree-container tree-right");
    tree2Group.setAttribute("id", `${id}-tree2-group`);
    // Let TreeAnimationController handle the centering - just provide the base position
    tree2Group.setAttribute("transform", `translate(${tree2CenterX}, ${treeCenterY})`);
    mainGroup.appendChild(tree2Group);

    // Add separator line
    const separator = document.createElementNS("http://www.w3.org/2000/svg", "line");
    separator.setAttribute("x1", width / 2);
    separator.setAttribute("y1", 20);
    separator.setAttribute("x2", width / 2);
    separator.setAttribute("y2", height - 20);
    separator.setAttribute("stroke", "rgba(255,255,255,0.2)");
    separator.setAttribute("stroke-width", "1");
    separator.setAttribute("stroke-dasharray", "5,5");
    mainGroup.appendChild(separator);

    return {
      svg,
      width,
      height,
      tree1GroupId: `${id}-tree1-group`,
      tree2GroupId: `${id}-tree2-group`,
      availableTreeWidth: treeWidth - 60, // Account for padding
      availableTreeHeight: height - 60
    };
  }

  /**
   * Render tree with all proper parameters and improved error handling
   */
  async renderTree(treeData, svgId, options = {}) {
    const {
      leaveOrder = [],
      ignoreBranchLengths = false,
      fontSize = 1.7,
      strokeWidth = 1,
      toBeHighlighted = [],
      drawDuration = 0
    } = options;

    // Always transform tree if ignoreBranchLengths is true
    let treeToRender = ignoreBranchLengths
      ? require('../utils/branchTransformUtils').transformBranchLengths(treeData, 'ignore')
      : treeData;

    return new Promise((resolve, reject) => {
      // Use a short timeout to ensure DOM is ready
      setTimeout(async () => {
        try {
          const svgElement = document.getElementById(svgId);
          if (!svgElement) {
            console.error(`[TreeRenderer] SVG element with id '${svgId}' not found.`);
            throw new Error(`SVG element ${svgId} not found`);
          }

          // Construct tree layout
          const treeLayout = createRadialTreeLayout(treeToRender, false, 'none', {
            containerId: svgId,
            fontSize: fontSize
          });

          try {
            // Get TreeAnimationController instance for this container
            const treeController = this.getTreeController(svgId);

            // Apply comparison-specific styling adjustments
            const isComparison = svgId !== "application";
            const fontSizeAdjustment = isComparison ? 0.75 : 1;
            const strokeAdjustment = isComparison ? 0.8 : 1;

            const finalFontSize = typeof fontSize === 'number' ?
              `${fontSize * fontSizeAdjustment}em` :
              `${parseFloat(fontSize) * fontSizeAdjustment}em`;
            const finalStrokeWidth = strokeWidth * strokeAdjustment;

            // Update parameters using the instance pattern
            treeController.updateParameters({
              treeData: treeLayout.tree ? null : treeToRender, // If treeLayout.tree exists, pass root instead
              root: treeLayout.tree || null,
              drawDuration: drawDuration,
              fontSize: finalFontSize,
              strokeWidth: finalStrokeWidth,
              monophyleticColoring: true
            });

            // Render using instance method
            await treeController.renderAllElements();
            resolve(treeLayout);
          } catch (drawError) {
            console.error('[TreeRenderer] Tree drawing failed:', drawError);
            reject(new Error(`Tree rendering failed: ${drawError.message}`));
          }
        } catch (error) {
          console.error('[TreeRenderer] Error during renderTree:', error);
          reject(error);
        }
      }, 50); // Short delay to ensure DOM readiness
    });
  }

  /**
   * Render trees side by side in their respective groups
   */
  async renderSideBySideTrees(treeData1, treeData2, svgId, options = {}) {
    const {
      leaveOrder = [],
      ignoreBranchLengths = false,
      fontSize = 1.7,
      strokeWidth = 1,
      toBeHighlighted1 = [],
      toBeHighlighted2 = [],
      drawDuration = 0
    } = options;

    const svgElement = document.getElementById(svgId);
    if (!svgElement) {
      throw new Error(`SVG element ${svgId} not found`);
    }

    const tree1GroupId = `${svgId}-tree1-group`;
    const tree2GroupId = `${svgId}-tree2-group`;

    // Render both trees in parallel
    const [tree1Layout, tree2Layout] = await Promise.all([
      this.renderTreeInGroup(treeData1, tree1GroupId, {
        ...options,
        toBeHighlighted: toBeHighlighted1,
        side: 'left'
      }),
      this.renderTreeInGroup(treeData2, tree2GroupId, {
        ...options,
        toBeHighlighted: toBeHighlighted2,
        side: 'right'
      })
    ]);

    return { tree1Layout, tree2Layout };
  }

  /**
   * Render a single tree within a specific group
   */
  async renderTreeInGroup(treeData, groupId, options = {}) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const treeGroup = document.getElementById(groupId);
          if (!treeGroup) {
            throw new Error(`Tree group ${groupId} not found`);
          }

          // Clear existing content
          treeGroup.innerHTML = '';

          // Get available space for this tree
          const svgElement = treeGroup.closest('svg');
          const svgRect = svgElement.getBoundingClientRect();

          // Be more generous with space allocation for comparison trees
          const availableWidth = (svgRect.width / 2) - 20; // Reduced padding
          const availableHeight = svgRect.height - 20; // Reduced padding

          // Calculate font size for padding
          const adjustedFontSize = (options.fontSize || 1.7) * 0.9;

          const treeLayout = createRadialTreeLayout(treeData, options.ignoreBranchLengths, {
            containerId: groupId,
            width: availableWidth - adjustedFontSize * 3,
            height: availableHeight- adjustedFontSize * 3,
            fontSize: adjustedFontSize,
            isComparison: true
          });

          console.log(`TreeRenderer: Group ${groupId} - Available: ${availableWidth}x${availableHeight}`);

          try {
            // Get TreeAnimationController instance for this container
            const treeController = this.getTreeController(groupId);

            // Apply comparison-specific styling adjustments
            const finalFontSize = `${adjustedFontSize}em`;
            const finalStrokeWidth = (options.strokeWidth || 1) * 0.9;

            // Update parameters using the instance pattern
            treeController.updateParameters({
              root: treeLayout.tree,
              drawDuration: options.drawDuration || 0,
              fontSize: finalFontSize,
              strokeWidth: finalStrokeWidth,
              monophyleticColoring: true
            });

            // Render using instance method
            await treeController.renderAllElements();
            resolve(treeLayout);
          } catch (drawError) {
            console.error(`[TreeRenderer] Tree drawing failed in group ${groupId}:`, drawError);
            reject(new Error(`Tree rendering failed: ${drawError.message}`));
          }
        } catch (error) {
          console.error(`Error rendering tree in group ${groupId}:`, error);
          reject(error);
        }
      }, 100);
    });
  }
}
