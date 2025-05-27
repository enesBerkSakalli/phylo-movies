"""
Backward compatibility module for tree processing.

This module maintains the original API while delegating to the new modular structure.
"""

# Import everything from the new modular structure
from .tree_processing import handle_uploaded_file, PhyloMovieData, TreeList, infer_window_parameters, get_alignment_length

# Maintain backward compatibility
__all__ = ["handle_uploaded_file", "PhyloMovieData", "TreeList", "infer_window_parameters", "get_alignment_length"]
