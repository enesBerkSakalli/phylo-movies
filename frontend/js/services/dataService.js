import localforage from 'localforage';

/**
 * Unified data service for PhyloMovies
 * Consolidates data storage and retrieval operations to eliminate duplication
 */

// Required fields for phyloMovieData validation
const REQUIRED_PHYLO_FIELDS = [
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

// Storage keys
const STORAGE_KEYS = {
  PHYLO_DATA: "phyloMovieData",
  MSA_DATA: "phyloMovieMSAData",
  MSA_ID: "phyloMovieMSAId"
};

// Custom events
const EVENTS = {
  MSA_UPDATED: "msa-data-updated"
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
    console.log("[DataService] Retrieving phyloMovieData");
    const data = await storage.get(STORAGE_KEYS.PHYLO_DATA);

    if (!data) {
      console.warn("[DataService] No phyloMovieData found");
      return null;
    }

    return this.validate(data);
  },

  async set(data) {
    console.log("[DataService] Storing phyloMovieData");
    return await storage.set(STORAGE_KEYS.PHYLO_DATA, data);
  },

  async remove() {
    console.log("[DataService] Removing phyloMovieData");
    return await storage.remove(STORAGE_KEYS.PHYLO_DATA);
  },

  validate(data) {
    const missingFields = REQUIRED_PHYLO_FIELDS.filter(field => !(field in data));

    if (missingFields.length > 0) {
      console.error("[DataService] Missing required fields:", missingFields);
      this.remove(); // Clear invalid data
      throw new Error(`Missing required data fields: ${missingFields.join(", ")}`);
    }

    console.log("[DataService] phyloMovieData validation successful");
    return data;
  }
};

/**
 * MSA data operations
 */
export const msaData = {
  async get() {
    console.log("[DataService] Retrieving MSA data");
    return await storage.get(STORAGE_KEYS.MSA_DATA);
  },

  async set(data, dispatchEvent = true) {
    console.log("[DataService] Storing MSA data");
    const success = await storage.set(STORAGE_KEYS.MSA_DATA, data);

    if (success && dispatchEvent) {
      this.dispatchUpdateEvent();
    }

    return success;
  },

  async remove() {
    console.log("[DataService] Removing MSA data");
    return await storage.remove(STORAGE_KEYS.MSA_DATA);
  },

  dispatchUpdateEvent() {
    try {
      window.dispatchEvent(new CustomEvent(EVENTS.MSA_UPDATED));
      console.log("[DataService] MSA update event dispatched");
    } catch (error) {
      console.error("[DataService] Error dispatching MSA update event:", error);
    }
  },

  async setFromText(rawText, dispatchEvent = true) {
    return await this.set({ rawData: rawText }, dispatchEvent);
  }
};

/**
 * MSA ID operations
 */
export const msaId = {
  async get() {
    // Try to get from main phylo data first, then fallback to separate storage
    const phyloMovieData = await storage.get(STORAGE_KEYS.PHYLO_DATA);
    if (phyloMovieData?.msa_id) {
      return phyloMovieData.msa_id;
    }

    return await storage.get(STORAGE_KEYS.MSA_ID);
  },

  async set(id) {
    return await storage.set(STORAGE_KEYS.MSA_ID, id);
  }
};

/**
 * Server communication operations
 */
export const server = {
  async fetchTreeData(formData) {
    try {
      console.log("[DataService] Sending request to /treedata");
      const response = await fetch("/treedata", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[DataService] Received tree data");

      if (data.error) {
        throw new Error(`Server error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error("[DataService] Error fetching tree data:", error);
      throw error;
    }
  },

  async fetchMSAFromBackend() {
    try {
      const msa_id = await msaId.get();
      let url = "/msa";
      if (msa_id) {
        url += `?msa_id=${encodeURIComponent(msa_id)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("No MSA file available on the server");
      }

      const msaResponse = await response.json();
      if (msaResponse?.content) {
        await msaData.setFromText(msaResponse.content);
        return { rawData: msaResponse.content };
      }

      return null;
    } catch (error) {
      console.error("[DataService] Error fetching MSA from backend:", error);
      return null;
    }
  }
};

/**
 * High-level workflow operations
 */
export const workflows = {
  async saveTreeDataWorkflow(serverData, formData) {
    try {
      // Save main phylo data
      await phyloData.set(serverData);
      console.log("[DataService] Phylo data saved");

      // Save MSA ID if provided
      if (serverData.msa_id) {
        await msaId.set(serverData.msa_id);
        console.log("[DataService] MSA ID saved");
      }

      // Handle MSA data from form or server response
      await this.handleMSADataSaving(formData, serverData);

      return true;
    } catch (error) {
      console.error("[DataService] Error in save workflow:", error);
      throw error;
    }
  },

  async handleMSADataSaving(formData, serverData) {
    try {
      // Priority 1: MSA file from form
      const msaFile = formData?.get("msaFile");
      if (msaFile && msaFile.size > 0) {
        const msaText = await msaFile.text();
        await msaData.setFromText(msaText);
        console.log("[DataService] MSA file from form saved");
        return;
      }

      // Priority 2: MSA content from server response
      if (serverData?.msa_content) {
        await msaData.setFromText(serverData.msa_content);
        console.log("[DataService] MSA content from server saved");
        return;
      }

      console.log("[DataService] No MSA data to save");
    } catch (error) {
      console.error("[DataService] Error saving MSA data:", error);
      // Don't throw - continue with tree data even if MSA fails
    }
  }
};

// Export constants for external use
export { STORAGE_KEYS, EVENTS };
