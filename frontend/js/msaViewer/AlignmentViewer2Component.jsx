import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  AlignmentViewer,
  FastaAlignment,
  PositionsToStyle,
  ResidueColoring,
  AminoAcidColorSchemes,
  NucleotideColorSchemes,
  SequenceSorter,
  AlignmentTypes
} from "alignment-viewer-2";
// Import the compiled CSS
import "alignment-viewer-2/dist/standalone/alignmentviewer.css";

// Reuse your existing UI components
function MSAViewerNoData() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      borderRadius: '8px',
      boxSizing: 'border-box',
      padding: '32px',
      color: '#333',
      fontSize: '16px',
      opacity: 0.9
    }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: 8 }}>No MSA Data Available</div>
      <div style={{ fontSize: '15px', opacity: 0.7 }}>Please upload an MSA file to continue</div>
    </div>
  );
}

function MSAViewerError({ error, msaString, dimensions }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      borderRadius: '8px',
      boxSizing: 'border-box',
      padding: '32px',
      color: '#ff6b6b',
      fontSize: '16px',
      opacity: 0.95
    }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: 8 }}>MSA Viewer Error</div>
      <div style={{ fontSize: '15px', opacity: 0.8, color: '#333', marginBottom: 12 }}>{error}</div>
      <details style={{ fontSize: '12px', opacity: 0.6, maxWidth: '600px' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Debug Information</summary>
        <pre style={{
          background: '#1a1a1a',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '11px',
          overflow: 'auto',
          maxHeight: '200px',
          color: '#fff'
        }}>
          MSA String Length: {msaString?.length || 0}
          {'\n'}MSA Preview: {msaString?.substring(0, 200)}...
          {'\n'}Container Dimensions: {dimensions ? `${dimensions.width}x${dimensions.height}` : 'Not calculated'}
        </pre>
      </details>
    </div>
  );
}

function MSAViewerLoading() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      borderRadius: '8px',
      boxSizing: 'border-box',
      padding: '32px',
      color: '#333',
      fontSize: '16px',
      opacity: 0.9
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #444',
        borderTop: '4px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 16
      }}></div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: 8 }}>Loading MSA Viewer</div>
      <div style={{ fontSize: '15px', opacity: 0.7 }}>Preparing multiple sequence alignment...</div>
    </div>
  );
}

// Parse MSA string into alignment object
function createAlignmentFromMSA(msaString) {
  if (!msaString) throw new Error("No MSA string provided");

  try {
    // AlignmentViewer 2.0 can handle FASTA directly
    return FastaAlignment.fromFileContents("MSA_ALIGNMENT", msaString);
  } catch (error) {
    console.error("Failed to parse MSA:", error);
    throw new Error(`Failed to parse MSA: ${error.message}`);
  }
}

