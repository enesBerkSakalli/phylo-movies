/**
 * MSA Viewer Entry Point
 * Manages the Multiple Sequence Alignment viewer window
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { useMSAData } from "./hooks/useMSAData";
import { useMSAWindow } from "./hooks/useMSAWindow";

/**
 * Main MSA App Component
 * Coordinates data loading and window management
 */
function MSAApp(): JSX.Element | null {
  const { msaString, loading, error } = useMSAData();
  useMSAWindow(msaString);

  // Log status for debugging
  React.useEffect(() => {
    if (loading) {
      console.log("[MSA] Loading data...");
    } else if (error) {
      console.error("[MSA] Error:", error);
    } else if (msaString) {
      console.log(`[MSA] Data loaded successfully (${msaString.length} characters)`);
    } else {
      console.log("[MSA] No data available");
    }
  }, [loading, error, msaString]);

  // This component manages state but doesn't render UI
  // The actual UI is rendered in the WinBox window
  return null;
}

/**
 * Initialize the MSA viewer
 */
function initializeMSAViewer(): void {
  let rootElement = document.getElementById("msa-react-root");
  
  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "msa-react-root";
    rootElement.style.display = "none"; // Hidden since we render in WinBox
    document.body.appendChild(rootElement);
  }

  const reactRoot = createRoot(rootElement);
  reactRoot.render(React.createElement(MSAApp));
  
  console.log("[MSA] Viewer initialized");
}

// Initialize when the module loads
initializeMSAViewer();