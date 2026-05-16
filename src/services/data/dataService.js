import localforage from 'localforage';
import { validatePhyloMovieData } from '../../domain/backend/phyloMovieSchema.ts';

/**
 * Unified data service for PhyloMovies
 * Consolidates data storage and retrieval operations to eliminate duplication
 */

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
        throw new Error(`Dataset too large for browser storage. Try reducing the number of trees or window size.`, { cause: error });
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
    const validatedBackendData = validatePhyloMovieData(data);
    await storage.set(STORAGE_KEYS.PHYLO_DATA, validatedBackendData);
    return validatedBackendData;
  },

  async remove() {
    await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  },

  validate(data) {
    return validatePhyloMovieData(data);
  }
};
