
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
