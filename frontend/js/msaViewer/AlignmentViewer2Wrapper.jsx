import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlignmentViewer, FastaAlignment } from "alignment-viewer-2";
import { ThemeProvider } from "@mui/material/styles";

// Reuse existing UI components
import { MSAViewerNoData, MSAViewerError, MSAViewerLoading } from './MSAViewerWindow.jsx';

/**
 * AlignmentViewer 2.0 Integration Wrapper
 * Provides same interface as react-msaview but with better performance
 */

// Helper to parse MSA string and create alignment object
function createAlignmentObject(msaString, name = "MSA") {
  try {
    // Detect format and parse accordingly
    if (msaString.includes('# STOCKHOLM')) {
      // Stockholm format - need to convert to FASTA for AlignmentViewer 2.0
      return parseStockholmToFasta(msaString, name);
    } else {
      // Assume FASTA format
      return FastaAlignment.fromFileContents(name, msaString);
    }
  } catch (error) {
    throw new Error(`Failed to parse MSA: ${error.message}`);
  }
}

// Convert Stockholm to FASTA (simplified)
function parseStockholmToFasta(stockholmString, name) {
  const lines = stockholmString.split('\n');
  let fastaString = '';

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '' || line.includes('//')) {
      continue;
    }

    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const seqName = parts[0];
      const sequence = parts[1];
      fastaString += `>${seqName}\n${sequence}\n`;
    }
  }

  return FastaAlignment.fromFileContents(name, fastaString);
}

// Custom hook for AlignmentViewer 2.0 integration
function useAlignmentViewer2(msaString, dimensions) {
  const [alignment, setAlignment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!msaString) {
      setError("No MSA string provided");
      setLoading(false);
      return;
    }

    try {
      const alignmentObj = createAlignmentObject(msaString);
      setAlignment(alignmentObj);
      setError(null);
    } catch (err) {
      setError(err.message);
      setAlignment(null);
    } finally {
      setLoading(false);
    }
  }, [msaString]);

  return { alignment, error, loading };
}

// Header component for AlignmentViewer 2.0
function AlignmentViewer2Header({
  syncEnabled,
  setSyncEnabled,
  showConsensus,
  setShowConsensus,
  showConservation,
  setShowConservation
}) {
  return (
    <div style={headerStyle}>
      <div>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>Multiple Sequence Alignment</h3>
        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
          High-performance viewer with WebGL acceleration
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
        <label style={{ fontSize: "14px", color: "#333", marginLeft: "10px" }}>
          <input
            type="checkbox"
            checked={showConsensus}
            onChange={() => setShowConsensus(prev => !prev)}
            style={{ marginRight: 4 }}
          />Consensus
        </label>
        <label style={{ fontSize: "14px", color: "#333", marginLeft: "4px" }}>
          <input
            type="checkbox"
            checked={showConservation}
            onChange={() => setShowConservation(prev => !prev)}
            style={{ marginRight: 4 }}
          />Conservation
        </label>
      </div>
    </div>
  );
}

// Main AlignmentViewer 2.0 wrapper component
export default function AlignmentViewer2Wrapper({
  msaString,
  containerWidth = 1200,
  containerHeight = 500
}) {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showConsensus, setShowConsensus] = useState(true);
  const [showConservation, setShowConservation] = useState(true);
  const containerRef = useRef();

  const dimensions = {
    width: containerWidth,
    height: containerHeight - 60 // Account for header
  };

  const { alignment, error, loading } = useAlignmentViewer2(msaString, dimensions);

  // Handle sync events (reuse existing logic)
  useEffect(() => {
    function handleSyncRequest(event) {
      if (!syncEnabled || !alignment) return;

      const { highlightedTaxa, position, windowInfo } = event.detail;
      // TODO: Implement highlighting in AlignmentViewer 2.0
      console.log("Sync request:", { highlightedTaxa, position, windowInfo });
    }

    window.addEventListener('msa-sync-request', handleSyncRequest);
    return () => {
      window.removeEventListener('msa-sync-request', handleSyncRequest);
    };
  }, [syncEnabled, alignment]);

  if (!msaString) return <MSAViewerNoData />;
  if (error) return <MSAViewerError error={error} msaString={msaString} dimensions={dimensions} />;
  if (loading || !alignment) return <MSAViewerLoading />;

  return (
    <div ref={containerRef} style={outerContainerStyle}>
      <AlignmentViewer2Header
        syncEnabled={syncEnabled}
        setSyncEnabled={setSyncEnabled}
        showConsensus={showConsensus}
        setShowConsensus={setShowConsensus}
        showConservation={showConservation}
        setShowConservation={setShowConservation}
      />
      <div style={mainContainerStyle}>
        <AlignmentViewer
          alignment={alignment}
          config={{
            sequenceHeader: { show: true },
            alignmentOverview: { show: true },
            treeview: { show: true },
            sequenceLogos: { show: showConsensus },
            conservationPlot: { show: showConservation },
            width: dimensions.width,
            height: dimensions.height
          }}
        />
      </div>
    </div>
  );
}

// Shared styles
const outerContainerStyle = {
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
};

const headerStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: "36px",
  background: "#f8f9fa",
  flexShrink: 0
};

const mainContainerStyle = {
  flex: 1,
  padding: "4px",
  background: "#fff",
  overflow: "hidden"
};
