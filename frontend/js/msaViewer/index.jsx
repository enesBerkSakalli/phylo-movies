// --- Imports & Hooks ---
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import AlignmentViewer2Component from "./AlignmentViewer2Component";
import { msaData, EVENTS } from "../services/dataService.js";


// Custom hook: Load and update MSA data from data service
function useMSAData() {
  const [msaString, setMsaString] = useState("");

  const loadMSAData = useCallback(async () => {
    try {
      const data = await msaData.get();
      if (data && data.rawData && typeof data.rawData === "string") {
        setMsaString(data.rawData);
      } else {
        setMsaString("");
      }
    } catch (error) {
      console.error("[useMSAData] Error loading MSA data:", error);
      setMsaString("");
    }
  }, []);

  useEffect(() => {
    loadMSAData();
  }, [loadMSAData]);

  // Listen for msa-data-updated events
  useEffect(() => {
    const handler = () => {
      loadMSAData();
    };
    window.addEventListener(EVENTS.MSA_UPDATED, handler);
    return () => window.removeEventListener(EVENTS.MSA_UPDATED, handler);
  }, [loadMSAData]);

  return msaString;
}

// Custom hook: Manage WinBox window for MSA viewer
function useMSAWinBox(msaString) {
  const winboxInstance = useRef(null);
  const containerRef = useRef(null);
  const rootRef = useRef(null);
  const dimensionsRef = useRef({ width: 1000, height: 600 });
  const msaStringRef = useRef(msaString);

  // Keep msaString ref updated
  useEffect(() => {
    msaStringRef.current = msaString;
  }, [msaString]);

  // Update existing window when MSA data changes
  useEffect(() => {
    if (winboxInstance.current && rootRef.current && msaString) {
      try {
        console.log(`[useMSAWinBox] Updating MSA window with data length: ${msaString.length}`);
        rootRef.current.render(
          <AlignmentViewer2Component
            msaString={msaString}
            containerWidth={dimensionsRef.current.width}
            containerHeight={dimensionsRef.current.height}
          />
        );
        console.log(`[useMSAWinBox] Successfully updated MSA window with dimensions: ${dimensionsRef.current.width}x${dimensionsRef.current.height}`);
      } catch (error) {
        console.error("Failed to update MSA window with new data:", error);
      }
    }
  }, [msaString]);

  // Register event listener only once
  useEffect(() => {
    function openMSAWindow(e) {
      const currentMsaString = msaStringRef.current;
      console.log(`[openMSAWindow] Opening MSA window with data length: ${currentMsaString?.length || 0}`);

      if (!currentMsaString) {
        // Show more helpful message and offer to load test data
        const useTestData = confirm("No MSA data available. Would you like to load test data for demonstration?");
        if (useTestData) {
          console.log("[openMSAWindow] Loading test MSA data...");
          loadTestMSAData();
          return;
        } else {
          alert("No MSA data available. Please upload an MSA file first.");
          return;
        }
      }
      if (winboxInstance.current) {
        console.log("[openMSAWindow] MSA window already exists, focusing...");
        winboxInstance.current.focus();
        return;
      }

      console.log("[openMSAWindow] Creating new MSA window...");
      const container = document.createElement("div");
      container.id = "msa-winbox-content";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "hidden";
      container.style.position = "relative";
      container.style.boxSizing = "border-box";

      containerRef.current = container;

      const wb = new WinBox("Multiple Sequence Alignment", {
        class: ["no-full", "no-scrollbars"],
        border: 2,
        width: 1000,
        height: 600,
        x: "center",
        y: "center",
        mount: container,
        html: container,
        overflow: false, // Disable WinBox scrollbars completely
        onclose: () => {
          if (rootRef.current) {
            try {
              rootRef.current.unmount();
            } catch {}
          }
          winboxInstance.current = null;
          containerRef.current = null;
          rootRef.current = null;
        },
        onresize: throttleResize((width, height) => {
          // Store dimensions and account for WinBox borders/padding
          const adjustedWidth = Math.max(100, width - 4); // Account for border
          const adjustedHeight = Math.max(100, height - 4); // Account for border
          dimensionsRef.current = { width: adjustedWidth, height: adjustedHeight };

          if (rootRef.current && containerRef.current) {
            try {
              rootRef.current.render(
                <AlignmentViewer2Component
                  msaString={msaStringRef.current}
                  containerWidth={adjustedWidth}
                  containerHeight={adjustedHeight}
                />
              );
            } catch {}
          }
        }, 100), // Throttle resize events
      });

      // Create React root only once
      const root = createRoot(container);
      rootRef.current = root;

      // Initial render
      const initialWidth = Math.max(100, wb.width - 4);
      const initialHeight = Math.max(100, wb.height - 4);
      dimensionsRef.current = { width: initialWidth, height: initialHeight };
      console.log(`[openMSAWindow] Initial render with adjusted dimensions: ${initialWidth}x${initialHeight}`);

      try {
        root.render(
          <AlignmentViewer2Component
            msaString={currentMsaString}
            containerWidth={initialWidth}
            containerHeight={initialHeight}
          />
        );
        console.log("[openMSAWindow] Successfully rendered AlignmentViewer2Component");
      } catch (error) {
        console.error("[openMSAWindow] Failed to render AlignmentViewer2Component:", error);
      }

      winboxInstance.current = wb;
      console.log("[openMSAWindow] MSA window created successfully");
    }

    window.addEventListener("open-msa-viewer", openMSAWindow);
    return () => {
      window.removeEventListener("open-msa-viewer", openMSAWindow);
      if (winboxInstance.current) winboxInstance.current.close();
    };
  }, []); // Empty dependency array - register only once
}

// Add throttle function for resize events
function throttleResize(func, delay) {
  let timeoutId = null;

  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// --- Main App Component ---
function App() {
  const msaString = useMSAData();
  useMSAWinBox(msaString);
  // This component doesn't render anything visible - it just manages the WinBox
  return null;
}

// --- Root Element Creation & Render ---
let root = document.getElementById("msa-react-root");
if (!root) {
  root = document.createElement("div");
  root.id = "msa-react-root";
  document.body.appendChild(root);
}
createRoot(root).render(<App />);
