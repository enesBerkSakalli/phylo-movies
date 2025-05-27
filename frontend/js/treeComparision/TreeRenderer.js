import constructTree from "../treeVisualisation/TreeConstructor.js";
import drawTree from "../treeVisualisation/TreeDrawer.js";

/**
 * Handles tree rendering operations with proper parameter management
 */
export class TreeRenderer {
  constructor() {
    this.svgCounter = 0;
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix = 'tree-svg') {
    return `${prefix}-${Date.now()}-${++this.svgCounter}`;
  }

  /**
   * Create SVG container with proper initialization
   */
  createSvgContainer(id, parentElement) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", id);
    
    // Set explicit width/height based on parent container's size
    const parentRect = parentElement.getBoundingClientRect();
    const width = parentRect.width || 400;
    const height = parentRect.height || 400;
    
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.display = "block";

    parentElement.appendChild(svg);

    // Let TreeDrawer.getSVG() handle the tree-container creation
    // This ensures consistency with the new unified approach
    return { svg, width, height };
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

    return new Promise((resolve, reject) => {
      // Use a short timeout to ensure DOM is ready
      setTimeout(() => {
        try {
          const svgElement = document.getElementById(svgId);
          if (!svgElement) {
            console.error(`[TreeRenderer] SVG element with id '${svgId}' not found.`);
            throw new Error(`SVG element ${svgId} not found`);
          }

          // Construct tree layout
          const treeLayout = constructTree(treeData, ignoreBranchLengths, { 
            containerId: svgId 
          });

          // Use the SVG ID directly - TreeDrawer.getSVG() will handle container creation
          const success = drawTree(
            treeLayout,
            toBeHighlighted,
            drawDuration,
            leaveOrder,
            fontSize,
            strokeWidth,
            svgId  // Use SVG ID directly
          );

          if (success) {
            resolve(treeLayout);
          } else {
            reject(new Error('Tree rendering failed'));
          }
        } catch (error) {
          console.error('[TreeRenderer] Error during renderTree:', error);
          reject(error);
        }
      }, 50); // Short delay to ensure DOM readiness
    });
  }

  /**
   * Center tree content within SVG viewport - enhanced with TreeDrawer integration
   */
  centerTree(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) {
      console.warn(`[TreeRenderer] SVG element ${svgId} not found for centering`);
      return;
    }

    // Check if TreeDrawer has already created proper centering structure
    const treeContainer = svg.querySelector('.tree-container');
    if (treeContainer) {
      // TreeDrawer handles centering for containers with .tree-container class
      // Just ensure the container is properly positioned
      const svgRect = svg.getBoundingClientRect();
      const width = svgRect.width || +svg.getAttribute('width') || 400;
      const height = svgRect.height || +svg.getAttribute('height') || 400;
      
      // Update container centering if needed
      treeContainer.setAttribute('transform', `translate(${width / 2}, ${height / 2})`);
      return;
    }

    // Fallback: manual centering for legacy tree structures
    this._performManualCentering(svg);
  }

  /**
   * Performs manual centering for trees without proper container structure
   * @param {Element} svg - The SVG element
   * @private
   */
  _performManualCentering(svg) {
    const allElements = svg.querySelectorAll('circle, path, text');
    if (allElements.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    allElements.forEach(el => {
      try {
        const bbox = el.getBBox();
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      } catch (e) {
        // Skip elements that can't provide bbox
      }
    });

    if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
      const padding = 50;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;
      const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
      
      svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  }
}