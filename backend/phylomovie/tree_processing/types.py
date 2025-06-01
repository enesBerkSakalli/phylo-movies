"""Type definitions for tree processing."""

from typing import Any, Dict, List, Optional, TypedDict

try:
    from brancharchitect.tree import Node
except ModuleNotFoundError:
    Node = Any # Fallback to Any if brancharchitect is not available

# Type aliases for clear business logic signatures
TreeList = List[Node]  # Represents a list of tree objects before serialization
SerializedTreeList = List[Dict[str, Any]] # Represents a list of tree objects after serialization for JSON


class PhyloMovieData(TypedDict):
    """
    Structure for holding all data required for PhyloMovie visualization.
    """
    rfd_list: List[float]
    embedding: list  # Typically List[List[float]]
    weighted_rfd_list: List[float]
    to_be_highlighted: List[List[str]]
    sorted_leaves: List[str]
    tree_list: SerializedTreeList
    file_name: str
    inferred_window_size: Optional[int]
    inferred_step_size: Optional[int]
    windows_are_overlapping: Optional[bool]
    alignment_length: Optional[int]


class MSAProcessingResult(TypedDict):
    """
    Structure for holding results from MSA processing.
    """
    inferred_window_size: Optional[int]
    inferred_step_size: Optional[int]
    windows_are_overlapping: Optional[bool]
    alignment_length: Optional[int]


def create_default_phylo_movie_data(filename: str) -> PhyloMovieData:
    """
    Creates a PhyloMovieData dictionary initialized with default/empty values.
    """
    return {
        "rfd_list": [],
        "embedding": [],
        "weighted_rfd_list": [],
        "to_be_highlighted": [[]], # Matches _process_trees empty case for jumping_taxa
        "sorted_leaves": [],
        "tree_list": [],
        "file_name": filename,
        "inferred_window_size": None,
        "inferred_step_size": None,
        "windows_are_overlapping": None,
        "alignment_length": None,
    }


class WindowParameters:
    """Parameters for sliding window analysis."""

    def __init__(self, window_size: int, step_size: int, is_overlapping: bool):
        self.window_size = window_size
        self.step_size = step_size
        self.is_overlapping = is_overlapping

    def to_dict(self) -> Dict[str, Any]:
        return {
            "window_size": self.window_size,
            "step_size": self.step_size,
            "is_overlapping": self.is_overlapping,
        }
