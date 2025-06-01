"""Core tree processing functionality."""

from logging import Logger
from typing import Optional, Dict, Any # Union removed, Dict and Any confirmed needed.
from werkzeug.utils import secure_filename
from flask import current_app
# from brancharchitect.tree import Node # Node not directly used, TreeList from .types is List[Node]
try:
    from brancharchitect.io import serialize_tree_list_to_json
except ModuleNotFoundError:
    serialize_tree_list_to_json = lambda x: [] # Dummy fallback
from .types import (
    PhyloMovieData, TreeList, create_default_phylo_movie_data,
    SerializedTreeList, MSAProcessingResult
)
from .tree_operations import TreeProcessor
from .msa_utils import get_alignment_length, infer_window_parameters, parse_newick_from_filestorage
from werkzeug.datastructures import FileStorage
# Config, perform_umap, ArrayLike are no longer directly used in this file.


def handle_uploaded_file(
    file_storage: FileStorage,
    msa_content: Optional[str] = None,
    enable_rooting: bool = True,
    enable_embedding: bool = True,
    window_size: int = 1,
    window_step: int = 1,
) -> PhyloMovieData:
    """
    Process an uploaded Newick file and compute visualization data.

    Args:
        file_storage: The uploaded tree file (werkzeug.datastructures.FileStorage)
        msa_content: Optional MSA content for window inference
        enable_rooting: Whether to enable midpoint rooting
        enable_embedding: Whether to enable UMAP embedding or use geometrical
        window_size: Window size for tree processing
        window_step: Window step size for tree processing

    Returns:
        Dictionary containing all data needed for front-end visualization
    """
    filename: str = secure_filename(file_storage.filename)
    logger: Logger = current_app.logger
    logger.info(f"Processing uploaded file: {filename}")

    # Parse trees from uploaded file
    trees: TreeList = parse_newick_from_filestorage(file_storage, logger)
    if not trees:
        return _create_empty_response(filename)

    logger.info(f"Successfully parsed {len(trees)} trees")

    # Process trees through the pipeline
    processor = TreeProcessor(trees, enable_rooting)
    processed_data = _process_trees(processor, logger) # This populates processor.distance_matrix

    # Generate UMAP embedding or geometrical embedding using the method on the processor
    embedding = processor.generate_embedding(enable_embedding=enable_embedding)

    # Process MSA data if available
    msa_data = _process_msa_data(msa_content, len(trees), logger)

    # Serialize trees for frontend
    interpolated_json: SerializedTreeList = serialize_tree_list_to_json(
        processed_data["interpolated_trees"]
    )

    # Extract leaf order
    sorted_leaves = getattr(trees[0], "_order", []) if trees else []

    # Create the full response dictionary
    # Start with default values and update with processed data
    response_data = create_default_phylo_movie_data(filename)
    response_data.update({
        "rfd_list": processed_data["rfd_list"],
        "embedding": embedding,
        "weighted_rfd_list": processed_data["wrfd_list"],
        "to_be_highlighted": processed_data["jumping_taxa"],
        "sorted_leaves": sorted_leaves,
        "tree_list": interpolated_json,
        **msa_data,
    })
    return response_data


def _process_trees(processor: TreeProcessor, logger: Logger) -> Dict[str, Any]:
    """Process trees through the complete pipeline."""
    # Root trees if enabled
    trees = processor.root_trees()

    # Handle edge cases
    if not trees:
        return {
            "interpolated_trees": [],
            "jumping_taxa": [[]],
            "rfd_list": [0.0],
            "wrfd_list": [0.0],
            "distance_matrix": processor._validate_distance_matrix([], 1),
        }

    if len(trees) == 1:
        return {
            "interpolated_trees": trees,
            "jumping_taxa": [[]],
            "rfd_list": [0.0],
            "wrfd_list": [0.0],
            "distance_matrix": processor._validate_distance_matrix([], 1),
        }

    # Optimize tree order
    trees: TreeList = processor.optimize_tree_order(trees)

    # Generate interpolated trees
    interpolated_trees: TreeList = processor.interpolate_trees(trees)

    # Calculate distances
    rfd_list, wrfd_list, distance_matrix = processor.calculate_distances(trees)

    # Calculate jumping taxa
    jumping_taxa = processor.calculate_jumping_taxa(trees)

    return {
        "interpolated_trees": interpolated_trees,
        "jumping_taxa": jumping_taxa,
        "rfd_list": rfd_list,
        "wrfd_list": wrfd_list,
        "distance_matrix": distance_matrix,
    }


def _process_msa_data(
    msa_content: Optional[str],
    num_trees: int,
    window_size: int = 1, # Added type hint for window_size
    step_size: int = 1,   # Added type hint for step_size
    logger: Optional[Logger] = None
) -> MSAProcessingResult:
    """Process MSA content and infer window parameters."""
    # Default return for no MSA content
    default_msa_result: MSAProcessingResult = {
        "inferred_window_size": None,
        "inferred_step_size": None,
        "windows_are_overlapping": None,
        "alignment_length": None,
    }

    if not msa_content:
        return default_msa_result

    alignment_length = get_alignment_length(msa_content)
    if not alignment_length:
        if logger:
            logger.warning("Could not determine alignment length from MSA content")
        return default_msa_result
    if logger:
        logger.info(f"MSA alignment length: {alignment_length}")

    inferred_w_size: Optional[int] = None
    inferred_s_size: Optional[int] = None
    inferred_overlap: Optional[bool] = None

    if window_size == 1 and step_size == 1: # Default values signify user did not specify
        # Infer window parameters
        window_params = infer_window_parameters(num_trees, alignment_length, logger=logger)
        if logger:
            logger.info(f"Inferred window parameters: {window_params.to_dict()}")
        inferred_w_size = window_params.window_size
        inferred_s_size = window_params.step_size
        inferred_overlap = window_params.is_overlapping

    return {
        "inferred_window_size": inferred_w_size,
        "inferred_step_size": inferred_s_size,
        "windows_are_overlapping": inferred_overlap,
        "alignment_length": alignment_length,
    }


def _create_empty_response(filename: str) -> PhyloMovieData:
    """Create an empty response for failed processing using the default data structure."""
    return create_default_phylo_movie_data(filename)
