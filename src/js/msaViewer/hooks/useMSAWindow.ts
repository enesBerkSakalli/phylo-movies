/**
 * Hook for managing the MSA WinBox window
 */

import { useRef, useEffect, useCallback } from "react";
import { createRoot, Root } from "react-dom/client";
import React from "react";
import WinBox from 'winbox';
import AlignmentViewer2Component from "../AlignmentViewer2Component";
import { MSA_WINDOW_CONFIG, MSA_WINBOX_CLASSES } from "../constants";
import { throttle, getAdjustedDimensions, createMSAContainer, loadTestMSAData } from "../msaUtils";

// WinBox types (since we don't have official types)
interface WinBoxInstance {
  focus(): void;
  close(): void;
  width: number;
  height: number;
}

interface WinBoxConstructor {
  new (title: string, options: any): WinBoxInstance;
}

declare global {
  const WinBox: WinBoxConstructor;
}

interface MSAWindowState {
  openWindow: () => void;
  isOpen: boolean;
}

interface Dimensions {
  width: number;
  height: number;
}

export function useMSAWindow(msaString: string): MSAWindowState {
  const windowRef = useRef<WinBoxInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactRootRef = useRef<Root | null>(null);
  const dimensionsRef = useRef<Dimensions>({
    width: MSA_WINDOW_CONFIG.DEFAULT_WIDTH,
    height: MSA_WINDOW_CONFIG.DEFAULT_HEIGHT
  });

  const renderComponent = useCallback((width: number, height: number): void => {
    if (!reactRootRef.current || !msaString) return;

    try {
      reactRootRef.current.render(
        React.createElement(AlignmentViewer2Component, {
          msaString,
          containerWidth: width,
          containerHeight: height
        })
      );
    } catch (error) {
      console.error("[useMSAWindow] Failed to render component:", error);
    }
  }, [msaString]);

  // Update component when MSA data changes
  useEffect(() => {
    if (windowRef.current && reactRootRef.current && msaString) {
      const { width, height } = dimensionsRef.current;
      renderComponent(width, height);
    }
  }, [msaString, renderComponent]);

  const openMSAWindow = useCallback((): void => {
    // Check if MSA data is available
    if (!msaString) {
      const useTestData = window.confirm(
        "No MSA data available. Would you like to load test data for demonstration?"
      );
      
      if (useTestData) {
        loadTestMSAData();
      } else {
        window.alert("No MSA data available. Please upload an MSA file first.");
      }
      return;
    }

    // Focus existing window if it exists
    if (windowRef.current) {
      windowRef.current.focus();
      return;
    }

    // Create container
    const container = createMSAContainer();
    containerRef.current = container;

    // Create WinBox
    const winbox = new WinBox("Multiple Sequence Alignment", {
      class: [...MSA_WINBOX_CLASSES],
      border: 2,
      width: MSA_WINDOW_CONFIG.DEFAULT_WIDTH,
      height: MSA_WINDOW_CONFIG.DEFAULT_HEIGHT,
      x: "center",
      y: "center",
      mount: container,
      html: container,
      overflow: false,
      
      onclose: () => {
        if (reactRootRef.current) {
          try {
            reactRootRef.current.unmount();
          } catch (err) {
            console.warn("Error unmounting React root:", err);
          }
        }
        windowRef.current = null;
        containerRef.current = null;
        reactRootRef.current = null;
      },
      
      onresize: throttle((width: number, height: number) => {
        const adjusted = getAdjustedDimensions(width, height);
        dimensionsRef.current = adjusted;
        renderComponent(adjusted.width, adjusted.height);
      }, MSA_WINDOW_CONFIG.RESIZE_THROTTLE)
    });

    // Create React root and render
    const reactRoot = createRoot(container);
    reactRootRef.current = reactRoot;

    const initialDimensions = getAdjustedDimensions(winbox.width, winbox.height);
    dimensionsRef.current = initialDimensions;
    
    renderComponent(initialDimensions.width, initialDimensions.height);
    windowRef.current = winbox;

    console.log("[useMSAWindow] MSA window created successfully");
  }, [msaString, renderComponent]);

  // Register event listener
  useEffect(() => {
    const handleOpenEvent = () => {
      openMSAWindow();
    };

    window.addEventListener("open-msa-viewer", handleOpenEvent);
    
    return () => {
      window.removeEventListener("open-msa-viewer", handleOpenEvent);
      if (windowRef.current) {
        windowRef.current.close();
      }
    };
  }, [openMSAWindow]);

  return { 
    openWindow: openMSAWindow, 
    isOpen: !!windowRef.current 
  };
}