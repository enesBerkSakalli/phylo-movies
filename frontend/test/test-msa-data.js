// Test MSA data for debugging
const testMSAData = {
  sequences: [
    {
      id: "A1",
      sequence:
        "CCATTACGATGCTGAACAACTGCACTGATCCAAAGCGATAGGAGGGGTTCAAGGAATTTGCGTGAGATCTATACAAGCTCATTCAACATTGTTATCGTAGGGGCGAGACTACGCTTCGGGTACCCGGTGTGTGAGGGATGGCCC",
    },
    {
      id: "A2",
      sequence:
        "CCATTACGATGCTGAACAACTGCACTGATCCAAAGCGATAGGAGGGGTTCAAGGAATTTGCGTGAGATCTATACAAGCTCATTCAACATTGTTATCGTAGGGGCGAGACTACGCTTCGGGTACCCGGTGTGTGAGGGATGGCCC",
    },
    {
      id: "A3",
      sequence:
        "CCATTACGATGCTGAACAACTGCACTGATCCAAAGCGATAGGAGGGGTTCAAGGAATTTGCGTGAGATCTATACAAGCTCATTCAACATTGTTATCGTAGGGGCGAGACTACGCTTCGGGTACCCGGTGTGTGAGGGATGGCCC",
    },
  ],
  format: "fasta",
  rawData: ">A1\nCCATTACGATGCTGAACAAC...",
};

// Store in localStorage
localStorage.setItem("phyloMovieMSAData", JSON.stringify(testMSAData));
console.log("Test MSA data stored in localStorage");

// Function to manually trigger MSA viewer
function testMSAViewer() {
  // Try to import and use the MSA viewer
  if (window.openMSAViewer) {
    console.log("Opening MSA viewer with existing function");
    window.openMSAViewer();
  } else {
    console.log("Loading MSA viewer module...");
    import("../js/msaViewer/index.jsx")
      .then((module) => {
        console.log("MSA module loaded:", module);
        const viewer = module.openMSAViewer();
        console.log("MSA viewer opened:", viewer);
      })
      .catch((err) => {
        console.error("Failed to load MSA module:", err);
      });
  }
}

// Make function available globally
window.testMSAViewer = testMSAViewer;

console.log("Run testMSAViewer() to open the MSA viewer");
