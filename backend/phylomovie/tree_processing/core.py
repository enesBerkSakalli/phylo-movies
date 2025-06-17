"""Core tree processing functionality."""

from logging import Logger
from typing import Union, Optional
from werkzeug.utils import secure_filename
from flask import current_app
from brancharchitect.tree import Node
from brancharchitect.io import parse_newick, serialize_tree_list_to_json
from .types import PhyloMovieData, TreeList
from .tree_operations import TreeProcessor
from .msa_utils import get_alignment_length, infer_window_parameters
from ..config import Config
from ..utils import perform_umap
from typing import Any, Dict
from werkzeug.datastructures import FileStorage
import numpy as np
from numpy.typing import ArrayLike


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
    trees = _parse_newick_file(file_storage, logger)
    if not trees:
        return _create_empty_response(filename)

    logger.info(f"Successfully parsed {len(trees)} trees")

    # Process trees through the pipeline
    processor = TreeProcessor(trees, enable_rooting)
    processed_data = _process_trees(processor, logger)

    # Generate UMAP embedding or geometrical embedding
    embedding = _generate_embedding(
        processed_data["distance_matrix"], logger, enable_embedding
    )

    # Process MSA data if available
    msa_data = _process_msa_data(
        msa_content=msa_content,
        num_trees=len(trees),
        logger=logger,
        window_size=window_size,
        step_size=window_step,
    )

    # Serialize trees for frontend
    interpolated_json: TreeList = serialize_tree_list_to_json(
        processed_data["interpolated_trees"]
    )
    tree_names = processed_data.get("tree_names", [])

    # Extract leaf order
    sorted_leaves = getattr(trees[0], "_order", []) if trees else []

    return {
        "rfd_list": processed_data["rfd_list"],
        "embedding": embedding,
        "weighted_robinson_foulds_distance_list": processed_data["wrfd_list"],
        "to_be_highlighted": processed_data["solutions"],
        "sorted_leaves": sorted_leaves,
        "tree_list": interpolated_json,
        "tree_names": tree_names,
        "file_name": filename,
        **msa_data,
    }


def _parse_newick_file(file_storage: FileStorage, logger: Logger) -> TreeList:
    """Parse Newick file and return list of trees."""
    try:
        newick_text: str = file_storage.read().decode("utf-8").strip("\r")
        trees: Union[Node, TreeList] = parse_newick(tokens=newick_text)
        trees = [trees] if isinstance(trees, Node) else trees

        if not trees:
            raise ValueError("No valid trees parsed from file")

        return trees

    except Exception as e:
        logger.error(f"Newick parsing failed: {e}", exc_info=True)
        return []


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
            "distance_matrix": processor.validate_distance_matrix([], 1),
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

    # Calculate jumping taxa
    jumping_taxa, s_edges, covers = processor.calculate_jumping_taxa(trees)

    # Generate interpolated trees and names
    interpolated_trees, tree_names = processor.interpolate_trees(trees)

    solutions = {
        "s_edges": s_edges,
        "covers": covers,
        "jumping_taxa": jumping_taxa,
    }

    # Calculate distances
    rfd_list, wrfd_list, distance_matrix = processor.calculate_distances(trees)

    return {
        "interpolated_trees": interpolated_trees,
        "tree_names": tree_names,
        "solutions": solutions,
        "rfd_list": rfd_list,
        "wrfd_list": wrfd_list,
        "distance_matrix": distance_matrix,
    }


def _generate_embedding(
    distance_matrix: "ArrayLike", logger: Logger, enable_embedding: bool = True
) -> list[list[float]]:
    """Generate UMAP or geometrical embedding from distance matrix."""
    distance_matrix = np.asarray(distance_matrix)
    if distance_matrix.size == 0:
        logger.warning("Distance matrix is empty, skipping embedding")
        return []

    # If embedding is disabled, generate geometrical patterns
    if not enable_embedding:
        return _generate_geometrical_embedding(distance_matrix, logger)

    # Get UMAP parameters from config
    umap_params: dict[str, Any] = {
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
        logger.info("Falling back to geometrical embedding")
        return _generate_geometrical_embedding(distance_matrix, logger)


def _generate_geometrical_embedding(
    distance_matrix: np.ndarray, logger: Logger
) -> list[list[float]]:
    """Generate simple geometrical embedding patterns."""

    n_samples: int = distance_matrix.shape[0]
    if n_samples == 0:
        logger.warning(
            "Distance matrix is empty, returning empty geometrical embedding"
        )
        return []

    logger.info(f"Generating geometrical embedding for {n_samples} samples")

    # Create simple geometrical patterns based on sample count
    if n_samples == 1:
        # Single point at origin
        embedding = [[0.0, 0.0]]
    elif n_samples == 2:
        # Two points on x-axis
        embedding = [[-1.0, 0.0], [1.0, 0.0]]
    elif n_samples <= 10:
        # Circular arrangement for small datasets
        angles = np.linspace(0, 2 * np.pi, n_samples, endpoint=False)
        radius = 2.0
        embedding = [
            [radius * np.cos(angle), radius * np.sin(angle)] for angle in angles
        ]
    else:
        # Grid arrangement for larger datasets
        grid_size = int(np.ceil(np.sqrt(n_samples)))
        embedding: list[list[float]] = []
        for i in range(n_samples):
            row = i // grid_size
            col = i % grid_size
            # Center the grid around origin
            x: float = (col - grid_size / 2) * 2.0
            y: float = (row - grid_size / 2) * 2.0
            embedding.append([x, y])

    logger.info(f"Generated {len(embedding)} geometrical embedding points")
    return embedding


def _process_msa_data(
    msa_content: Optional[str],
    num_trees: int,
    window_size: int = 1,
    step_size: int = 1,
    logger: Optional[Logger] = None,
) -> Dict[str, Optional[Union[int, str, bool]]]:
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
        if logger:
            logger.warning("Could not determine alignment length from MSA content")
        return {
            "inferred_window_size": None,
            "inferred_step_size": None,
            "windows_are_overlapping": None,
            "alignment_length": None,
        }

    if logger:
        logger.info(f"MSA alignment length: {alignment_length}")

    window_params = None
    if window_size == 1 and step_size == 1:
        # Infer window parameters
        window_params = infer_window_parameters(num_trees, alignment_length)
        if logger:
            logger.info(f"Inferred window parameters: {window_params.to_dict()}")

    return {
        "inferred_window_size": window_params.window_size if window_params else None,
        "inferred_step_size": window_params.step_size if window_params else None,
        "windows_are_overlapping": (
            window_params.is_overlapping if window_params else None
        ),
        "alignment_length": alignment_length,
        "msa_content": msa_content,  # Return raw MSA content for frontend storage
    }


def _create_empty_response(filename: str) -> PhyloMovieData:
    """Create an empty response for failed processing."""
    return {
        "rfd_list": [],
        "embedding": [],
        "weighted_robinson_foulds_distance_list": [],
        "to_be_highlighted": [],
        "sorted_leaves": [],
        "tree_list": [],
        "file_name": filename,
        "inferred_window_size": None,
        "inferred_step_size": None,
        "windows_are_overlapping": None,
        "alignment_length": None,
        "msa_content": None,
    }
