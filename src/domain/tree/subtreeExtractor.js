/**
 * SubtreeExtractor - Utility for extracting subtrees from normalized tree nodes
 * Provides methods for extracting subtrees, converting back to newick format,
 * and managing tree navigation operations
 */
export class SubtreeExtractor {
  /**
   * Find the normalized tree node whose split exactly matches a leaf-index set.
   * @param {Object} root - Root of the normalized plain tree
   * @param {Array<number>} splitIndices - Leaf indices defining the target subtree
   * @returns {Object|null}
   */
  static findNodeByExactSplit(root, splitIndices) {
    this._assertNormalizedNode(root);
    const targetKey = this._splitKey(splitIndices);
    if (!targetKey) return null;

    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (this._splitKey(node.split_indices) === targetKey) {
        return node;
      }
      if (Array.isArray(node.children)) {
        for (let index = node.children.length - 1; index >= 0; index -= 1) {
          stack.push(node.children[index]);
        }
      }
    }

    return null;
  }

  /**
   * Build a compact immutable subtree topology snapshot for table rendering.
   * @param {Object} root - Root of the normalized plain tree
   * @param {Array<number>} splitIndices - Leaf indices defining the target subtree
   * @returns {Object|null}
   */
  static createTopologySnapshot(root, splitIndices) {
    this._assertNormalizedNode(root);
    const node = this.findNodeByExactSplit(root, splitIndices);
    if (!node) return null;

    const topologyRoot = this._nodeToTopology(node);
    const stats = this.getSubtreeStats(node);

    return {
      root: topologyRoot,
      newick: `${this._nodeToNewick(node)};`,
      leafCount: stats.leafCount,
      nodeCount: stats.totalNodes,
      splitIndices: this._normalizeSplit(node.split_indices),
    };
  }

  /**
   * Extract a subtree starting from a given node
   * @param {Object} node - The root node of the subtree to extract
   * @param {Object} originalTreeData - Original tree data for context
   * @returns {Object} New tree data containing only the subtree
   */
  static extractSubtree(node, originalTreeData) {
    this._assertNormalizedNode(node);

    // Clone the node and all its descendants to avoid modifying original tree
    const subtreeRoot = this._cloneNode(node);
    const subtreeRootName = node.name || 'node';

    // Create new tree data object
    const subtreeData = {
      ...originalTreeData,
      name: originalTreeData?.name
        ? `${originalTreeData.name}_subtree_${subtreeRootName}`
        : `subtree_${subtreeRootName}`,
      originalTreeName: originalTreeData?.name,
      isSubtree: true,
      subtreeRoot: node.name || 'unnamed_node',
      parentTreeData: originalTreeData,
    };

    // Convert the subtree back to newick-like format if needed
    subtreeData.newick = this._nodeToNewick(subtreeRoot);

    return subtreeData;
  }

  /**
   * Clone a node and all its descendants, preserving the tree structure
   * @param {Object} node - Node to clone
   * @returns {Object} Cloned node with all descendants
   * @private
   */
  static _cloneNode(node, depth = 0) {
    this._assertNormalizedNode(node);

    const cloned = {
      name: node.name || '',
      length: node.length ?? 0,
      split_indices: Array.isArray(node.split_indices) ? [...node.split_indices] : [],
      depth,
      height: node.height ?? 0,
      path: Array.isArray(node.path) ? [...node.path] : undefined,
      children: [],
    };

    // Recursively clone children
    if (Array.isArray(node.children) && node.children.length > 0) {
      cloned.children = node.children.map((child) => this._cloneNode(child, depth + 1));
    }

    return cloned;
  }

  static _nodeToTopology(node) {
    this._assertNormalizedNode(node);

    const topologyNode = {
      name: node.name || '',
      length: node.length ?? null,
      splitIndices: this._normalizeSplit(node.split_indices),
      children: [],
    };

    if (Array.isArray(node.children) && node.children.length > 0) {
      topologyNode.children = node.children.map((child) => this._nodeToTopology(child));
    }

    return topologyNode;
  }

  /**
   * Convert a node (and its descendants) back to newick format
   * @param {Object} node - Root node to convert
   * @returns {string} Newick format string
   * @private
   */
  static _nodeToNewick(node) {
    this._assertNormalizedNode(node);

    if (!node.children || node.children.length === 0) {
      // Leaf node
      const name = node.name || '';
      const length = node.length ?? '';
      return length !== '' ? `${name}:${length}` : name;
    }

    // Internal node - recursively build newick for children
    const childrenNewick = node.children.map((child) => this._nodeToNewick(child)).join(',');
    const name = node.name || '';
    const length = node.length ?? '';

    const nodeNewick = `(${childrenNewick})${name}`;
    return length !== '' ? `${nodeNewick}:${length}` : nodeNewick;
  }

  /**
   * Get all descendant nodes from a normalized plain tree node.
   * @param {Object} node - Normalized plain tree node
   * @returns {Array} Array of all descendant nodes (including the root)
   */
  static getDescendants(node) {
    this._assertNormalizedNode(node);

    const descendants = [node];
    if (Array.isArray(node.children)) {
      node.children.forEach((child) => {
        descendants.push(...this.getDescendants(child));
      });
    }
    return descendants;
  }

  /**
   * Get all leaf nodes from a normalized plain tree node.
   * @param {Object} node - Normalized plain tree node
   * @returns {Array} Array of all leaf nodes in the subtree
   */
  static getLeaves(node) {
    this._assertNormalizedNode(node);

    if (!node.children || node.children.length === 0) {
      return [node];
    }

    const leaves = [];
    node.children.forEach((child) => {
      leaves.push(...this.getLeaves(child));
    });
    return leaves;
  }

  /**
   * Calculate statistics for a subtree
   * @param {Object} node - Root node of subtree
   * @returns {Object} Statistics about the subtree
   */
  static getSubtreeStats(node) {
    const descendants = this.getDescendants(node);
    const leaves = this.getLeaves(node);

    return {
      totalNodes: descendants.length,
      leafCount: leaves.length,
      internalNodes: descendants.length - leaves.length,
      maxDepth: Math.max(...descendants.map((n) => n.depth || 0)),
      rootName: node.name || 'unnamed',
    };
  }

  /**
   * Check if extracting this subtree would be meaningful
   * (i.e., it has children and isn't too small)
   * @param {Object} node - Node to check
   * @param {number} minNodes - Minimum number of nodes required
   * @returns {boolean} Whether subtree extraction is recommended
   */
  static isValidSubtreeRoot(node, minNodes = 3) {
    this._assertNormalizedNode(node);

    if (!node.children || node.children.length === 0) {
      return false; // Can't extract subtree from leaf
    }

    const descendants = this.getDescendants(node);
    return descendants.length >= minNodes;
  }

  /**
   * Convert a node to newick format (public method)
   * @param {Object} node - Root node to convert
   * @returns {string} Newick format string
   */
  static nodeToNewick(node) {
    this._assertNormalizedNode(node);
    return this._nodeToNewick(node);
  }

  /**
   * Get the path from root to a specific node (breadcrumb trail)
   * @param {Object} node - Target node
   * @returns {Array} Array of node names from root to target
   */
  static getNodePath(node) {
    this._assertNormalizedNode(node);

    if (Array.isArray(node.path) && node.path.length > 0) {
      return node.path;
    }

    return [node.name || `depth_${node.depth ?? 0}`];
  }

  /**
   * Create a breadcrumb string for UI display
   * @param {Object} node - Target node
   * @param {string} separator - Separator between breadcrumb items
   * @returns {string} Breadcrumb string
   */
  static createBreadcrumb(node, separator = ' > ') {
    const path = this.getNodePath(node);
    return path.join(separator);
  }

  static _assertNormalizedNode(node) {
    if (!node || typeof node !== 'object') {
      throw new Error('SubtreeExtractor requires a normalized plain tree node');
    }
    if (
      'data' in node ||
      typeof node.descendants === 'function' ||
      typeof node.leaves === 'function'
    ) {
      throw new Error(
        'SubtreeExtractor requires a normalized plain tree node, not a D3 hierarchy node'
      );
    }
  }

  static _normalizeSplit(splitIndices) {
    return Array.isArray(splitIndices)
      ? splitIndices.filter(Number.isFinite).sort((a, b) => a - b)
      : [];
  }

  static _splitKey(splitIndices) {
    const normalized = this._normalizeSplit(splitIndices);
    return normalized.length > 0 ? normalized.join(',') : '';
  }
}
