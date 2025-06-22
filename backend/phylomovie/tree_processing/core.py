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
import re


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
    filename_value = (
        file_storage.filename if file_storage.filename is not None else "uploaded_file"
    )
    filename: str = secure_filename(filename_value)
    logger: Logger = current_app.logger
    logger.info(f"Processing uploaded file: {filename}")

    # Parse trees from uploaded file
    trees = _parse_newick_file(file_storage, logger)
    if not trees:
        return _create_empty_response(filename)

    logger.info(f"Successfully parsed {len(trees)} trees")

    # Generate individual nexus files if input was nexus format
    individual_nexus_files = None
    file_storage.seek(0)  # Reset file pointer
    file_content = file_storage.read().decode("utf-8").strip("\r")
    if _detect_file_format(file_content) == "nexus":
        logger.info("Generating individual NEXUS files for download")
        # Extract newick strings again for individual nexus file creation
        newick_strings = _parse_nexus_to_newick_list(file_content, logger)
        individual_nexus_files = _create_individual_nexus_files(
            newick_strings, filename, logger
        )

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
        "individual_nexus_files": individual_nexus_files,
        **msa_data,
    }


def _parse_nexus_to_newick_list(nexus_content: str, logger: Logger) -> list[str]:
    """
    Parse NEXUS format and extract individual tree strings in Newick format.

    Args:
        nexus_content: The NEXUS file content as string
        logger: Logger instance

    Returns:
        List of Newick format tree strings
    """
    try:
        # Remove comments (enclosed in square brackets)
        content_no_comments = re.sub(r"\[.*?\]", "", nexus_content, flags=re.DOTALL)

        # Find the TREES block
        trees_block_match = re.search(
            r"BEGIN\s+TREES\s*;(.*?)END\s*;",
            content_no_comments,
            re.IGNORECASE | re.DOTALL,
        )

        if not trees_block_match:
            logger.warning("No TREES block found in NEXUS file")
            return []

        trees_block = trees_block_match.group(1)

        # Extract individual tree definitions
        # Pattern matches: TREE [treename] = [tree_string];
        tree_pattern = r"TREE\s+[^=]*=\s*([^;]+);"
        tree_matches = re.findall(tree_pattern, trees_block, re.IGNORECASE | re.DOTALL)

        newick_trees: list[str] = []
        for tree_match in tree_matches:
            # Clean up the tree string
            tree_string = tree_match.strip()

            # Remove any remaining whitespace and newlines
            tree_string = re.sub(r"\s+", " ", tree_string).strip()

            # Ensure the tree string doesn't end with semicolon for consistency
            if tree_string.endswith(";"):
                tree_string = tree_string[:-1]

            if tree_string:  # Only add non-empty trees
                newick_trees.append(tree_string)

        logger.info(f"Extracted {len(newick_trees)} trees from NEXUS format")
        return newick_trees
    except Exception as e:
        logger.error(f"Error parsing NEXUS format: {e}", exc_info=True)
        return []


def _create_individual_nexus_files(
    tree_strings: list[str], base_filename: str, logger: Logger
) -> list[dict[str, str]]:
    """
    Create individual NEXUS file content for each tree.

    Args:
        tree_strings: List of Newick format tree strings
        base_filename: Base filename to derive individual filenames
        logger: Logger instance

    Returns:
        List of dictionaries with 'filename' and 'content' keys
    """
    nexus_files: list[dict[str, str]] = []

    # Remove file extension from base filename
    base_name = base_filename.rsplit(".", 1)[0]

    for i, tree_string in enumerate(tree_strings, 1):
        # Create individual NEXUS file content
        nexus_content = f"""#NEXUS

BEGIN TREES;
    TREE tree_{i} = {tree_string};
END;
"""

        # Create filename for individual nexus file
        individual_filename = f"{base_name}_tree_{i:03d}.nexus"

        nexus_files.append({"filename": individual_filename, "content": nexus_content})

    logger.info(f"Created {len(nexus_files)} individual NEXUS file contents")
    return nexus_files


def _detect_file_format(content: str) -> str:
    """
    Detect if the file content is NEXUS or Newick format.

    Args:
        content: File content as string

    Returns:
        'nexus' or 'newick'
    """
    content_upper = content.upper().strip()

    # Check for NEXUS format indicators
    if content_upper.startswith("#NEXUS") or "BEGIN TREES" in content_upper:
        return "nexus"

    return "newick"


def _parse_newick_file(file_storage: FileStorage, logger: Logger) -> TreeList:
    """Parse Newick or NEXUS file and return list of trees."""
    try:
        file_content: str = file_storage.read().decode("utf-8").strip("\r")

        # Detect file format
        file_format = _detect_file_format(file_content)

        if file_format == "nexus":
            logger.info("Detected NEXUS format file")
            # Parse NEXUS and extract Newick strings
            newick_strings = _parse_nexus_to_newick_list(file_content, logger)

            if not newick_strings:
                logger.warning("No trees extracted from NEXUS file")
                return []

            # Parse each Newick string into a tree object
            trees = []
            for newick_string in newick_strings:
                try:
                    tree_obj = parse_newick(tokens=newick_string)
                    if isinstance(tree_obj, Node):
                        trees.append(tree_obj)
                    elif isinstance(tree_obj, list) and tree_obj:
                        trees.extend(tree_obj)
                except Exception as e:
                    logger.warning(
                        f"Failed to parse tree: {newick_string[:50]}... Error: {e}"
                    )

        else:
            # Handle as Newick format
            logger.info("Detected Newick format file")
            trees: Union[Node, TreeList] = parse_newick(tokens=file_content)
            trees = [trees] if isinstance(trees, Node) else trees

        if not trees:
            raise ValueError("No valid trees parsed from file")

        return trees

    except Exception as e:
        logger.error(f"File parsing failed: {e}", exc_info=True)
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
        "individual_nexus_files": None,
        "inferred_window_size": None,
        "inferred_step_size": None,
        "windows_are_overlapping": None,
        "alignment_length": None,
        "msa_content": None,
    }
