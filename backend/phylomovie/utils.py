"""
Utility functions for the PhyloMovie backend.

This module provides helper functions for various tasks such as handling
file uploads, performing dimensionality reduction with UMAP, and other
common operations.
"""
from __future__ import annotations

# import json # Not currently used
# import pathlib # Not currently used
from typing import Any, List, Optional

import numpy as np
from flask import current_app
# from brancharchitect.tree import Node # Node not directly used after alias removal
from flask import Request
from werkzeug.datastructures import FileStorage # For type hinting request.files

# Type aliases previously here (TreeList, TreeListDict, PhyloMovieData)
# have been removed to centralize them in tree_processing.types.py
# If any types are needed specifically for this module, they can be imported
# from .tree_processing.types or defined here if truly local.

# ------------------------------------------------------------------
# Disk persistence for debugging (optional)
# ------------------------------------------------------------------


def handle_order_list(request: Request) -> Optional[List[str]]:
    """Extract the *optional* taxon order list from an uploaded text file.

    The front-end can post an additional ``orderFile``; if the field is not
    present or empty we simply return ``None`` so downstream code can use its
    default behavior.
    """
    order_file: Optional[FileStorage] = request.files.get("orderFile")
    if not order_file or not order_file.filename: # Check filename as well
        return None

    order_text = order_file.read().decode("utf-8").replace("\r", "").strip()
    return order_text.split("\n")


def perform_umap(
    distance_matrix: np.ndarray[Any, np.dtype[Any]],
    n_components: int,
    random_state: int,
    n_neighbors: int = 15,
    min_dist: float = 0.1,
) -> np.ndarray[Any, Any]:
    """Perform UMAP dimensionality reduction on a distance matrix."""
    n_samples = distance_matrix.shape[0]

    if n_samples == 0:
        current_app.logger.warning(
            "[perform_umap] Distance matrix is empty. Returning empty array."
        )
        return np.array([])

    # UMAP's n_neighbors parameter must be less than the number of samples.
    # It also generally requires n_neighbors > 1 for precomputed metric.
    effective_n_neighbors = n_neighbors
    if n_samples <= n_neighbors:
        # Adjust n_neighbors if it's too large for the number of samples
        # UMAP requires n_neighbors > 1 if using precomputed distances and n_samples > 2
        if n_samples > 2:
            effective_n_neighbors = max(2, n_samples - 1)
        elif (
            n_samples == 2
        ):  # for 2 samples, n_neighbors must be 1, but UMAP might not be ideal
            effective_n_neighbors = 1
        else:  # n_samples == 1
            effective_n_neighbors = 1  # UMAP will likely just return the point or error

        current_app.logger.warning(
            f"[perform_umap] n_neighbors ({n_neighbors}) is too large for the number of samples ({n_samples}). "
            f"Adjusting n_neighbors to {effective_n_neighbors}."
        )

    if n_samples < n_components and n_samples > 0:
        current_app.logger.warning(
            f"[perform_umap] Number of samples ({n_samples}) is less than n_components ({n_components}). "
            f"UMAP will effectively reduce to {n_samples} dimensions. Or returning a zero matrix if not possible."
        )
        # UMAP might handle this, but often it's better to return zeros or project to n_samples dimensions.
        # For simplicity, if UMAP can't handle it, it might error or return something unexpected.
        # A robust solution might involve trying and catching UMAP error, then returning zeros.
        # However, UMAP itself might adjust n_components internally or error.
        # Let's allow UMAP to try, but be aware. If issues, return np.zeros((n_samples, n_components))
    try:
        import umap
    except ImportError:
        current_app.logger.error(
            "[perform_umap] umap-learn package not found. Please install it (e.g., pip install umap-learn)."
        )
        # Fallback to zeros if UMAP is not installed
        return np.zeros((n_samples, n_components))
    try:
        reducer = umap.UMAP(
            n_neighbors=effective_n_neighbors,
            min_dist=min_dist,
            n_components=n_components,
            metric="precomputed",
            random_state=random_state,
        )
        raw_embedding = reducer.fit_transform(distance_matrix)
        embedding: np.ndarray = np.asarray(raw_embedding)
        return embedding
    except Exception as e:
        current_app.logger.error(f"[perform_umap] UMAP failed: {e}", exc_info=True)
        # Fallback to zeros if UMAP errors out
        return np.zeros((n_samples, n_components))
