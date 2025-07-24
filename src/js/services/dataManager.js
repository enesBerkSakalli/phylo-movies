import { server, workflows, phyloData } from './dataService.js';

/**
 * Fetches tree data from the server and stores it in localForage.
 * @param {FormData} formData The form data containing the tree file and other options.
 */
export async function fetchTreeData(formData) {
  try {
    const data = await server.fetchTreeData(formData);

    await workflows.saveTreeDataWorkflow(data, formData);

    // Redirect after successful storage
    window.location.href = "/visualization.html";
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
  return await phyloData.get();
}
