"""
Tree processing package for phylogenetic analysis.

This package provides functionality for processing phylogenetic trees,
calculating distances, performing dimensionality reduction, and preparing
data for visualization.
"""

from .core import handle_uploaded_file
from .types import PhyloMovieData, TreeList
from .msa_utils import infer_window_parameters, get_alignment_length

__all__ = ["handle_uploaded_file", "PhyloMovieData", "TreeList", "infer_window_parameters", "get_alignment_length"]
