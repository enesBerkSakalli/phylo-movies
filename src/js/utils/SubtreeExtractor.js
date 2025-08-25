/**
 * SubtreeExtractor - Utility for extracting subtrees from D3 hierarchy trees
 * Provides methods for extracting subtrees, converting back to newick format,
 * and managing tree navigation operations
 */
export class SubtreeExtractor {

  /**
   * Extract a subtree starting from a given node
   * @param {Object} node - The root node of the subtree to extract
   * @param {Object} originalTreeData - Original tree data for context
   * @returns {Object} New tree data containing only the subtree
   */
  static extractSubtree(node, originalTreeData) {
    if (!node) {
      throw new Error('Node is required for subtree extraction');
    }

    // Clone the node and all its descendants to avoid modifying original tree
    const subtreeRoot = this._cloneNode(node);

    // Create new tree data object
    const subtreeData = {
      ...originalTreeData,
      name: originalTreeData.name ? `${originalTreeData.name}_subtree_${node.data.name || 'node'}` : `subtree_${node.data.name || 'node'}`,
      originalTreeName: originalTreeData.name,
      isSubtree: true,
      subtreeRoot: node.data.name || 'unnamed_node',
      parentTreeData: originalTreeData
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
  static _cloneNode(node) {
    const clonedData = { ...node.data };
    const cloned = {
      data: clonedData,
      depth: 0, // Reset depth for subtree root
      height: node.height,
      parent: null, // Subtree root has no parent
      children: null
    };

    // Recursively clone children
    if (node.children && node.children.length > 0) {
      cloned.children = node.children.map(child => {
        const clonedChild = this._cloneNode(child);
        clonedChild.parent = cloned;
        clonedChild.depth = cloned.depth + 1;
        return clonedChild;
      });
    }

    return cloned;
  }

  /**
   * Convert a node (and its descendants) back to newick format
   * @param {Object} node - Root node to convert
   * @returns {string} Newick format string
   * @private
   */
  static _nodeToNewick(node) {
    if (!node.children || node.children.length === 0) {
      // Leaf node
      const name = node.data.name || '';
      const branchLength = node.data.branch_length || node.data.branchLength || '';
      return branchLength ? `${name}:${branchLength}` : name;
    }

    // Internal node - recursively build newick for children
    const childrenNewick = node.children.map(child => this._nodeToNewick(child)).join(',');
    const name = node.data.name || '';
    const branchLength = node.data.branch_length || node.data.branchLength || '';

    const nodeNewick = `(${childrenNewick})${name}`;
    return branchLength ? `${nodeNewick}:${branchLength}` : nodeNewick;
  }

  /**
   * Get all descendant nodes from a given node
   * @param {Object} node - Root node
   * @returns {Array} Array of all descendant nodes (including the root)
   */
  static getDescendants(node) {
    const descendants = [node];

    if (node.children) {
      node.children.forEach(child => {
        descendants.push(...this.getDescendants(child));
      });
    }

    return descendants;
  }

  /**
   * Get all leaf nodes from a given node
   * @param {Object} node - Root node
   * @returns {Array} Array of all leaf nodes in the subtree
   */
  static getLeaves(node) {
    if (!node.children || node.children.length === 0) {
      return [node];
    }

    const leaves = [];
    node.children.forEach(child => {
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
      maxDepth: Math.max(...descendants.map(n => n.depth || 0)),
      rootName: node.data.name || 'unnamed'
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
    return this._nodeToNewick(node);
  }

  /**
   * Get the path from root to a specific node (breadcrumb trail)
   * @param {Object} node - Target node
   * @returns {Array} Array of node names from root to target
   */
  static getNodePath(node) {
    const path = [];
    let current = node;

    while (current) {
      path.unshift(current.data.name || `depth_${current.depth}`);
      current = current.parent;
    }

    return path;
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
}
