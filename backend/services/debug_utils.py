"""Debugging utilities for tree processing."""

import json
from typing import Any
from pathlib import Path
from flask import current_app
from brancharchitect.io import UUIDEncoder
import numpy as np


class DebugPersister:
    """Handles persistence of debug data to disk."""

    @staticmethod
    def persist_json(data: Any, filename: str = "debug_data.json") -> None:
        """Persist data as JSON for debugging."""

        with open(
            Path(current_app.root_path) / "debug" / filename, "w", encoding="utf-8"
        ) as f:
            json.dump(data, f, indent=2, ensure_ascii=False, cls=UUIDEncoder)

    @staticmethod
    def persist_distance_matrix(
        distance_matrix: "np.ndarray[Any, Any]",
        filename: str = "distance_matrix_debug.json",
    ) -> None:
        """Persist distance matrix for debugging."""
        try:
            DebugPersister.persist_json(distance_matrix.tolist(), filename)
        except Exception as e:
            current_app.logger.error(f"Failed to persist distance matrix: {e}")
            current_app.logger.error(f"Failed to persist distance matrix: {e}")

    @staticmethod
    def persist_interpolated_trees(
        trees_json: Any, filename: str = "interpolated_trees.json"
    ) -> None:
        """Persist interpolated trees for debugging."""
        DebugPersister.persist_json(trees_json, filename)
