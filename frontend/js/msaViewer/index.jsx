import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import MSAViewerContent from "./MSAViewerModal";
import localforage from "localforage";

function App() {
  console.log("React MSA modal loaded");
  const [msaString, setMsaString] = useState("");
  const [msaModalOpen, setMsaModalOpen] = useState(false);
  const [winboxInstance, setWinboxInstance] = useState(null);

  // Function to load MSA data from localForage (IndexedDB)
  const loadMSAData = async () => {
    try {
      const local = await localforage.getItem("phyloMovieMSAData");
      console.log("[MSAViewer] Raw localForage data:", local);

      if (local) {
        if (local.rawData && typeof local.rawData === "string") {
          console.log("[MSAViewer] Using rawData from parsed MSA object");
          setMsaString(local.rawData);
        } else if (local.sequences && Array.isArray(local.sequences)) {
          console.log("[MSAViewer] Converting sequences array back to FASTA format");
          const fastaString = local.sequences
            .map((seq) => `>${seq.id}\n${seq.sequence}`)
            .join("\n");
          setMsaString(fastaString);
        } else if (typeof local === "string") {
          console.log("[MSAViewer] Using string directly");
          setMsaString(local);
        } else {
          console.warn("[MSAViewer] Unrecognized MSA data format:", local);
        }
      } else {
        console.log("[MSAViewer] No MSA data found in localForage");
        setMsaString("");
      }
    } catch (e) {
      console.error("[MSAViewer] Error loading MSA data from localForage:", e);
      setMsaString("");
    }
  };

  // Load MSA data from localForage on mount
  useEffect(() => {
    loadMSAData();
  }, []);

  // Listen for custom msa-data-updated events and reload MSA data
  useEffect(() => {
    const handleCustomStorageChange = () => {
      console.log("[MSAViewer] Custom MSA data update event received, reloading...");
      loadMSAData();
      // If MSA viewer is open, close it so it can be reopened with new data
      if (winboxInstance) {
        console.log("[MSAViewer] Closing existing MSA viewer to refresh with new data");
        winboxInstance.close();
      }
    };
    window.addEventListener("msa-data-updated", handleCustomStorageChange);
    return () => {
      window.removeEventListener("msa-data-updated", handleCustomStorageChange);
    };
  }, [winboxInstance]);

  // Listen for open-msa-viewer events and create WinBox
  useEffect(() => {
    function openMSAWindow(e) {
      console.log("open-msa-viewer event received", e.detail);

      if (!msaString) {
        alert("No MSA data available. Please upload an MSA file.");
        return;
      }

      // If a WinBox instance already exists, focus it instead of creating a new one
      if (winboxInstance) {
        winboxInstance.focus();
        return;
      }

      // Create a container for the React component
      const container = document.createElement("div");
      container.id = "msa-winbox-content";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "hidden";

      // Create WinBox instance
      const wb = new WinBox("Multiple Sequence Alignment", {
        class: ["no-full"],
        background: "#373747",
        border: 2,
        width: 1000,
        height: 600,
        x: "center",
        y: "center",
        mount: container,
        onresize: (width, height) => {
          // Update MSA model width when window is resized
          if (window.syncMSAViewer && window.msaModelRef) {
            setTimeout(() => {
              // Actually update the model's width when the window is resized
              if (
                window.msaModelRef.current &&
                typeof window.msaModelRef.current.setWidth === "function"
              ) {
                window.msaModelRef.current.setWidth(width - 40); // Account for padding
                console.log("Updated MSA model width to:", width - 40);
              }
            }, 100);
          }
        },
        onclose: () => {
          // Cleanup React root on close
          if (container.__reactRoot) {
            try {
              container.__reactRoot.unmount();
            } catch (err) {
              console.error("Error unmounting React root:", err);
            }
          }
          setWinboxInstance(null);
        },
      });

      // Render React component into the container
      const root = createRoot(container);
      container.__reactRoot = root;

      root.render(
        <MSAViewerContent
          msaString={msaString}
          containerWidth={wb.width}
          containerHeight={wb.height}
        />
      );

      setWinboxInstance(wb);
      console.log("MSA WinBox created");
    }

    window.addEventListener("open-msa-viewer", openMSAWindow);
    return () => {
      window.removeEventListener("open-msa-viewer", openMSAWindow);
      // Cleanup any open WinBox on unmount
      if (winboxInstance) {
        winboxInstance.close();
      }
    };
  }, [msaString, winboxInstance]);

  console.log(
    "Modal open state:",
    msaModalOpen,
    "MSA string length:",
    msaString?.length || 0
  );
  console.log("MSA string preview:", msaString?.substring(0, 100));

  // This component doesn't render anything visible - it just manages the WinBox
  return null;
}

// Initialize a fallback sync function only if none exists
if (!window.syncMSAViewer) {
  window.syncMSAViewer = (highlightedTaxa, position, windowInfo) => {
    console.log("MSA viewer not ready, opening viewer with sync data");
    window.dispatchEvent(
      new CustomEvent("open-msa-viewer", {
        detail: { highlightedTaxa, position, windowInfo },
      })
    );
  };
}

// Create root container if it doesn't exist
let root = document.getElementById("msa-react-root");
if (!root) {
  root = document.createElement("div");
  root.id = "msa-react-root";
  document.body.appendChild(root);
}

if (root) createRoot(root).render(<App />);