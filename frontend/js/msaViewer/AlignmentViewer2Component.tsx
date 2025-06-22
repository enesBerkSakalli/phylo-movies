/**
 * AlignmentViewer2Component.tsx
 *
 * A React component that integrates AlignmentViewer 2.0 with advanced settings management,
 * file upload capabilities, and synchronization with the main phylo-movies GUI.
 *
 * Features:
 * - Dynamic settings with persistence (localStorage + URL)
 * - File upload via drop zone
 * - Sync events from main GUI
 * - Single instance guarantee per WinBox window
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  AlignmentViewer,
  FastaAlignment,
  Alignment,
  IBarplotExposedProps
} from "alignment-viewer-2";
import useAV2Settings from "alignment-viewer-2/dist/js/components/settings/Settings";
import "alignment-viewer-2/dist/standalone/alignmentviewer.css";

// Fix for undefined SVG path errors in AlignmentViewer 2.0
// Set a fallback base URL for assets to prevent 404 errors
if (typeof window !== 'undefined' && !window.location.origin.includes('/undefined/')) {
  // Ensure AlignmentViewer can find its assets
  const baseElement = document.querySelector('base');
  if (!baseElement) {
    const base = document.createElement('base');
    base.href = window.location.origin + '/';
    document.head.insertBefore(base, document.head.firstChild);
  }
}

// UI Components
import MSAViewerNoData from "./MSAViewerNoData";
import MSAViewerLoading from "./MSAViewerLoading";
import MSAViewerError from "./MSAViewerError";

// ============================================================================
// UTILITIES
// ============================================================================

// Add throttle utility function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}


// ============================================================================
// TYPES
// ============================================================================

interface AlignmentViewer2ComponentProps {
  msaString: string;
  containerWidth?: number;
  containerHeight?: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Parse MSA string into alignment object for AlignmentViewer 2.0
 */
