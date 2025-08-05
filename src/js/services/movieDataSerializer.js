/**
 * MovieData serializer for frontend consumption
 * Handles the flat backend response aligned with InterpolationSequence structure
 */

export class MovieDataSerializer {
  constructor(flatData) {
    this.data = flatData;
    this._validateStructure();
  }

  /**
   * Validate that the flat data has the expected structure
   */
  _validateStructure() {
    const requiredFields = ['interpolated_trees', 'tree_names', 'rfd_list'];
    const missingFields = requiredFields.filter(field => !(field in this.data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in movie data: ${missingFields.join(', ')}`);
    }

    // Warn about missing optional but important fields for TransitionIndexResolver
    const importantOptionalFields = ['tree_metadata', 'activeChangeEdgeTracking', 'activeChangeEdge_metadata'];
    const missingOptionalFields = importantOptionalFields.filter(field => !(field in this.data));

    if (missingOptionalFields.length > 0) {
      console.warn(`[MovieDataSerializer] Missing optional but important fields: ${missingOptionalFields.join(', ')}. TransitionIndexResolver functionality may be limited.`);
    }
  }

  /**
   * Get tree data (InterpolationSequence-aligned)
   */
  getTrees() {
    return {
      interpolatedTrees: this.data.interpolated_trees || [],
      treeNames: this.data.tree_names || [],
      originalCount: this.data.original_tree_count || 0,
      interpolatedCount: this.data.interpolated_tree_count || 0,
      processingTimeMs: this.data.processing_time_ms || (this.data.processing_time * 1000) || 0,
    };
  }

  /**
   * Get distance data (InterpolationSequence-aligned)
   */
  getDistances() {
    return {
      robinsonFoulds: this.data.rfd_list || [],
      weightedRobinsonFoulds: this.data.wrfd_list || this.data.weighted_robinson_foulds_distance_list || [],
      matrix: this.data.distance_matrix || null,
    };
  }

  /**
   * Get visualization data (InterpolationSequence-aligned)
   */
  getVisualization() {
    return {
      embedding: this.data.embedding || [],
      sortedLeaves: this.data.sorted_leaves || [],
      highlightedElements: this.data.highlighted_elements || this.data.to_be_highlighted || [],
    };
  }

  /**
   * Get MSA data (correctly nested in flat structure)
   */
  getMSA() {
    return {
      content: this.data.msa?.content || null,
      alignmentLength: this.data.msa?.alignment_length || null,
      windowSize: this.data.msa?.window_size || this.data.window_size || 1,
      windowStep: this.data.msa?.step_size || this.data.window_step_size || 1,
      overlapping: this.data.msa?.overlapping || false,
    };
  }

  /**
   * Get file metadata (flat structure)
   */
  getFileMetadata() {
    return {
      fileName: this.data.file_name || 'unknown',
      rootingEnabled: this.data.processing_options?.rooting_enabled || false,
    };
  }

  /**
   * Get tree metadata for TransitionIndexResolver
   */
  getTreeMetadata() {
    const metadata = this.data.tree_metadata || [];

    // Transform field names in each metadata object for consistency
    return metadata.map(item => ({
      ...item,
      activeChangeEdgeTracker: item.activeChangeEdgeTracker || item.s_edge_tracker
    }));
  }

  /**
   * Get lattice edge tracking data
   */
  getLatticeEdgeTracking() {
    return this.data.lattice_edge_tracking || this.data.activeChangeEdgeTracking || [];
  }

  /**
   * Get active change edge metadata for variable-length support
   */
  getActiveChangeEdgeMetadata() {
    return this.data.s_edge_metadata || this.data.activeChangeEdge_metadata || {
      activeChangeEdge_count: 0,
      trees_per_activeChangeEdge: {}
    };
  }

  /**
   * Get all data in a flat structure for backward compatibility
   * This can be used during transition period if needed
   */
  toFlatStructure() {
    const trees = this.getTrees();
    const distances = this.getDistances();
    const visualization = this.getVisualization();
    const msa = this.getMSA();
    const fileMetadata = this.getFileMetadata();
    const treeMetadata = this.getTreeMetadata();
    const latticeEdgeTracking = this.getLatticeEdgeTracking();
    const activeChangeEdgeMetadata = this.getActiveChangeEdgeMetadata();

    return {
      // Tree data
      tree_list: trees.interpolatedTrees,
      tree_names: trees.treeNames,

      // Distance data
      rfd_list: distances.robinsonFoulds,
      weighted_robinson_foulds_distance_list: distances.weightedRobinsonFoulds,
      distance_matrix: distances.matrix,

      // Visualization data
      embedding: visualization.embedding,
      sorted_leaves: visualization.sortedLeaves,
      to_be_highlighted: visualization.highlightedElements,

      // MSA data
      msa_content: msa.content,
      alignment_length: msa.alignmentLength,
      window_size: msa.windowSize,
      window_step_size: msa.windowStep,
      windows_are_overlapping: msa.overlapping,

      // File metadata
      file_name: fileMetadata.fileName,
      rooting_enabled: fileMetadata.rootingEnabled,

      // Processing metadata
      original_tree_count: trees.originalCount,
      interpolated_tree_count: trees.interpolatedCount,
      processing_time_ms: trees.processingTimeMs,

      // TransitionIndexResolver required fields
      tree_metadata: treeMetadata,
      activeChangeEdgeTracking: latticeEdgeTracking,
      activeChangeEdge_metadata: activeChangeEdgeMetadata,
      highlighted_elements: visualization.highlightedElements, // Alias for compatibility
    };
  }

  /**
   * Static method to create serializer from server response
   */
  static fromServerResponse(response) {
    return new MovieDataSerializer(response);
  }

  /**
   * Check if the data contains valid trees
   */
  hasValidTrees() {
    const trees = this.getTrees();
    return trees.interpolatedTrees.length > 0;
  }

  /**
   * Check if MSA data is available
   */
  hasMSAData() {
    const msa = this.getMSA();
    return msa.content !== null;
  }

  /**
   * Check if embedding data is available
   */
  hasEmbeddingData() {
    const visualization = this.getVisualization();
    return visualization.embedding.length > 0;
  }

  /**
   * Check if complete TransitionIndexResolver data is available
   */
  hasCompleteTransitionData() {
    return this.data.tree_metadata &&
           (this.data.lattice_edge_tracking || this.data.activeChangeEdgeTracking) &&
           (this.data.s_edge_metadata || this.data.activeChangeEdge_metadata) &&
           Array.isArray(this.data.tree_metadata) &&
           Array.isArray(this.data.lattice_edge_tracking || this.data.activeChangeEdgeTracking);
  }

  /**
   * Get summary information about the dataset
   */
  getSummary() {
    const trees = this.getTrees();
    const msa = this.getMSA();
    const fileMetadata = this.getFileMetadata();
    const activeChangeEdgeMetadata = this.getActiveChangeEdgeMetadata();

    return {
      fileName: fileMetadata.fileName,
      treeCount: trees.interpolatedCount,
      originalTreeCount: trees.originalCount,
      hasInterpolation: trees.interpolatedCount > trees.originalCount,
      hasMSA: this.hasMSAData(),
      hasEmbedding: this.hasEmbeddingData(),
      hasCompleteTransitionData: this.hasCompleteTransitionData(),
      processingTimeMs: trees.processingTimeMs,
      windowSize: msa.windowSize,
      windowStep: msa.windowStep,
      activeChangeEdgeCount: activeChangeEdgeMetadata.activeChangeEdge_count,
      totalInterpolatedTrees: activeChangeEdgeMetadata.total_interpolated_trees,
    };
  }
}

// Export as default for convenience
export default MovieDataSerializer;
