"""Core tree processing functionality."""

from logging import Logger
from typing import Optional, Dict, Any
from werkzeug.utils import secure_filename
from flask import current_app
from .tree_operations import TreeProcessor
from brancharchitect.movie_pipeline.types import InterpolationSequence
from werkzeug.datastructures import FileStorage
from .msa_utils import _process_msa_data
from .movie_data import MovieData
from brancharchitect.io import parse_newick


def handle_uploaded_file(
    file_storage: FileStorage,
    msa_content: Optional[str] = None,
    enable_rooting: bool = False,
    window_size: int = 1,
    window_step: int = 1,
) -> Dict[str, Any]:
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

    content = file_storage.read().decode("utf-8").strip("\r")
    # Parse trees from uploaded file
    trees = parse_newick(content)
    print(f"[DEBUG] Parsed trees count: {len(trees) if trees else 0}")
    print(f"[DEBUG] Trees type: {type(trees)}")
    if trees:
        print(f"[DEBUG] First tree type: {type(trees[0])}")

    if not trees:
        print("[DEBUG] No trees parsed - returning empty response")
        return _create_empty_response(filename)

    logger.info(f"Successfully parsed {len(trees)} trees")

    # Process trees through the pipeline
    processor = TreeProcessor(trees, enable_rooting=enable_rooting)
    processed_data: InterpolationSequence = processor.interpolate_trees(trees)

    # Process MSA data if available
    msa_data = _process_msa_data(
        msa_content=msa_content,
        num_trees=len(trees),
        logger=logger,
        window_size=window_size,
        step_size=window_step,
    )

    # Create structured response
    return _create_structured_response(
        processed_data, filename, msa_data, enable_rooting, logger
    )


def _create_structured_response(
    result: InterpolationSequence,
    filename: str,
    msa_data: Dict[str, Any],
    enable_rooting: bool,
    logger: Logger,
) -> Dict[str, Any]:
    """
    Create hierarchical API response using MovieData class.

    Args:
        result: InterpolationSequence from TreeInterpolationPipeline
        filename: Original filename
        msa_data: Processed MSA data
        enable_rooting: Whether rooting was enabled
        
        logger: Logger instance

    Returns:
        Hierarchical dictionary for API response
    """
    # Extract leaf names from the first tree
    sorted_leaves = []
    if result["interpolated_trees"]:
        first_tree = result["interpolated_trees"][0]
        print(f"[DEBUG] First tree type in core.py: {type(first_tree)}")
        print(
            f"[DEBUG] First tree dir: {dir(first_tree)[:10] if hasattr(first_tree, '__dict__') else 'No __dict__'}"
        )

        # Handle both Node objects and serialized data
        if hasattr(first_tree, "leaves"):
            sorted_leaves = [leaf.name for leaf in first_tree.leaves]
        elif hasattr(first_tree, "get_leaves"):
            sorted_leaves = [leaf.name for leaf in first_tree.get_leaves()]
        else:
            logger.warning(
                f"[core.py] Unexpected tree type: {type(first_tree)}, using fallback leaf extraction"
            )
            # Fallback - this shouldn't happen with proper Node objects
            sorted_leaves = []

    # Generate embedding if enabled - COMPLETELY DISABLED
    embedding = []
    # Embedding is fully deactivated - always use empty list
    logger.info("Embedding is fully deactivated - skipping embedding generation")

    # Create MovieData instance and convert to hierarchical dict
    movie_data = MovieData.from_processing_result(
        result=result,
        filename=filename,
        msa_data=msa_data,
        enable_rooting=enable_rooting,
        sorted_leaves=sorted_leaves,
    )
    return movie_data.to_frontend_dict()


def _create_empty_response(filename: str) -> Dict[str, Any]:
    """Create an empty hierarchical response for failed processing."""
    empty_movie_data = MovieData.create_empty(filename)
    return empty_movie_data.to_frontend_dict()