function createAlignmentFromMSA(msaString: string): Alignment {
  if (!msaString) {
    throw new Error("No MSA string provided");
  }

  if (typeof msaString !== 'string') {
    throw new Error(`Expected string, got ${typeof msaString}`);
  }

  if (msaString.length === 0) {
    throw new Error("MSA string is empty");
  }

  // Check if it looks like FASTA format
  if (!msaString.trim().startsWith('>')) {
    throw new Error("MSA string does not appear to be in FASTA format (should start with '>')");
  }

  try {
    console.log(`[createAlignmentFromMSA] Parsing MSA string of ${msaString.length} characters`);
    // Convert to uppercase for better parser compatibility
    const upperCaseMSA = msaString.toUpperCase();
    console.log(`[createAlignmentFromMSA] Converted sequences to uppercase for parser compatibility`);
    // AlignmentViewer 2.0 can handle FASTA directly
    const alignment = FastaAlignment.fromFileContents("MSA_ALIGNMENT", upperCaseMSA);
    console.log(`[createAlignmentFromMSA] Successfully created alignment with ${alignment.getSequenceCount()} sequences of length ${alignment.getSequenceLength()}`);
    return alignment;
  } catch (error: any) {
    console.error("[createAlignmentFromMSA] Detailed error:", {
      message: error.message,
      stack: error.stack,
      msaPreview: msaString.substring(0, 200)
    });
    throw new Error(`Failed to parse FASTA alignment: ${error.message}`);
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlignmentViewer2Component({
  msaString,
  containerWidth = 1200,
  containerHeight = 500
}: AlignmentViewer2ComponentProps): JSX.Element {

  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------

  // Core alignment state
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Combined UI state (following AlignmentViewer 2.0 pattern)
  const [state, setState] = useState({
    showSettings: false,
    currentPosition: 1,
    highlightedTaxa: [] as string[],
    mainViewportVisibleIdxs: undefined as undefined | {
      seqIdxStart: number, seqIdxEnd: number,
      posIdxStart: number, posIdxEnd: number
    }
  });

  const { showSettings, currentPosition, highlightedTaxa } = state;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const alignmentViewerRef = useRef<any>(null);
  const triggerShowSearch = useRef<(() => void) | undefined>(undefined);

  // ----------------------------------------------------------------------------
  // SETTINGS HOOK INTEGRATION
  // ----------------------------------------------------------------------------

  const hideSettingsFn = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      showSettings: false
    }));
  }, []);

  // Remove problematic alignment prop from settings hook
  const settingsHook = useAV2Settings({
    requestSettingsClose: hideSettingsFn,
    useUrlAndLocalstorage: true
    // Remove: alignment: alignment
  });

  const {
    currentlySelectedProperties: settings,
    dropZoneElement,
    element: settingsElement
  } = settingsHook;

  // Parse alignment with better error handling
  useEffect(() => {
    if (!msaString) {
      setError("No MSA string provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[AlignmentViewer2] Parsing MSA string of length: ${msaString.length}`);
      const parsed = createAlignmentFromMSA(msaString);
      console.log(`[AlignmentViewer2] Successfully parsed alignment with ${parsed.getSequenceCount()} sequences`);
      setAlignment(parsed);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error("[AlignmentViewer2] Failed to parse MSA:", err);
      setError(`Failed to parse MSA data: ${err.message || err}`);
      setAlignment(null);
      setLoading(false);
    }
  }, [msaString]);


  // Enhanced sync event handler with viewport control
  const throttledSyncHandler = useCallback(
    throttle((event: CustomEvent) => {
      if (!alignment) {
        console.log("MSA sync request skipped: Alignment not ready.");
        return;
      }

      const { position, windowInfo, highlightedTaxa: eventHighlightedTaxa, treeIndex } = event.detail;
      console.log("MSA sync request received:", {
        position,
        windowInfo,
        highlightedTaxa: eventHighlightedTaxa,
        treeIndex
      });

      // Update component state
      if (position && position !== currentPosition) {
        setState(prevState => ({
          ...prevState,
          currentPosition: position
        }));
        console.log(`MSA position updated to: ${position}`);
      }

      // Update highlighted taxa if provided
      if (eventHighlightedTaxa && Array.isArray(eventHighlightedTaxa)) {
        setState(prevState => ({
          ...prevState,
          highlightedTaxa: eventHighlightedTaxa
        }));
        console.log(`MSA highlighted taxa updated:`, eventHighlightedTaxa);
      }

      // Update viewport based on sync information
      if (windowInfo && alignment) {
        const sequenceLength = alignment.getSequenceLength();
        const sequenceCount = alignment.getSequenceCount();

        // Calculate viewport region based on window info
        const posStart = Math.max(0, windowInfo.windowStart - 1); // Convert to 0-based
        const posEnd = Math.min(sequenceLength - 1, windowInfo.windowEnd - 1);

        // Keep current sequence range or focus on highlighted sequences
        let seqStart = 0;
        let seqEnd = sequenceCount - 1;

        if (eventHighlightedTaxa && eventHighlightedTaxa.length > 0) {
          // Find sequence indices for highlighted taxa
          const highlightedIndices = [];
          const sequences = alignment.getSequences();

          for (let i = 0; i < sequences.length; i++) {
            const sequence = sequences[i] as any;
            // Try different possible property names for sequence ID
            const seqName = sequence.id || sequence.name || sequence.getName?.() || sequence.getId?.() || `seq_${i}`;
            if (eventHighlightedTaxa.includes(seqName)) {
              highlightedIndices.push(i);
            }
          }

          if (highlightedIndices.length > 0) {
            seqStart = Math.min(...highlightedIndices);
            seqEnd = Math.max(...highlightedIndices);
            // Add some context around highlighted sequences
            seqStart = Math.max(0, seqStart - 2);
            seqEnd = Math.min(sequenceCount - 1, seqEnd + 2);
          }
        }

        setState(prevState => ({
          ...prevState,
          mainViewportVisibleIdxs: {
            seqIdxStart: seqStart,
            seqIdxEnd: seqEnd,
            posIdxStart: posStart,
            posIdxEnd: posEnd
          }
        }));

        console.log(`MSA viewport updated:`, {
          sequences: `${seqStart}-${seqEnd}`,
          positions: `${posStart}-${posEnd}`,
          windowInfo
        });
      }

      // Log window info for debugging
      if (windowInfo) {
        console.log(`MSA window info:`, {
          windowStart: windowInfo.windowStart,
          windowEnd: windowInfo.windowEnd,
          msaPosition: windowInfo.msaPosition,
          msaStepSize: windowInfo.msaStepSize
        });
      }

    }, 250), // Throttle to max 4 updates per second
    [alignment, currentPosition]
  );

  useEffect(() => {
    window.addEventListener('msa-sync-request', throttledSyncHandler as EventListener);
    return () => {
      window.removeEventListener('msa-sync-request', throttledSyncHandler as EventListener);
    };
  }, [throttledSyncHandler]);


  // ----------------------------------------------------------------------------
  // COMPUTED VALUES
  // ----------------------------------------------------------------------------

  // Use local alignment instead of settings alignment for better control
  const activeAlignment = alignment;

  const logoSvgId = activeAlignment ? `logo-${activeAlignment.getUUID()}` : "logoplot";

  const barplotsProps: IBarplotExposedProps[] = useMemo(() => {
    if (!activeAlignment) return [];

    // Use settings barplots if available, otherwise empty array
    const barplotData = settings?.barplots || [];

    return barplotData.map((bp) => {
      return {
        svgId: `${bp.key}-barplot-${activeAlignment.getUUID()}`,
        dataSeriesSet: [bp],
        heightPx: 75
      };
    });
  }, [activeAlignment, settings?.barplots]);

  // Add viewport-related props to AlignmentViewer with proper sizing
  const alignmentViewerProps = useMemo(() => {
    const baseProps = {
      alignment: activeAlignment,
      alignmentType: settings?.alignmentType,
      aaColorScheme: settings?.aaColorScheme,
      ntColorScheme: settings?.ntColorScheme,
      positionsToStyle: settings?.positionsToStyle,
      residueColoring: settings?.residueColoring,
      zoomLevel: settings?.zoomLevel,
      sortBy: settings?.sortBy,
      showLogo: settings?.showLogo,
      showAnnotations: settings?.showAnnotations,
      showMinimap: settings?.showMinimap,
      showConsensus: true,
      showRuler: true,
      disableSearch: false,
      disableSearchKeyboardShortcut: false,
      triggerShowSearch: triggerShowSearch,
      mainViewportVisibleChanged: (newIdxs: any) => {
        setState(prevState => ({
          ...prevState,
          mainViewportVisibleIdxs: newIdxs
        }));
      },
      logoOptions: {
        svgId: logoSvgId,
        logoType: settings?.logoType
      },
      barplots: barplotsProps
      // Scrolling is handled by the parent div's CSS overflow property.
    };

    // Add highlighted sequences if available
    if (highlightedTaxa && highlightedTaxa.length > 0) {
      console.log(`[AlignmentViewer] Applying highlighted taxa:`, highlightedTaxa);
      return {
        ...baseProps,
        highlightedSequences: highlightedTaxa
      };
    }

    return baseProps;
  }, [
    activeAlignment,
    settings,
    logoSvgId,
    barplotsProps,
    highlightedTaxa,
    triggerShowSearch
  ]);

  // ----------------------------------------------------------------------------
  // RENDER GUARDS
  // ----------------------------------------------------------------------------

  if (!msaString) return <MSAViewerNoData />;
  if (error) return <MSAViewerError
    error={error}
    msaString={msaString}
    dimensions={{
      width: containerWidth,
      height: containerHeight,
      padding: 0,
      headerHeight: 0
    }}
  />;
  if (loading || !activeAlignment) return <MSAViewerLoading />;

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      style={{
        ...containerStyles,
        width: containerWidth ? `${containerWidth}px` : "100%",
        height: containerHeight ? `${containerHeight}px` : "100%"
      }}
    >
      {/* Only render AlignmentViewer if activeAlignment is not null */}
      {activeAlignment && (
        <div style={{

        }}>
          <AlignmentViewer
            {...alignmentViewerProps as any}
            ref={alignmentViewerRef}
          />
        </div>
      )}
      <SettingsButton
        showSettings={showSettings}
        onToggleSettings={() => setState(prevState => ({
          ...prevState,
          showSettings: true
        }))}
      />

      <SearchButton triggerShowSearch={triggerShowSearch} />

      <SettingsPanel
        showSettings={showSettings}
        settingsElement={settingsElement}
      />

      {/* File Upload Drop Zone */}
      {dropZoneElement}

      {/* ...other UI elements... */}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SettingsButtonProps {
  showSettings: boolean;
  onToggleSettings: () => void;
}

function SettingsButton({ showSettings, onToggleSettings }: SettingsButtonProps) {
  return (
    <div style={settingsButtonContainerStyles}>
      {!showSettings && (
        <button
          onClick={onToggleSettings}
          style={settingsButtonStyles}
          title="Show Settings"
        >
          Settings
        </button>
      )}
    </div>
  );
}

interface SearchButtonProps {
  triggerShowSearch: React.MutableRefObject<(() => void) | undefined>;
}

function SearchButton({ triggerShowSearch }: SearchButtonProps) {
  return (
    <div style={{
      position: "absolute",
      top: "8px",
      right: "72px", // Position to the left of settings button
      zIndex: 1000
    }}>
      <button
        style={{
          ...settingsButtonStyles,
          background: "#28a745"
        }}
        type="button"
        title="Show Search"
        onClick={() => {
          if (triggerShowSearch.current) triggerShowSearch.current();
        }}
      >
        Search
      </button>
    </div>
  );
}

interface SettingsPanelProps {
  showSettings: boolean;
  settingsElement: React.JSX.Element;
}

function SettingsPanel({ showSettings, settingsElement }: SettingsPanelProps) {
  if (!showSettings) return null;

  return (
    <div style={settingsPanelStyles}>
      {settingsElement}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const containerStyles: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "#fff",
  borderRadius: "8px",
  overflow: "hidden",
  margin: 0, // Remove margin
  padding: 0, // Remove padding
  display: "flex",
  flexDirection: "column", // Ensure vertical stacking
};

const settingsButtonContainerStyles: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  zIndex: 1000
};

const settingsButtonStyles: React.CSSProperties = {
  padding: "4px 8px",
  background: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px"
};

const settingsPanelStyles: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  zIndex: 1000,
  background: "white",
  border: "1px solid #ccc",
  borderRadius: "4px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  maxHeight: "80vh",
};
