
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import AlignmentViewer2Component from "./AlignmentViewer2Component";
import localforage from "localforage";


// Custom hook: Load and update MSA data from localForage
function useMSAData() {
  const [msaString, setMsaString] = useState("");

  const loadMSAData = useCallback(async () => {
    try {
      const local = await localforage.getItem("phyloMovieMSAData");
      if (local) {
        if (local.rawData && typeof local.rawData === "string") {
          setMsaString(local.rawData);
        } else if (local.sequences && Array.isArray(local.sequences)) {
          const fastaString = local.sequences
            .map((seq) => `>${seq.id}\n${seq.sequence}`)
            .join("\n");
          setMsaString(fastaString);
        } else if (typeof local === "string") {
          setMsaString(local);
        } else {
          setMsaString("");
        }
      } else {
        setMsaString("");
      }
    } catch (e) {
      setMsaString("");
    }
  }, []);

  useEffect(() => { loadMSAData(); }, [loadMSAData]);

  // Listen for msa-data-updated events
  useEffect(() => {
    const handler = () => { loadMSAData(); };
    window.addEventListener("msa-data-updated", handler);
    return () => window.removeEventListener("msa-data-updated", handler);
  }, [loadMSAData]);

  return msaString;
}

// Custom hook: Manage WinBox window for MSA viewer
function useMSAWinBox(msaString) {
  const winboxInstance = useRef(null);

  useEffect(() => {
    function openMSAWindow(e) {
      if (!msaString) {
        alert("No MSA data available. Please upload an MSA file.");
        return;
      }
      if (winboxInstance.current) {
        winboxInstance.current.focus();
        return;
      }
      const container = document.createElement("div");
      container.id = "msa-winbox-content";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "hidden";
      const wb = new WinBox("Multiple Sequence Alignment", {
        class: ["no-full"],
        background: "#373747",
        border: 2,
        width: 1000,
        height: 600,
        x: "center",
        y: "center",
        mount: container,
        onclose: () => {
          if (container.__reactRoot) {
            try { container.__reactRoot.unmount(); } catch {}
          }
          winboxInstance.current = null;
        },
        onresize: (width, height) => {
          if (container.__reactRoot) {
            try {
              container.__reactRoot.render(
                <AlignmentViewer2Component
                  msaString={msaString}
                  containerWidth={width}
                  containerHeight={height}
                />
              );
            } catch {}
          }
        },
      });
      const root = createRoot(container);
      container.__reactRoot = root;
      root.render(
        <AlignmentViewer2Component
          msaString={msaString}
          containerWidth={wb.width}
          containerHeight={wb.height}
        />
      );
      winboxInstance.current = wb;
    }
    window.addEventListener("open-msa-viewer", openMSAWindow);
    return () => {
      window.removeEventListener("open-msa-viewer", openMSAWindow);
      if (winboxInstance.current) winboxInstance.current.close();
    };
  }, [msaString]);
}

function App() {
  const msaString = useMSAData();
  useMSAWinBox(msaString);
  // This component doesn't render anything visible - it just manages the WinBox
  return null;
}

// Create root container if it doesn't exist
let root = document.getElementById("msa-react-root");
if (!root) {
  root = document.createElement("div");
  root.id = "msa-react-root";
  document.body.appendChild(root);
}

if (root) createRoot(root).render(<App />);
