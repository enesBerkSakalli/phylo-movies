/**
 * DebugPanel - Utility for displaying debug information in the UI
 * 
 * Provides a floating debug panel that can be updated with tree and highlighting data.
 * Separates debug concerns from the main GUI logic.
 */
export class DebugPanel {
  
  constructor() {
    this.debugDiv = null;
    this.isVisible = false;
    this.init();
  }

  /**
   * Initialize the debug panel DOM element
   */
  init() {
    this.debugDiv = document.createElement('div');
    this.debugDiv.id = 'debug-info';
    this.debugDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 11px;
      max-width: 350px;
      z-index: 9999;
      max-height: 500px;
      overflow-y: auto;
      border: 2px solid #333;
      display: none;
    `;
    document.body.appendChild(this.debugDiv);
  }

  /**
   * Show the debug panel
   */
  show() {
    if (this.debugDiv) {
      this.debugDiv.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Hide the debug panel
   */
  hide() {
    if (this.debugDiv) {
      this.debugDiv.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle debug panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update debug panel with tree and highlighting information
   * @param {Object} debugData - Object containing debug information
   * @param {number} debugData.currentTreeIndex - Current tree index
   * @param {Array} debugData.treeNames - Array of tree names
   * @param {Object} debugData.transitionResolver - Transition resolver instance
   * @param {Array} debugData.lattice_edge_tracking - Lattice edge tracking data
   * @param {Object} debugData.treeController - Tree controller instance
   * @param {*} debugData.actualHighlightData - Raw highlight data
   */
  updateDebugInfo(debugData) {
    if (!this.debugDiv) return;

    const {
      currentTreeIndex,
      treeNames,
      transitionResolver,
      lattice_edge_tracking,
      treeController,
      actualHighlightData
    } = debugData;

    const isCon = transitionResolver?.isConsensusTree(currentTreeIndex);
    const highlightIndex = transitionResolver?.getHighlightingIndex(currentTreeIndex);
    const s_edge = lattice_edge_tracking?.[currentTreeIndex];

    // Get transformed data from TreeController
    const transformedMarked = treeController?.colorManager?.marked;

    // Generate lattice edge context (3 before, current, 3 after)
    const latticeContext = this._generateLatticeEdgeContext(currentTreeIndex, lattice_edge_tracking, treeNames);

    this.debugDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong>🔍 Debug Info - Tree ${currentTreeIndex}</strong>
        <button onclick="window.debugPanel?.hide()" style="background: #666; color: white; border: none; padding: 2px 6px; cursor: pointer; border-radius: 3px;">×</button>
      </div>
      Current Tree: ${treeNames?.[currentTreeIndex] || 'Unknown'}<br>
      Is Consensus: <span style="color: ${isCon ? 'lime' : 'orange'}">${isCon}</span><br>
      Highlight Index: ${highlightIndex}<br>
      S-Edge: ${s_edge ? JSON.stringify(s_edge) : 'null'}<br>
      <br>
      <strong>🔗 Lattice Edge Context:</strong><br>
      ${latticeContext}
      <br>
      <strong>📊 Raw Highlight Data:</strong><br>
      Type: ${typeof actualHighlightData}<br>
      Is Array: ${Array.isArray(actualHighlightData)}<br>
      Length: ${actualHighlightData?.length || 0}<br>
      <br>
      <strong>🔬 Sample Data:</strong><br>
      ${actualHighlightData?.length > 0 ?
        actualHighlightData.slice(0, 3).map((item, i) =>
          `[${i}]: ${Array.isArray(item) ? `[${item.slice(0, 5).join(',')}${item.length > 5 ? '...' : ''}]` : JSON.stringify(item).substring(0, 50)}`
        ).join('<br>')
        : 'No data'}
      <br>
      <br>
      <strong>⚙️ Transformed Data (ColorManager):</strong><br>
      Type: ${transformedMarked ? typeof transformedMarked : 'undefined'}<br>
      Is Array: ${Array.isArray(transformedMarked)}<br>
      Length: ${transformedMarked?.length || 0}<br>
      <br>
      <strong>🎯 Transformed Sets:</strong><br>
      ${transformedMarked?.length > 0 ?
        transformedMarked.slice(0, 3).map((set, i) =>
          `[${i}]: Set(${set.size}) = {${[...set].slice(0, 5).join(',')}${set.size > 5 ? '...' : ''}}`
        ).join('<br>')
        : 'No sets'}
      <br>
      <br>
      <strong>🚀 Navigation:</strong><br>
      <button onclick="window.gui?.nextTree()" style="margin: 2px; padding: 4px; font-size: 10px;">Next Tree</button>
      <button onclick="window.gui?.prevTree()" style="margin: 2px; padding: 4px; font-size: 10px;">Prev Tree</button><br>
      <button onclick="window.gui?.goToPosition(0)" style="margin: 2px; padding: 4px; font-size: 10px;">Go to Start</button>
      <button onclick="window.gui?.goToPosition(Math.floor(window.gui.treeList.length/2))" style="margin: 2px; padding: 4px; font-size: 10px;">Go to Middle</button>
    `;
  }

  /**
   * Generate lattice edge context showing 3 trees before and after current index
   * @param {number} currentIndex - Current tree index
   * @param {Array} lattice_edge_tracking - Array of lattice edges
   * @param {Array} treeNames - Array of tree names
   * @returns {string} HTML string showing lattice edge context
   */
  _generateLatticeEdgeContext(currentIndex, lattice_edge_tracking, treeNames) {
    if (!lattice_edge_tracking || !Array.isArray(lattice_edge_tracking)) {
      return 'No lattice edge tracking data available';
    }

    const contextRange = 3; // Show 3 before and 3 after
    const start = Math.max(0, currentIndex - contextRange);
    const end = Math.min(lattice_edge_tracking.length - 1, currentIndex + contextRange);
    
    let contextHtml = '<div style="font-family: monospace; font-size: 10px;">';
    
    for (let i = start; i <= end; i++) {
      const edge = lattice_edge_tracking[i];
      const treeName = treeNames?.[i] || `Tree ${i}`;
      const isCurrent = i === currentIndex;
      
      const style = isCurrent 
        ? 'background: #444; color: yellow; padding: 2px; border-radius: 2px;'
        : 'color: #ccc;';
      
      const edgeStr = edge ? JSON.stringify(edge) : 'null';
      
      contextHtml += `<div style="${style}">`;
      contextHtml += `[${i}] ${treeName}: ${edgeStr}`;
      contextHtml += '</div>';
    }
    
    contextHtml += '</div>';
    return contextHtml;
  }

  /**
   * Remove the debug panel from DOM
   */
  destroy() {
    if (this.debugDiv) {
      this.debugDiv.remove();
      this.debugDiv = null;
      this.isVisible = false;
    }
  }

  /**
   * Check if debug panel is currently visible
   * @returns {boolean} True if visible
   */
  isShowing() {
    return this.isVisible;
  }
}