import localforage from 'localforage';

/**
 * Unified data service for PhyloMovies
 * Consolidates data storage and retrieval operations to eliminate duplication
 */

// Required fields for flat InterpolationSequence structure validation
const REQUIRED_PHYLO_FIELDS = [
  "interpolated_trees",
  "tree_metadata",
  "rfd_list"
];

// Storage keys
const STORAGE_KEYS = {
  PHYLO_DATA: "phyloMovieData"
};

// Custom events
const EVENTS = {
  PHYLO_DATA_UPDATED: "phylo-data-updated"
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
  },

  // Getter methods for flat data access (aligned with InterpolationSequence)
  getTrees(data) {
    return {
      tree_list: data.interpolated_trees || [],
      tree_names: data.tree_names || [],
      original_tree_count: data.original_tree_count || 0,
      interpolated_tree_count: data.interpolated_tree_count || 0,
      processing_time_ms: data.processing_time_ms || (data.processing_time * 1000) || 0,
    };
  },

  getDistances(data) {
    return {
      rfd_list: data.rfd_list || [],
      weighted_robinson_foulds_distance_list: data.wrfd_list || data.weighted_robinson_foulds_distance_list || [],
      distance_matrix: data.distance_matrix || null,
    };
  },

  getVisualization(data) {
    return {
      embedding: data.embedding || [],
      sorted_leaves: data.sorted_leaves || [],
      to_be_highlighted: data.highlighted_elements || data.to_be_highlighted || [],
    };
  },

  getMSA(data) {
    return {
      msa_content: data.msa?.content || null,
      alignment_length: data.msa?.alignment_length || null,
      window_size: data.msa?.window_size || data.window_size || 1,
      window_step_size: data.msa?.step_size || data.window_step_size || 1,
      windows_are_overlapping: data.msa?.overlapping || false,
    };
  },

  getFileInfo(data) {
    return {
      file_name: data.file_name || 'unknown',
      rooting_enabled: data.processing_options?.rooting_enabled || false,
    };
  },

  // Compatibility method that returns flat structure for existing code
  getFlatData(data) {
    const trees = this.getTrees(data);
    const distances = this.getDistances(data);
    const visualization = this.getVisualization(data);
    const msa = this.getMSA(data);
    const fileInfo = this.getFileInfo(data);

    return {
      ...trees,
      ...distances,
      ...visualization,
      ...msa,
      ...fileInfo,
    };
  }
};

/**
 * MSA data operations
 */
export const msaData = {
  async get() {
    return await storage.get(STORAGE_KEYS.MSA_DATA);
  },

  async set(data, dispatchEvent = true) {
    const success = await storage.set(STORAGE_KEYS.MSA_DATA, data);

    if (success && dispatchEvent) {
      this.dispatchUpdateEvent();
    }

    return success;
  },

  async remove() {
    return await storage.remove(STORAGE_KEYS.MSA_DATA);
  },

  dispatchUpdateEvent() {
    try {
      window.dispatchEvent(new CustomEvent(EVENTS.MSA_UPDATED));
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

      // Debug logging for s_edge data flow verification
      console.log("[DEBUG] Frontend received data from backend:");
      console.log("[DEBUG]   - tree_metadata:", data.tree_metadata ? data.tree_metadata.length : "undefined", "items");
      console.log("[DEBUG]   - s_edge_metadata:", data.s_edge_metadata);
      console.log("[DEBUG]   - lattice_edge_tracking:", data.lattice_edge_tracking ? data.lattice_edge_tracking.length : "undefined", "items");
      if (data.tree_metadata && data.tree_metadata.length > 0) {
        console.log("[DEBUG]   - Sample tree_metadata[0]:", data.tree_metadata[0]);
      }
      
      // Log tree_pair_solutions structure
      console.log("[DEBUG]   - tree_pair_solutions type:", typeof data.tree_pair_solutions);
      console.log("[DEBUG]   - tree_pair_solutions is array:", Array.isArray(data.tree_pair_solutions));
      console.log("[DEBUG]   - tree_pair_solutions keys:", data.tree_pair_solutions ? Object.keys(data.tree_pair_solutions).slice(0, 5) : "N/A");
      
      if (data.tree_pair_solutions) {
        const firstKey = Object.keys(data.tree_pair_solutions)[0];
        if (firstKey) {
          const firstSolution = data.tree_pair_solutions[firstKey];
          console.log(`[DEBUG]   - Sample tree_pair_solution[${firstKey}]:`, {
            hasLatticeEdgeSolutions: !!firstSolution.lattice_edge_solutions,
            latticeEdgeSolutionsType: typeof firstSolution.lattice_edge_solutions,
            latticeEdgeSolutionsKeys: firstSolution.lattice_edge_solutions ? Object.keys(firstSolution.lattice_edge_solutions).slice(0, 3) : "N/A",
            sampleSolution: firstSolution
          });
        }
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

      // Save MSA ID if provided
      if (serverData.msa_id) {
        await msaId.set(serverData.msa_id);
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
        return;
      }

      // Priority 2: MSA content from server response
      if (serverData?.msa_content) {
        await msaData.setFromText(serverData.msa_content);
        return;
      }

    } catch (error) {
      console.error("[DataService] Error saving MSA data:", error);
      // Don't throw - continue with tree data even if MSA fails
    }
  }
};

// Export constants for external use
export { STORAGE_KEYS, EVENTS };
