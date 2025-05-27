// File: TreeDataExtractor.js
/**
 * @module TreeDataExtractor
 * Handles extraction of taxa names from various tree data structures
 */
export const TreeDataExtractor = {
    /**
     * Extract taxa names from a tree data structure
     * @param {Object|Array} treeData - The tree data structure
     * @returns {Array<string>} Array of unique taxa names
     */
    extractTaxaNames(treeData) {
      let taxaNames = [];
      // First check if treeData is an array (multiple trees)
      if (Array.isArray(treeData)) {
        // Get taxa from the first tree if it's an array
        const firstTree = treeData[0];
        if (firstTree && firstTree.children) {
          this.extractLeafNames(firstTree, taxaNames);
        }
      } 
      // Check if it's a d3 hierarchy or similar structure
      else if (typeof treeData.leaves === 'function') {
        // Get leave order from the global leaveOrder array if available
        const leaveOrder = window.gui?.leaveOrder;
        if (!leaveOrder || leaveOrder.length === 0) {
          console.warn("[TreeDataExtractor] window.gui.leaveOrder is missing or empty. Taxa color mapping may be incorrect.");
        }
        taxaNames = treeData.leaves().map(leaf => {
          if (leaf.data && leaf.data.split_indices && leaveOrder && leaveOrder.length > 0) {
            const idx = leaf.data.split_indices[0];
            if (leaveOrder[idx]) {
              return leaveOrder[idx]; // Return the actual taxon name from leaveOrder
            }
          }
          if (leaf.data && leaf.data.name) return leaf.data.name;
          if (leaf.name) return leaf.name;
          if (leaf.data && leaf.data.split_indices) return leaf.data.split_indices[0];
          console.warn("Couldn't find a name for leaf:", leaf);
          return "Unknown";
        });
      }
      // Direct tree structure as in tree.py
      else if (treeData.children) {
        this.extractLeafNames(treeData, taxaNames);
      }
      // Check for duplicates
      const nameSet = new Set();
      const duplicates = new Set();
      taxaNames.forEach(name => {
        if (nameSet.has(name)) duplicates.add(name);
        nameSet.add(name);
      });
      if (duplicates.size > 0) {
        console.warn(`[TreeDataExtractor] Duplicate taxa names detected: ${Array.from(duplicates).join(", ")}. Color assignment may be ambiguous.`);
      }
      return taxaNames;
    },
  
    /**
     * Helper function to recursively extract leaf names from a tree structure
     * @param {Object} node - Current tree node
     * @param {Array} taxaNames - Array to collect taxa names
     */
    extractLeafNames(node, taxaNames) {
      if (!node.children || node.children.length === 0) {
        // Only push non-empty, non-null names
        if (node.name && typeof node.name === 'string' && node.name.trim() !== '') {
          taxaNames.push(node.name.trim());
        } else if (node.leaf_name && typeof node.leaf_name === 'string' && node.leaf_name.trim() !== '') {
          taxaNames.push(node.leaf_name.trim());
        } else if (node.split_indices && node.split_indices.length > 0) {
          const leaveOrder = window.gui?.leaveOrder;
          if (leaveOrder && leaveOrder.length > 0 && leaveOrder[node.split_indices[0]]) {
            taxaNames.push(leaveOrder[node.split_indices[0]].trim());
          } else {
            // Only push if not null/undefined
            if (node.split_indices[0] != null) {
              taxaNames.push(String(node.split_indices[0]));
            }
          }
        }
        return;
      }
  
      // Recursively process children
      for (const child of node.children) {
        this.extractLeafNames(child, taxaNames);
      }
    }
  };