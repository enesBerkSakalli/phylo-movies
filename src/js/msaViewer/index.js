/**
 * MSA Viewer Module Entry Point
 * Uses WinBox to create MSA viewer window
 */

import MSAViewer from './MSAViewer.js';

// Global instance
let msaViewerInstance = null;

/**
 * Create and show MSA viewer window
 */
export function showMSAViewer(data = null) {
  if (msaViewerInstance) {
    console.log('[MSA] Viewer already open, focusing');
    msaViewerInstance.show();
    if (data) {
      msaViewerInstance.loadData(data);
    }
    return msaViewerInstance;
  }
  
  console.log('[MSA] Creating new viewer window');
  msaViewerInstance = new MSAViewer(() => {
    // Cleanup callback when window closes
    msaViewerInstance = null;
  });
  
  // Load data if provided
  if (data) {
    // Give the window time to render before loading data
    setTimeout(() => {
      if (msaViewerInstance) {
        msaViewerInstance.loadData(data);
      }
    }, 100);
  }
  
  return msaViewerInstance;
}

// Export for direct use
export { MSAViewer };