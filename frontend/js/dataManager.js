import localforage from 'localforage';
// import { parseMSA } from './msaViewer/parsers.js'; // No longer needed

const requiredFields = [
  "tree_list",
  "weighted_robinson_foulds_distance_list",
  "rfd_list",
  "window_size",
  "window_step_size",
  "to_be_highlighted",
  "sorted_leaves",
  "file_name",
  "embedding",
];

/**
 * Fetches tree data from the server and stores it in localForage.
 * @param {FormData} formData The form data containing the tree file and other options.
 */
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
    console.log("[fetchTreeData] tree_names in response:", data.tree_names || 'NOT_FOUND');

    if (data.error) {
      throw new Error(`Server error: ${data.error}`);
    }

    // Save to IndexedDB (localForage) BEFORE redirecting
    await localforage.setItem("phyloMovieData", data);
    if (data.msa_id) {
      await localforage.setItem("phyloMovieMSAId", data.msa_id);
    }
    console.log("[fetchTreeData] Data saved to IndexedDB (localForage)");

    // Save MSA data if provided (store raw string only)
    const msaFile = formData.get("msaFile");
    if (msaFile && msaFile.size > 0) {
      try {
        const msaText = await msaFile.text();
        await localforage.setItem("phyloMovieMSAData", { rawData: msaText });
        window.dispatchEvent(new CustomEvent('msa-data-updated'));
        console.log("[fetchTreeData] MSA raw data saved to IndexedDB (localForage)");
      } catch (msaErr) {
        console.error("[fetchTreeData] Error saving raw MSA file:", msaErr);
        // Continue with tree data even if MSA saving fails
      }
    } else if (data.msa_content) {
      // If backend processed MSA content, store it
      try {
        await localforage.setItem("phyloMovieMSAData", { rawData: data.msa_content });
        window.dispatchEvent(new CustomEvent('msa-data-updated'));
        console.log("[fetchTreeData] MSA data from backend saved to IndexedDB (localForage)");
      } catch (msaErr) {
        console.error("[fetchTreeData] Error saving backend MSA data:", msaErr);
      }
    }

    // Redirect after successful storage
    window.location.href = "/vis.html";
  } catch (err) {
    console.error("[fetchTreeData] Error:", err);
    alert(`Error processing tree data: ${err.message}`);
  }
}

/**
 * Retrieves and validates phyloMovieData from localForage.
 * @returns {Promise<Object|null>} The parsed data if valid, otherwise null.
 * @throws {Error} If data is missing required fields.
 */
export async function getPhyloMovieData() {
  console.log("[getPhyloMovieData] Attempting to retrieve phyloMovieData from localForage.");
  const storedData = await localforage.getItem("phyloMovieData");

  if (!storedData) {
    console.warn("[getPhyloMovieData] No phyloMovieData found in localForage.");
    return null;
  }

  console.log("[getPhyloMovieData] Data found, proceeding with validation.");
  const missingFields = requiredFields.filter((f) => !(f in storedData));

  if (missingFields.length > 0) {
    console.error("[getPhyloMovieData] Missing required fields:", missingFields);
    await localforage.removeItem("phyloMovieData"); // Clear invalid data
    throw new Error(`Missing required data fields: ${missingFields.join(", ")}`);
  }

  console.log("[getPhyloMovieData] Successfully loaded and validated phyloMovieData.");
  return storedData;
}

/**
 * Retrieves MSA (Multiple Sequence Alignment) data from localForage.
 * @async
 * @function getMSAData
 * @returns {Promise<Object|null>} The MSA data if found, otherwise null.
 */
export async function getMSAData() {
  try {
    console.log("[getMSAData] Attempting to retrieve phyloMovieMSAData from localForage.");
    const msaData = await localforage.getItem("phyloMovieMSAData");
    if (!msaData) {
      console.warn("[getMSAData] No phyloMovieMSAData found in localForage.");
      return null;
    }
    console.log("[getMSAData] Successfully loaded phyloMovieMSAData.");
    return msaData;
  } catch (error) {
    console.error("[getMSAData] Error retrieving phyloMovieMSAData from localForage:", error);
    return null;
  }
}
