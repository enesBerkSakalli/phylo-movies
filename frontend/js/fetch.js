
import localforage from 'localforage';
import { parseMSA } from './msaViewer/parsers.js';

export async function fetchMSAFromBackend() {
  try {
    let msa_id = null;
    const movieData = await localforage.getItem("phyloMovieData");
    if (movieData) {
      try {
        if (movieData.msa_id) msa_id = movieData.msa_id;
      } catch {}
    }
    if (!msa_id) msa_id = await localforage.getItem("phyloMovieMSAId");
    let url = "/msa";
    if (msa_id) url += `?msa_id=${encodeURIComponent(msa_id)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("No MSA file available on the server.");
    const msaRaw = await response.json();
    const msaData = parseMSA(msaRaw.content);
    if (msaData) {
      await localforage.setItem("phyloMovieMSAData", msaData);
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

    // Save to IndexedDB (localForage) BEFORE redirecting
    await localforage.setItem("phyloMovieData", data);
    if (data.msa_id) {
      await localforage.setItem("phyloMovieMSAId", data.msa_id);
    }
    console.log("[fetchTreeData] Data saved to IndexedDB (localForage)");

    // Save MSA data if provided
    const msaFile = formData.get("msaFile");
    if (msaFile) {
      try {
        const msaText = await msaFile.text();
        const msaData = parseMSA(msaText);
        if (msaData) {
          await localforage.setItem("phyloMovieMSAData", msaData);
          console.log("[fetchTreeData] MSA data saved to IndexedDB (localForage)");
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
