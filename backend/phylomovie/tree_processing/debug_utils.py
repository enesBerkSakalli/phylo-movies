"""Debugging utilities for tree processing."""

import json
from typing import Any
from pathlib import Path
from flask import current_app


class DebugPersister:
    """Handles persistence of debug data to disk."""
    
    @staticmethod
    def persist_json(payload: Any, filename: str) -> None:
        """Write pretty-printed JSON for debugging purposes."""
        try:
            debug_file = Path(__file__).resolve().parent.parent / filename
            with debug_file.open("w", encoding="utf-8") as fp:
                json.dump(payload, fp, ensure_ascii=False, indent=4)
            current_app.logger.info(f"Successfully saved debug file: {filename}")
        except Exception as e:
            current_app.logger.warning(f"Could not write debug file {filename}: {e}")
    
    @staticmethod
    def persist_distance_matrix(distance_matrix, filename: str = "distance_matrix_debug.json") -> None:
        """Persist distance matrix for debugging."""
        try:
            DebugPersister.persist_json(distance_matrix.tolist(), filename)
        except Exception as e:
            current_app.logger.error(f"Failed to persist distance matrix: {e}")
    
    @staticmethod
    def persist_interpolated_trees(trees_json, filename: str = "interpolated_trees.json") -> None:
        """Persist interpolated trees for debugging."""
        DebugPersister.persist_json(trees_json, filename)
