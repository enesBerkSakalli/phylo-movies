import React, { useEffect, useRef, useState, useCallback } from "react";
import { MSAView, MSAModelF } from "react-msaview";
import { createJBrowseTheme } from "@jbrowse/core/ui/theme";
import { ThemeProvider } from "@mui/material/styles";

/**
 * Calculates responsive dimensions for MSA viewer
 */
function calculateMSADimensions(containerRef, containerWidth, containerHeight) {
  const defaultWidth = 1200;
  const defaultHeight = 500;
  const padding = 20;
  const headerHeight = 48;

  let width, height;

  if (containerRef?.current) {
    const rect = containerRef.current.getBoundingClientRect();
    width = Math.max(rect.width - padding, 400);
    height = Math.max(rect.height - headerHeight - padding, 300);
  } else {
    width = Math.max((containerWidth || defaultWidth) - padding, 400);
    height = Math.max((containerHeight || defaultHeight) - headerHeight - padding, 300);
  }

  return { width, height, padding, headerHeight };
}

/**
 * Creates and configures MSA model with proper error handling
 */
function createMSAModel(msaString, dimensions) {
  try {
    const MSAModel = MSAModelF();
    const modelData = {
      id: `msa-${Date.now()}`,
      type: "MsaView",
      data: { msa: msaString },
    };
    
    const model = MSAModel.create(modelData);
    
    // Set initial responsive width
    if (model && typeof model.setWidth === 'function') {
      model.setWidth(dimensions.width);
    }
    
    return model;
  } catch (error) {
    console.error("MSA MODEL CREATION FAILED:", error);
    throw new Error(`Failed to create MSA model: ${error.message}`);
  }
}

/**
 * Sets up global sync function with consistent interface
 */
function setupGlobalSync(modelRef, syncEnabledRef) {
  window.syncMSAViewer = (taxa = [], column = 0, windowInfo = null) => {
    if (!syncEnabledRef.current || !modelRef.current) return;
    
    try {
      const model = modelRef.current;
      
      // Set highlighted sequences
      if (model.setHighlightedSequences) {
        model.setHighlightedSequences(taxa);
      }
      
      // Handle column highlighting
      let cols = [];
      if (windowInfo?.windowStart && windowInfo?.windowEnd) {
        for (let i = windowInfo.windowStart - 1; i < windowInfo.windowEnd; ++i) {
          cols.push(i);
        }
      } else if (column > 0) {
        cols = [column - 1];
      }
      
      if (model.setHighlightedColumns) {
        model.setHighlightedColumns(cols);
      }

      // Scroll to position
      let scrollToCol = null;
      if (windowInfo?.windowStart) {
        scrollToCol = windowInfo.windowStart - 1;
      } else if (column > 0) {
        scrollToCol = column - 1;
      }
      
      if (scrollToCol !== null && typeof model.setScrollX === 'function') {
        const colWidth = model.colWidth || 20;
        model.setScrollX(-scrollToCol * colWidth);
      }
    } catch (syncError) {
      console.error("Error during MSA sync:", syncError);
    }
  };
  
  // Store model reference globally
  window.msaModelRef = modelRef;
}

/**
 * Creates fallback theme if JBrowse theme fails
 */
function createSafeTheme() {
  try {
    return createJBrowseTheme();
  } catch {
    return {
      palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' }
      }
    };
  }
}

export default function MSAViewerContent({ msaString, containerWidth = 1200, containerHeight = 500 }) {
  // State management
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [modelCreated, setModelCreated] = useState(false);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  
  // Refs
  const syncEnabledRef = useRef(syncEnabled);
  const modelRef = useRef();
  const containerRef = useRef();

  // Sync state ref with current value
  useEffect(() => {
    syncEnabledRef.current = syncEnabled;
  }, [syncEnabled]);

  // Handle model resize with debouncing
  const handleResize = useCallback(() => {
    if (!containerRef.current || !modelRef.current) return;
    
    const newDimensions = calculateMSADimensions(containerRef, containerWidth, containerHeight);
    setDimensions(newDimensions);
    
    if (typeof modelRef.current.setWidth === 'function') {
      modelRef.current.setWidth(newDimensions.width);
    }
  }, [containerWidth, containerHeight]);

  // Initialize model and setup
  useEffect(() => {
    if (!msaString) {
      setError("No MSA string provided");
      return;
    }

    // Calculate initial dimensions
    const initialDimensions = calculateMSADimensions(containerRef, containerWidth, containerHeight);
    setDimensions(initialDimensions);

    try {
      // Clean up previous model
      if (modelRef.current && typeof modelRef.current.destroy === 'function') {
        modelRef.current.destroy();
      }
      
      // Create new model
      modelRef.current = createMSAModel(msaString, initialDimensions);
      
      // Setup global sync
      setupGlobalSync(modelRef, syncEnabledRef);
      
      setModelCreated(true);
      setError(null);
      
    } catch (err) {
      setError(err.message);
      setModelCreated(false);
    }

    // Cleanup function
    return () => {
      if (window.syncMSAViewer) delete window.syncMSAViewer;
      if (window.msaModelRef) delete window.msaModelRef;
      if (modelRef.current && typeof modelRef.current.destroy === 'function') {
        modelRef.current.destroy();
      }
    };
  }, [msaString, containerWidth, containerHeight]);

  // Setup resize listener
  useEffect(() => {
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  // Render states
  if (!msaString) {
    return (
      <div style={{ padding: 20 }}>
        <h3>No MSA Data</h3>
        <p>No MSA string provided to the component.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h3>MSA Viewer Error</h3>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <details>
          <summary>Debug Information</summary>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
            MSA String Length: {msaString.length}
            {'\n'}MSA Preview: {msaString.substring(0, 200)}...
            {'\n'}Container Dimensions: {dimensions ? `${dimensions.width}x${dimensions.height}` : 'Not calculated'}
          </pre>
        </details>
      </div>
    );
  }

  if (!modelCreated || !modelRef.current || !dimensions) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Loading MSA Viewer...</h3>
        <p>Creating MSA model...</p>
      </div>
    );
  }

  const theme = createSafeTheme();

  return (
    <ThemeProvider theme={theme}>
      <div 
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          borderRadius: "8px",
          boxSizing: "border-box",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header with controls */}
        <div style={{ 
          padding: "8px 12px", 
          borderBottom: "1px solid #ccc", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          minHeight: `${dimensions.headerHeight - 16}px`,
          background: "#f8f9fa",
          flexShrink: 0
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>Multiple Sequence Alignment</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
              Hover over sequences to see position information
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label htmlFor="msa-sync-toggle" style={{ fontSize: "14px", color: "#333", marginRight: "6px" }}>
              Sync with Main View
            </label>
            <input
              id="msa-sync-toggle"
              type="checkbox"
              checked={syncEnabled}
              onChange={() => setSyncEnabled(prev => !prev)}
              style={{ width: "18px", height: "18px" }}
            />
          </div>
        </div>
        
        {/* MSA viewer container */}
        <div style={{ 
          flex: 1,
          padding: "4px", 
          background: "#fff",
          overflow: "hidden"
        }}>
          <MSAView 
            model={modelRef.current} 
            style={{ 
              width: "100%", 
              height: "100%",
              minHeight: `${dimensions.height}px`
            }}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}