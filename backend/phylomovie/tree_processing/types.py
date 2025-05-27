"""Type definitions for tree processing."""

from typing import Any, Dict, List, Optional
from brancharchitect.tree import Node

# Type aliases for clear business logic signatures
TreeList = List[Node]
TreeListDict = Dict[str, Any]
PhyloMovieData = Dict[str, Any]

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
            "is_overlapping": self.is_overlapping
        }
