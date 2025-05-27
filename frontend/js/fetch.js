import { parseMSA } from './msaViewer/parsers.js';

export async function fetchMSAFromBackend() {
  try {
    let msa_id = null;
    const movieData = localStorage.getItem("phyloMovieData");
    if (movieData) {
      try {
        const parsed = JSON.parse(movieData);
        if (parsed.msa_id) msa_id = parsed.msa_id;
      } catch {}
    }
    if (!msa_id) msa_id = localStorage.getItem("phyloMovieMSAId");
    let url = "/msa";
    if (msa_id) url += `?msa_id=${encodeURIComponent(msa_id)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("No MSA file available on the server.");
    const msaRaw = await response.json();
    const msaData = parseMSA(msaRaw.content);
    if (msaData) {
      localStorage.setItem("phyloMovieMSAData", JSON.stringify(msaData));
      
      // Dispatch custom event to notify MSA viewer of data update
      window.dispatchEvent(new CustomEvent('msa-data-updated'));
      
      return msaData;
    }
    return null;
  } catch (err) {
    console.error("[fetchMSAFromBackend] Error:", err);
    return null;
  }
}


export async function fetchTreeData(formData) {
  try {
    console.log("[fetchTreeData] Sending request to /treedata");
    const response = await fetch("/treedata", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("[fetchTreeData] Received data:", data);

    if (data.error) {
      throw new Error(`Server error: ${data.error}`);
    }

    // Save to localStorage BEFORE redirecting
    localStorage.setItem("phyloMovieData", JSON.stringify(data));
    if (data.msa_id) {
      localStorage.setItem("phyloMovieMSAId", data.msa_id);
    }
    console.log("[fetchTreeData] Data saved to localStorage");

    // Save MSA data if provided
    const msaFile = formData.get("msaFile");
    if (msaFile) {
      try {
        const msaText = await msaFile.text();
        const msaData = parseMSA(msaText);
        if (msaData) {
          localStorage.setItem("phyloMovieMSAData", JSON.stringify(msaData));
          console.log("[fetchTreeData] MSA data saved to localStorage");
          
          // Dispatch custom event to notify MSA viewer of data update
          window.dispatchEvent(new CustomEvent('msa-data-updated'));
        }
      } catch (msaErr) {
        console.error("[fetchTreeData] Error parsing MSA file:", msaErr);
        // Continue with tree data even if MSA parsing fails
      }
    }

    // Redirect after successful storage
    window.location.href = "/vis.html";
  } catch (err) {
    console.error("[fetchTreeData] Error:", err);
    alert(`Error processing tree data: ${err.message}`);
  }
}
