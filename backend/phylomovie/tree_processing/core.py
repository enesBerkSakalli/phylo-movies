"""Core tree processing functionality."""

from typing import Union, Optional
from werkzeug.utils import secure_filename
from flask import current_app

from .types import PhyloMovieData, TreeList
from .tree_operations import TreeProcessor
from .msa_utils import get_alignment_length, infer_window_parameters
from .debug_utils import DebugPersister
from ..config import Config
from ..utils import perform_umap

from brancharchitect.tree import Node
from brancharchitect.io import parse_newick, serialize_tree_list_to_json


def handle_uploaded_file(
    file_storage, msa_content: Optional[str] = None, enable_rooting: bool = True
) -> PhyloMovieData:
    """
    Process an uploaded Newick file and compute visualization data.

    Args:
        file_storage: The uploaded tree file (werkzeug.datastructures.FileStorage)
        msa_content: Optional MSA content for window inference
        enable_rooting: Whether to enable midpoint rooting

    Returns:
        Dictionary containing all data needed for front-end visualization
    """
    filename = secure_filename(file_storage.filename)
    logger = current_app.logger
    logger.info(f"Processing uploaded file: {filename}")

    # Parse trees from uploaded file
    trees = _parse_newick_file(file_storage, logger)
    if not trees:
        return _create_empty_response(filename)

    logger.info(f"Successfully parsed {len(trees)} trees")

    # Process trees through the pipeline
    processor = TreeProcessor(trees, enable_rooting)
    processed_data = _process_trees(processor, logger)

    # Generate UMAP embedding
    embedding = _generate_embedding(processed_data["distance_matrix"], logger)

    # Process MSA data if available
    msa_data = _process_msa_data(msa_content, len(trees), logger)

    # Serialize trees for frontend
    interpolated_json = serialize_tree_list_to_json(
        processed_data["interpolated_trees"]
    )

    # Debug persistence
    DebugPersister.persist_distance_matrix(processed_data["distance_matrix"])
    DebugPersister.persist_interpolated_trees(interpolated_json)

    # Extract leaf order
    sorted_leaves = getattr(trees[0], "_order", []) if trees else []

    return {
        "rfd_list": processed_data["rfd_list"],
        "embedding": embedding,
        "weighted_rfd_list": processed_data["wrfd_list"],
        "to_be_highlighted": processed_data["jumping_taxa"],
        "sorted_leaves": sorted_leaves,
        "tree_list": interpolated_json,
        "file_name": filename,
        **msa_data,
    }


def _parse_newick_file(file_storage, logger) -> TreeList:
    """Parse Newick file and return list of trees."""
    try:
        newick_text = file_storage.read().decode("utf-8").strip("\r")
        trees: Union[Node, TreeList] = parse_newick(newick_text)
        trees = [trees] if isinstance(trees, Node) else trees

        if not trees:
            raise ValueError("No valid trees parsed from file")

        return trees

    except Exception as e:
        logger.error(f"Newick parsing failed: {e}", exc_info=True)
        return []


def _process_trees(processor: TreeProcessor, logger) -> dict:
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
    trees = processor.optimize_tree_order(trees)

    # Generate interpolated trees
    interpolated_trees = processor.interpolate_trees(trees)

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


def _generate_embedding(distance_matrix, logger) -> list:
    """Generate UMAP embedding from distance matrix."""
    if distance_matrix.size == 0:
        logger.warning("Distance matrix is empty, skipping UMAP")
        return []

    # Get UMAP parameters from config
    umap_params = {
        "n_components": getattr(Config, "UMAP_N_COMPONENTS", 2),
        "random_state": getattr(Config, "UMAP_RANDOM_STATE", 42),
        "n_neighbors": getattr(Config, "UMAP_N_NEIGHBORS", 15),
        "min_dist": getattr(Config, "UMAP_MIN_DIST", 0.1),
    }

    try:
        embedding = perform_umap(distance_matrix, **umap_params)
        logger.info("UMAP embedding generated successfully")
        return embedding.tolist()
    except Exception as e:
        logger.error(f"UMAP embedding failed: {e}")
        return []


def _process_msa_data(msa_content: Optional[str], num_trees: int, logger) -> dict:
    """Process MSA content and infer window parameters."""
    if not msa_content:
        return {
            "inferred_window_size": None,
            "inferred_step_size": None,
            "windows_are_overlapping": None,
            "alignment_length": None,
        }

    alignment_length = get_alignment_length(msa_content)
    if not alignment_length:
        logger.warning("Could not determine alignment length from MSA content")
        return {
            "inferred_window_size": None,
            "inferred_step_size": None,
            "windows_are_overlapping": None,
            "alignment_length": None,
        }

    logger.info(f"MSA alignment length: {alignment_length}")

    # Infer window parameters
    window_params = infer_window_parameters(num_trees, alignment_length)

    logger.info(f"Inferred window parameters: {window_params.to_dict()}")

    return {
        "inferred_window_size": window_params.window_size,
        "inferred_step_size": window_params.step_size,
        "windows_are_overlapping": window_params.is_overlapping,
        "alignment_length": alignment_length,
    }


def _create_empty_response(filename: str) -> PhyloMovieData:
    """Create an empty response for failed processing."""
    return {
        "rfd_list": [],
        "embedding": [],
        "weighted_rfd_list": [],
        "to_be_highlighted": [],
        "sorted_leaves": [],
        "tree_list": [],
        "file_name": filename,
        "inferred_window_size": None,
        "inferred_step_size": None,
        "windows_are_overlapping": None,
        "alignment_length": None,
    }
