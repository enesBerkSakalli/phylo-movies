import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import MSAViewerContent from "./MSAViewerModal";

function App() {
  console.log("React MSA modal loaded");
  const [msaString, setMsaString] = useState("");
  const [msaModalOpen, setMsaModalOpen] = useState(false);
  const [winboxInstance, setWinboxInstance] = useState(null);

  // Function to load MSA data from localStorage
  const loadMSAData = () => {
    const local = localStorage.getItem("phyloMovieMSAData");
    console.log("Raw localStorage data:", local);

    if (local) {
      try {
        const parsed = JSON.parse(local);
        console.log("Parsed MSA data:", parsed);

        if (parsed.rawData && typeof parsed.rawData === "string") {
          console.log("Using rawData from parsed MSA object");
          setMsaString(parsed.rawData);
        } else if (parsed.sequences && Array.isArray(parsed.sequences)) {
          console.log("Converting sequences array back to FASTA format");
          const fastaString = parsed.sequences
            .map((seq) => `>${seq.id}\n${seq.sequence}`)
            .join("\n");
          setMsaString(fastaString);
        } else if (typeof parsed === "string") {
          console.log("Using parsed string directly");
          setMsaString(parsed);
        } else {
          console.warn("Unrecognized MSA data format:", parsed);
        }
      } catch (e) {
        console.log("Data is not JSON, treating as plain string");
        setMsaString(local);
      }
    } else {
      console.log("No MSA data found in localStorage");
    }
  };

  // Load MSA data from localStorage on mount
  useEffect(() => {
    loadMSAData();
  }, []);

  // Listen for localStorage changes and reload MSA data
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "phyloMovieMSAData" || e.key === null) {
        console.log("MSA data changed in localStorage, reloading...");
        loadMSAData();

        // If MSA viewer is open, close it so it can be reopened with new data
        if (winboxInstance) {
          console.log("Closing existing MSA viewer to refresh with new data");
          winboxInstance.close();
        }
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom events from same tab (since storage events don't fire in same tab)
    const handleCustomStorageChange = () => {
      console.log("Custom MSA data update event received, reloading...");
      loadMSAData();

      // If MSA viewer is open, close it so it can be reopened with new data
      if (winboxInstance) {
        console.log("Closing existing MSA viewer to refresh with new data");
        winboxInstance.close();
      }
    };

    window.addEventListener("msa-data-updated", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
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

// Ensure syncMSAViewer is always available, even before the modal is opened
window.syncMSAViewer =
  window.syncMSAViewer ||
  ((highlightedTaxa, position, windowInfo) => {
    console.warn("MSA viewer not ready yet, dispatching event instead");
    window.dispatchEvent(
      new CustomEvent("open-msa-viewer", {
        detail: { highlightedTaxa, position, windowInfo },
      })
    );
  });

// Create root container if it doesn't exist
let root = document.getElementById("msa-react-root");
if (!root) {
  root = document.createElement("div");
  root.id = "msa-react-root";
  document.body.appendChild(root);
}

if (root) createRoot(root).render(<App />);
