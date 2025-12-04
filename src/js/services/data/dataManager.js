import { server, workflows, phyloData } from './dataService.js';

/**
 * Fetches tree data from the server and stores it in localForage.
 * Returns the processed data for navigation handling by the caller.
 * @param {FormData} formData The form data containing the tree file and other options.
 * @returns {Promise<Object>} The processed tree data
 */
export async function fetchTreeData(formData) {
  try {
    const data = await server.fetchTreeData(formData);
    await workflows.saveTreeDataWorkflow(data);
    return data; // Return data instead of redirecting
  } catch (err) {
    console.error("[fetchTreeData] Error:", err);
    throw new Error(`Error processing tree data: ${err.message}`);
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
