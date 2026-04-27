import localforage from 'localforage';
import { resolveApiUrl } from '@/services/data/apiConfig';

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
const storage = {
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
    } catch (error) {
      // Handle IndexedDB quota/memory errors
      if (error.name === 'DataCloneError' || error.message?.includes('out of memory')) {
        console.error(`[DataService] Data too large to store in IndexedDB. Trees: ${value?.interpolated_trees?.length || 'unknown'}`);
        throw new Error(`Dataset too large for browser storage. Try reducing the number of trees or window size.`);
      }
      console.error(`[DataService] Error storing ${key}:`, error);
      throw error;
    }
  },

  async remove(key) {
    try {
      await localforage.removeItem(key);
    } catch (error) {
      console.error(`[DataService] Error removing ${key}:`, error);
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

    try {
      return this.validate(data);
    } catch (error) {
      await this.remove();
      throw error;
    }
  },

  async set(data) {
    console.log('[DataService] Saving data - window_size:', data?.window_size, 'window_step_size:', data?.window_step_size);
    const validatedData = this.validate(data);
    await storage.set(STORAGE_KEYS.PHYLO_DATA, validatedData);
    return validatedData;
  },

  async remove() {
    await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  },

  validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid phyloMovieData payload');
    }

    const missingFields = REQUIRED_PHYLO_FIELDS.filter(field => !(field in data));

    if (missingFields.length > 0) {
      console.error("[DataService] Missing required fields:", missingFields);
      throw new Error(`Missing required data fields: ${missingFields.join(", ")}`);
    }

    if (!Array.isArray(data.interpolated_trees)) {
      throw new Error('Invalid phyloMovieData payload: interpolated_trees must be an array');
    }

    if (!Array.isArray(data.tree_metadata)) {
      throw new Error('Invalid phyloMovieData payload: tree_metadata must be an array');
    }

    if (!data.distances || typeof data.distances !== 'object') {
      throw new Error('Invalid phyloMovieData payload: distances must be an object');
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
      const url = await resolveApiUrl("/treedata");
      const response = await fetch(url, {
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