// Calculate dimensions (reuse your existing logic)
function calculateMSADimensions(containerRef, containerWidth, containerHeight) {
  const defaultWidth = 1200;
  const defaultHeight = 500;
  const padding = 20;
  const headerHeight = 0;

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

// Header component with controls
function AlignmentViewerHeader({
  syncEnabled,
  setSyncEnabled,
  showLogo,
  setShowLogo,
  showConsensus,
  setShowConsensus,
  colorScheme,
  setColorScheme
}) {
  const colorSchemes = [
    'clustal', 'nucleotide', 'maeditor', 'cinema', 'hydrophobicity',
    'purine_pyrimidine', 'tc_coffee', 'turn', 'strand', 'buried_index',
    'helix_propensity', 'taylor'
  ];

  return (
    <div style={{
      padding: "8px 12px",
      borderBottom: "1px solid #eee",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: "36px",
      background: "#f8f9fa",
      flexShrink: 0
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>Multiple Sequence Alignment</h3>
        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
          High-performance alignment viewer
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <label style={{ fontSize: "14px", color: "#333", display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          Sync with Main View
        </label>

        <label style={{ fontSize: "14px", color: "#333", display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showLogo}
            onChange={(e) => setShowLogo(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          Sequence Logo
        </label>

        <label style={{ fontSize: "14px", color: "#333", display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showConsensus}
            onChange={(e) => setShowConsensus(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          Consensus
        </label>

        <select
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value)}
          style={{ fontSize: "12px", padding: "2px 4px" }}
        >
          {colorSchemes.map(scheme => (
            <option key={scheme} value={scheme}>{scheme}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Main component
export default function AlignmentViewer2Component({
  msaString,
  containerWidth = 1200,
  containerHeight = 500
}) {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showConsensus, setShowConsensus] = useState(true);
  const [colorScheme, setColorScheme] = useState('clustal');
  const [alignment, setAlignment] = useState(null);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef();
  const syncEnabledRef = useRef(syncEnabled);

  useEffect(() => { syncEnabledRef.current = syncEnabled; }, [syncEnabled]);

  // Create alignment from MSA string
  useEffect(() => {
    if (!msaString) {
      setError("No MSA string provided");
      setLoading(false);
      return;
    }

    try {
      const alignmentObj = createAlignmentFromMSA(msaString);
      setAlignment(alignmentObj);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setAlignment(null);
      setLoading(false);
    }
  }, [msaString]);

  // Calculate dimensions
  useEffect(() => {
    const newDimensions = calculateMSADimensions(containerRef, containerWidth, containerHeight);
    setDimensions(newDimensions);
  }, [containerWidth, containerHeight]);

  // Responsive resize
  const handleResize = useCallback(() => {
    if (!containerRef.current) return;
    const newDimensions = calculateMSADimensions(containerRef, containerWidth, containerHeight);
    setDimensions(newDimensions);
  }, [containerWidth, containerHeight]);

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

  // Sync event handling (reuse your existing logic)
  useEffect(() => {
    function handleSyncRequest(event) {
      if (!syncEnabledRef.current || !alignment) {
        console.log("MSA sync request skipped: Sync not enabled or alignment not ready.");
        return;
      }

      const { highlightedTaxa, position, windowInfo } = event.detail;

      try {
        // AlignmentViewer 2.0 uses different methods for highlighting
        // You'll need to implement these based on the library's API
        console.log("Sync request received:", { highlightedTaxa, position, windowInfo });

        // TODO: Implement highlighting logic for AlignmentViewer 2.0
        // This will depend on the specific API methods available

      } catch (syncError) {
        console.error("Error processing msa-sync-request:", syncError, event.detail);
      }
    }

    window.addEventListener('msa-sync-request', handleSyncRequest);
    return () => {
      window.removeEventListener('msa-sync-request', handleSyncRequest);
    };
  }, [alignment]);

  // Render states
  if (!msaString) return <MSAViewerNoData />;
  if (error) return <MSAViewerError error={error} msaString={msaString} dimensions={dimensions} />;
  if (loading || !alignment || !dimensions) return <MSAViewerLoading />;

  return (
    <div ref={containerRef} style={{
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
    }}>
      <AlignmentViewerHeader
        syncEnabled={syncEnabled}
        setSyncEnabled={setSyncEnabled}
        showLogo={showLogo}
        setShowLogo={setShowLogo}
        showConsensus={showConsensus}
        setShowConsensus={setShowConsensus}
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
      />

      <div style={{
        flex: 1,
        padding: "4px",
        background: "#fff",
        overflow: "hidden"
      }}>
        <AlignmentViewer
          alignment={alignment}
          alignmentType={alignment.getPredictedType()}
          aaColorScheme={AminoAcidColorSchemes.list[0]}
          ntColorScheme={NucleotideColorSchemes.list[0]}
          positionsToStyle={PositionsToStyle.ALL}
          residueColoring={ResidueColoring.LIGHT}
          zoomLevel={13}
          sortBy={SequenceSorter.INPUT}
          showConsensus={showConsensus}
          showLogo={showLogo}
          showAnnotations={true}
          showMinimap={false}
          showQuery={true}
          showRuler={true}
          disableSearch={false}
          disableSearchKeyboardShortcut={false}
          metadataSizing={{
            type: "adjustable-width",
            startingWidth: 150,
            minWidth: 50,
            maxWidth: 600
          }}
          minimapSizing={{
            type: "adjustable-width",
            startingWidth: 100,
            minWidth: 75,
            maxWidth: 600
          }}
          logoSizing={{
            type: "adjustable-height",
            startingHeight: 100,
            minHeight: 50,
            maxHeight: 300
          }}
          barplotSizing={{
            type: "adjustable-height",
            startingHeight: 60,
            minHeight: 25,
            maxHeight: 200
          }}
          logoOptions={{
            logoType: "letters"
          }}
          barplots={[]}
        />
      </div>
    </div>
  );
}
