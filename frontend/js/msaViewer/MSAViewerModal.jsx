import React, { useEffect, useRef, useState, useCallback } from "react";
import { MSAView, MSAModelF } from "react-msaview";
import { createJBrowseTheme } from "@jbrowse/core/ui/theme";
import { ThemeProvider } from "@mui/material/styles";
import drawTree from "../treeVisualisation/TreeDrawer";

/**
 * Calculates responsive dimensions for MSA viewer
 */
function calculateMSADimensions(containerRef, containerWidth, containerHeight) {
  const defaultWidth = 1200;
  const defaultHeight = 500;
  const padding = 20;
  const headerHeight = 0; // Changed from 48 to 0

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
    const MSAModel = MSAModelF(

    );
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
    if (model && typeof model.setHeight === 'function') {
      model.setHeight(dimensions.height);
    }

    return model;
  } catch (error) {
    console.error("MSA MODEL CREATION FAILED:", error);
    throw new Error(`Failed to create MSA model: ${error.message}`);
  }
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
    if (typeof modelRef.current.setHeight === 'function') {
      modelRef.current.setHeight(newDimensions.height);
    }
  }, [containerWidth, containerHeight]);    // Initialize model and setup
    useEffect(() => {
      if (!msaString) {
        setError("No MSA string provided");
        return;
      }

      // Calculate initial dimensions
      const initialDimensions = calculateMSADimensions(containerRef, containerWidth, containerHeight);
      setDimensions(initialDimensions);

      try {
        // Create new model
        modelRef.current = createMSAModel(msaString, initialDimensions);
        setModelCreated(true);
        setError(null);

        // Event handler for sync requests
        const handleSyncRequest = (event) => {
          if (!syncEnabledRef.current || !modelRef.current) {
            console.log("MSA sync request skipped: Sync not enabled or model not ready.");
            return;
          }

          const { highlightedTaxa, position, windowInfo } = event.detail;
          const model = modelRef.current;

          try {
            // Set highlighted sequences
            if (model.setHighlightedSequences) {
              model.setHighlightedSequences(highlightedTaxa || []);
            }

            // Handle column highlighting
            let cols = [];
            if (windowInfo?.windowStart && windowInfo?.windowEnd) {
              for (let i = windowInfo.windowStart - 1; i < windowInfo.windowEnd; ++i) {
                cols.push(i);
              }
            } else if (position > 0) {
              cols = [position - 1]; // Assuming position is 1-based
            }

            if (model.setHighlightedColumns) {
              model.setHighlightedColumns(cols);
            }

            // Scroll to position
            if (windowInfo?.windowStart && typeof model.setScrollX === 'function') {
              const colWidth = model.colWidth || 20; // Default colWidth if not available
              model.setScrollX(-(windowInfo.windowStart - 1) * colWidth);
            } else if (position > 0 && typeof model.setScrollX === 'function') {
              const colWidth = model.colWidth || 20;
              model.setScrollX(-(position - 1) * colWidth);
            }
          } catch (syncError) {
            console.error("Error processing msa-sync-request:", syncError, event.detail);
          }
        };

        window.addEventListener('msa-sync-request', handleSyncRequest);

        // Cleanup function
        return () => {
          window.removeEventListener('msa-sync-request', handleSyncRequest);
          if (modelRef.current && typeof modelRef.current.destroy === 'function') {
            modelRef.current.destroy();
          }
        };

      } catch (err) {
        setError(err.message);
        setModelCreated(false);
      }
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
        {/*
        // Header with controls - Commented out to prioritize react-msaview's native header
        <div style={{
          padding: "8px 12px",
          borderBottom: "1px solid #ccc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: `${dimensions.headerHeight - 16}px`, // This will now be based on headerHeight = 0
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
        */}

        {/* MSA viewer container */}
        <div style={{
          flex: 1,
          padding: "4px",
          background: "#fff",
          overflow: "hidden"
        }}>
          <MSAView
            drawTree= {true}

            model={modelRef.current}
            style={{
              width: "100%",
              height: "100%",
              minHeight: `${dimensions.height}px`,

            }}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}
