import localforage from 'localforage';

/**
 * Unified data service for PhyloMovies
 * Consolidates data storage and retrieval operations to eliminate duplication
 */

// Required fields for flat InterpolationSequence structure validation
const REQUIRED_PHYLO_FIELDS = [
  "interpolated_trees",
  "tree_metadata",
  "distances"
];


// Storage keys
const STORAGE_KEYS = {
  PHYLO_DATA: "phyloMovieData"
};

/**
 * Generic storage operations
 */
export const storage = {
  async get(key) {
    try {
      return await localforage.getItem(key);
    } catch (error) {
      console.error(`[DataService] Error retrieving ${key}:`, error);
      return null;
    }
  },

  async set(key, value) {
    try {
      await localforage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`[DataService] Error storing ${key}:`, error);
      return false;
    }
  },

  async remove(key) {
    try {
      await localforage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[DataService] Error removing ${key}:`, error);
      return false;
    }
  }
};

/**
 * PhyloMovie data operations
 */
export const phyloData = {
  async get() {
    const data = await storage.get(STORAGE_KEYS.PHYLO_DATA);

    if (!data) {
      console.warn("[DataService] No phyloMovieData found");
      return null;
    }

    // Return the full hierarchical MovieData object
    return this.validate(data);
  },

  async set(data) {
    console.log('[DataService] Saving data - window_size:', data?.window_size, 'window_step_size:', data?.window_step_size);
    return await storage.set(STORAGE_KEYS.PHYLO_DATA, data);
  },

  async remove() {
    return await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  },

  validate(data) {
    const missingFields = REQUIRED_PHYLO_FIELDS.filter(field => !(field in data));

    if (missingFields.length > 0) {
      console.error("[DataService] Missing required fields:", missingFields);
      this.remove(); // Clear invalid data
      throw new Error(`Missing required data fields: ${missingFields.join(", ")}`);
    }

    return data;
  }
};

/**
 * Server communication operations
 */
export const server = {
  async fetchTreeData(formData) {
    try {
      const response = await fetch("/treedata", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(`Server error: ${data.error}`);
      }
      return data; // Return the fetched data
    } catch (error) {
      throw error;
    }
  }
};

/**
 * High-level workflow operations
 */
export const workflows = {
  async saveTreeDataWorkflow(serverData) {
    try {
      await phyloData.set(serverData);
      return true;
    } catch (error) {
      console.error("[DataService] Error in save workflow:", error);
      throw error;
    }
  },

  async handleMSADataSaving(formData, serverData) {
    try {
      console.log('[DataService] MSA data included in main data - window_size:', serverData.window_size, 'window_step_size:', serverData.window_step_size);
      return true;
    } catch (error) {
      console.error("[DataService] Error handling MSA data:", error);
      throw error;
    }
  }
};

// Export constants for external use
export { STORAGE_KEYS };
