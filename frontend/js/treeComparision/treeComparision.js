import * as d3 from "d3";
import { TreeRenderer } from "./TreeRenderer.js";
import { ComparisonModal } from "./ComparisonModal.js";

/**
 * Main tree comparison manager - now simplified and focused
 */
class TreeComparisonManager {
  constructor() {
    this.renderer = new TreeRenderer();
    this.modal = new ComparisonModal();
  }

  async createSideBySideComparison(options) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      leaveOrder = [],
      ignoreBranchLengths = false,
      fontSize = 1.7,
      strokeWidth = 1,
      toBeHighlighted = [],
    } = options;


    return await this.modal.createSideBySideModal({
      treeList,
      tree1Index,
      tree2Index,
      leaveOrder,
      ignoreBranchLengths,
      fontSize,
      strokeWidth,
      toBeHighlighted1: toBeHighlighted || [],
      toBeHighlighted2: toBeHighlighted || [],
    });

  }
  /**
   * Render single tree with all parameters and ensure proper centering
   */
  async renderTree(treeData, svgId, options = {}) {
    return await this.renderer.renderTree(treeData, svgId, options);
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix) {
    return this.renderer.generateSvgId(prefix);
  }

  /**
   * Create SVG container with proper centering setup
   */
  createSvgContainer(id, parentElement) {
    return this.renderer.createSvgContainer(id, parentElement);
  }

  /**
   * Center tree after rendering - delegates to TreeRenderer
   */
  centerTree(svgId) {
    return this.renderer.centerTree(svgId);
  }
}

// Create singleton instance
const treeComparisonManager = new TreeComparisonManager();

// Public API - clean and focused
export async function createSideBySideComparisonModal(options) {
  return await treeComparisonManager.createSideBySideComparison(options);
}

export async function renderTreeInContainer(treeData, svgId, options = {}) {
  return await treeComparisonManager.renderTree(treeData, svgId, options);
}

export function generateSvgId(prefix) {
  return treeComparisonManager.generateSvgId(prefix);
}

export function createSvgContainer(id, parentElement) {
  return treeComparisonManager.createSvgContainer(id, parentElement);
}

// Legacy compatibility functions (deprecated)
export async function createComparisonContent(gui) {
  console.warn(
    "createComparisonContent is deprecated, use createSideBySideComparisonModal instead"
  );
  return document.createElement("div");
}

export async function centerTree(svgId) {
  // Use the TreeComparisonManager's centering method
  return treeComparisonManager.centerTree(svgId);
}

export async function createInterpolationModal(options) {
  console.warn(
    "createInterpolationModal will be implemented in ComparisonModal"
  );
  return null;
}

export async function initializeComparison(container, gui) {
  console.warn("initializeComparison is deprecated");
  return container;
}