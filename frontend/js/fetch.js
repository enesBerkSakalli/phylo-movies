
import localforage from 'localforage';
// import { parseMSA } from './msaViewer/parsers.js'; // No longer needed

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
    if (msaRaw && msaRaw.content) {
      await localforage.setItem("phyloMovieMSAData", { rawData: msaRaw.content });
      window.dispatchEvent(new CustomEvent('msa-data-updated'));
      return { rawData: msaRaw.content };
    }
    return null;
  } catch (err) {
    console.error("[fetchMSAFromBackend] Error:", err);
    return null;
  }
}
