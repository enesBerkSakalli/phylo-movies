"""Movie data class for serializing backend responses to frontend format."""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np
from brancharchitect.movie_pipeline.types import InterpolationSequence
from brancharchitect.io import serialize_tree_list_to_json


def _ensure_json_serializable(obj):
    """Recursively convert numpy arrays and other non-serializable objects to JSON-safe types."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, dict):
        return {key: _ensure_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_ensure_json_serializable(item) for item in obj]
    elif hasattr(obj, "tolist"):
        return obj.tolist()
    else:
        return obj


@dataclass
class MovieData:
    """
    Data class that handles serialization of tree processing results
    for frontend consumption with hierarchical structure.
    """

    # Core tree data
    tree_list: List[Dict[str, Any]]
    tree_names: List[str]
    tree_metadata: List[Dict[str, Any]]

    # Distance metrics
    rfd_list: List[float]
    weighted_robinson_foulds_distance_list: List[float]
    distance_matrix: Optional[List[List[float]]]

    # Visualization data

    sorted_leaves: List[str]
    to_be_highlighted: List[Any]
    lattice_edge_tracking: List[Any]

    # File and processing metadata
    file_name: str
    window_size: int
    window_step_size: int

    # MSA data
    msa_content: Optional[str]
    alignment_length: Optional[int]
    windows_are_overlapping: bool

    # Processing metadata
    original_tree_count: int
    interpolated_tree_count: int
    processing_time_ms: float
    rooting_enabled: bool

    @classmethod
    def from_processing_result(
        cls,
        result: InterpolationSequence,
        filename: str,
        msa_data: Dict[str, Any],
        enable_rooting: bool,
        sorted_leaves: List[str],
    ) -> "MovieData":
        """
        Create MovieData from InterpolationSequence and additional data.

        Args:
            result: InterpolationSequence from TreeInterpolationPipeline
            filename: Original filename
            msa_data: Processed MSA data
            enable_rooting: Whether rooting was enabled
            sorted_leaves: Sorted leaf names from first tree

        Returns:
            MovieData instance ready for frontend serialization
        """
        # Serialize trees to JSON format
        print(
            f"[DEBUG] result['interpolated_trees'] length: {len(result['interpolated_trees'])}"
        )
        print(
            f"[DEBUG] result['interpolated_trees'] type: {type(result['interpolated_trees'])}"
        )

        # --- END DEBUG OUTPUT ---
        if result["interpolated_trees"]:
            print(f"[DEBUG] First tree type: {type(result['interpolated_trees'][0])}")

        # Additional debug: check the actual structure of interpolated_trees
        interpolated_trees = result["interpolated_trees"]
        print(
            f"[DEBUG] interpolated_trees is list: {isinstance(interpolated_trees, list)}"
        )
        if interpolated_trees:
            first_item = interpolated_trees[0]
            print(f"[DEBUG] First item type: {type(first_item)}")
            print(f"[DEBUG] First item is Node: {hasattr(first_item, 'to_dict')}")

            # If it's already a dict/list, no need to serialize
            if isinstance(first_item, dict):
                print(f"[DEBUG] Trees already serialized as dicts")
                serialized_trees = interpolated_trees
            elif isinstance(first_item, list):
                print(f"[DEBUG] ERROR: Trees are lists, not Node objects")
                # For now, use empty list to avoid crash
                serialized_trees = []
            else:
                # Try normal serialization
                try:
                    serialized_trees = serialize_tree_list_to_json(interpolated_trees)
                    print(f"[DEBUG] serialized_trees length: {len(serialized_trees)}")
                    print(f"[DEBUG] serialized_trees type: {type(serialized_trees)}")
                except Exception as e:
                    print(f"[DEBUG] Error in serialize_tree_list_to_json: {e}")
                    print(f"[DEBUG] Error type: {type(e)}")
                    import traceback

                    traceback.print_exc()
                    raise
        else:
            print(f"[DEBUG] No interpolated trees to serialize")
            serialized_trees = []

        # Convert numpy arrays to lists for JSON serialization
        distance_matrix = result.get("distance_matrix")
        if distance_matrix is not None:
            if isinstance(distance_matrix, np.ndarray):
                distance_matrix = distance_matrix.tolist()
            elif hasattr(distance_matrix, "tolist"):
                distance_matrix = distance_matrix.tolist()

        rfd_list = result.get("rfd_list", [])
        if rfd_list is not None:
            if isinstance(rfd_list, np.ndarray):
                rfd_list = rfd_list.tolist()
            elif hasattr(rfd_list, "tolist"):
                rfd_list = rfd_list.tolist()
            else:
                rfd_list = list(rfd_list) if rfd_list else []

        wrfd_list = result.get("wrfd_list", [])
        if wrfd_list is not None:
            if isinstance(wrfd_list, np.ndarray):
                wrfd_list = wrfd_list.tolist()
            elif hasattr(wrfd_list, "tolist"):
                wrfd_list = wrfd_list.tolist()
            else:
                wrfd_list = list(wrfd_list) if wrfd_list else []

        # Extract tree names from tree metadata
        tree_names = [meta["tree_name"] for meta in result["tree_metadata"]]

        # Store complete tree metadata for frontend
        tree_metadata = cls._process_tree_metadata(result["tree_metadata"])

        # Extract lattice edge tracking from tree metadata
        lattice_edge_tracking_data = cls._extract_s_edges_from_metadata(
            result["tree_metadata"]
        )

        return cls(
            tree_list=serialized_trees,
            tree_names=tree_names,
            tree_metadata=tree_metadata,
            rfd_list=rfd_list,
            weighted_robinson_foulds_distance_list=wrfd_list,
            distance_matrix=distance_matrix,
            sorted_leaves=sorted_leaves,
            to_be_highlighted=cls._serialize_tree_pair_solutions(
                result["tree_pair_solutions"]
            ),
            lattice_edge_tracking=lattice_edge_tracking_data,
            file_name=filename,
            window_size=msa_data.get("inferred_window_size", 1),
            window_step_size=msa_data.get("inferred_step_size", 1),
            msa_content=msa_data.get("msa_content"),
            alignment_length=msa_data.get("alignment_length"),
            windows_are_overlapping=msa_data.get("windows_are_overlapping", False),
            original_tree_count=result["original_tree_count"],
            interpolated_tree_count=result["interpolated_tree_count"],
            processing_time_ms=result["processing_time"] * 1000,
            rooting_enabled=enable_rooting,
        )

    def to_frontend_dict(self) -> Dict[str, Any]:
        """
        Convert to flat dictionary format matching InterpolationSequence structure.

        Returns:
            Dictionary with flattened structure matching InterpolationSequence from brancharchitect 0.59.0
        """
        result = {
            # Core flattened sequences - globally indexed (matches InterpolationSequence)
            "interpolated_trees": self.tree_list,
            "tree_metadata": self.tree_metadata,
            "tree_names": self.tree_names,  # For compatibility
            # Tree pair solutions - keyed for easy lookup (matches InterpolationSequence)
            "tree_pair_solutions": self._extract_tree_pair_solutions_from_highlighted(),
            # Distance metrics - trajectory analysis (matches InterpolationSequence)
            "rfd_list": self.rfd_list,
            "wrfd_list": self.weighted_robinson_foulds_distance_list,
            "distance_matrix": self.distance_matrix,
            # Processing metadata - pipeline information (matches InterpolationSequence)
            "original_tree_count": self.original_tree_count,
            "interpolated_tree_count": self.interpolated_tree_count,
            "processing_time": self.processing_time_ms
            / 1000.0,  # Convert back to seconds
            # Additional frontend-specific data
            "sorted_leaves": self.sorted_leaves,
            "highlighted_elements": self.to_be_highlighted,
            "lattice_edge_tracking": self.lattice_edge_tracking,
            "covers": [],
            # S-Edge specific metadata for proper frontend handling
            "s_edge_metadata": self._extract_s_edge_metadata(),
            # MSA - simplified structure
            "msa": {
                "content": self.msa_content,
                "alignment_length": self.alignment_length,
                "window_size": self.window_size,
                "step_size": self.window_step_size,
                "overlapping": self.windows_are_overlapping,
            },
            # File metadata - flattened
            "file_name": self.file_name,
            "processing_options": {
                "rooting_enabled": self.rooting_enabled,
            },
            # Legacy fields for backward compatibility during migration
            "tree_list": self.tree_list,  # Legacy: same as interpolated_trees
            "tree_count": {
                "original": self.original_tree_count,
                "interpolated": self.interpolated_tree_count,
            },
            "distances": {
                "robinson_foulds": self.rfd_list,
                "weighted_robinson_foulds": self.weighted_robinson_foulds_distance_list,
                "matrix": self.distance_matrix,
            },
            "weighted_robinson_foulds_distance_list": self.weighted_robinson_foulds_distance_list,
            "to_be_highlighted": self.to_be_highlighted,
            "window_size": self.window_size,
            "window_step_size": self.window_step_size,
            "processing_time_ms": self.processing_time_ms,
        }

        # Debug logging for s_edge data flow verification
        print(f"[DEBUG] Backend response includes:")
        print(
            f"[DEBUG]   - tree_metadata: {len(result.get('tree_metadata', []))} items"
        )
        print(f"[DEBUG]   - s_edge_metadata: {result.get('s_edge_metadata', {})}")
        print(
            f"[DEBUG]   - lattice_edge_tracking: {len(result.get('lattice_edge_tracking', []))} items"
        )
        if result.get("tree_metadata") and len(result["tree_metadata"]) > 0:
            sample_meta = result["tree_metadata"][0]
            print(f"[DEBUG]   - Sample tree_metadata[0]: {sample_meta}")

        # Ensure all data is JSON-serializable by converting numpy arrays
        result = _ensure_json_serializable(result)

        return result

    @classmethod
    def _serialize_tree_pair_solutions(cls, tree_pair_solutions):
        """Convert TreePairSolution objects to JSON-serializable format."""
        serialized_solutions = []

        # tree_pair_solutions is now a dict with keys like "pair_0_1", "pair_1_2"
        for pair_key, solution in tree_pair_solutions.items():
            # Convert Partition objects to split indices (List[int]) for JSON serialization
            serialized_solution = {
                "pair_key": pair_key,
                "tree_indices": solution["tree_indices"],
                "lattice_edge_solutions": {
                    str(list(key.indices)): value
                    for key, value in solution["lattice_edge_solutions"].items()
                },
                "mapping_one": {
                    str(list(key.indices)): list(value.indices)
                    for key, value in solution["mapping_one"].items()
                },
                "mapping_two": {
                    str(list(key.indices)): list(value.indices)
                    for key, value in solution["mapping_two"].items()
                },
                "s_edge_sequence": [
                    list(edge.indices) if edge is not None else None
                    for edge in solution["s_edge_sequence"]
                ],
                "s_edge_distances": {
                    str(list(key.indices)): value
                    for key, value in solution.get("s_edge_distances", {}).items()
                },
            }
            serialized_solutions.append(serialized_solution)

        return serialized_solutions

    @classmethod
    def _extract_s_edges_from_metadata(cls, tree_metadata):
        """Extract s_edge_tracker from tree metadata for lattice edge tracking."""
        # Extract s_edge_tracker from each tree's metadata
        flat_s_edges = []

        for meta in tree_metadata:
            s_edge_tracker = meta.get("s_edge_tracker")
            if s_edge_tracker is not None:
                # Parse the string representation back to list of indices
                # s_edge_tracker format is like "(1,3,5)" or None
                try:
                    # Remove parentheses and split by comma
                    indices_str = s_edge_tracker.strip("()")
                    if indices_str:
                        indices = [int(x.strip()) for x in indices_str.split(",")]
                        flat_s_edges.append(indices)
                    else:
                        flat_s_edges.append(None)
                except (ValueError, AttributeError):
                    flat_s_edges.append(None)
            else:
                flat_s_edges.append(None)

        return flat_s_edges

    @classmethod
    def _process_tree_metadata(cls, tree_metadata):
        """Process tree metadata to ensure JSON serialization and add phase information."""
        processed_metadata = []

        for meta in tree_metadata:
            processed_meta = {
                "global_tree_index": meta.get("global_tree_index"),
                "tree_name": meta.get("tree_name"),
                "source_tree_index": meta.get("source_tree_index"),
                "tree_pair_key": meta.get("tree_pair_key"),
                "s_edge_tracker": meta.get("s_edge_tracker"),
                "step_in_pair": meta.get("step_in_pair"),
                "phase": cls._determine_tree_phase(meta.get("tree_name", "")),
            }
            processed_metadata.append(processed_meta)

        return processed_metadata

    @classmethod
    def _determine_tree_phase(cls, tree_name: str) -> str:
        """Determine which phase of s_edge interpolation this tree represents."""
        if tree_name.startswith("T"):
            return "ORIGINAL"
        elif "_down_" in tree_name:
            return "DOWN_PHASE"
        elif tree_name.startswith("C") and "_reorder" not in tree_name:
            return "COLLAPSE_PHASE"
        elif "_reorder" in tree_name:
            return "REORDER_PHASE"
        elif "_up_" in tree_name:
            return "PRE_SNAP_PHASE"
        elif "_ref_" in tree_name:
            return "SNAP_PHASE"
        else:
            return "UNKNOWN"

    def _extract_tree_pair_solutions_from_highlighted(self):
        """
        Extract tree_pair_solutions structure from highlighted elements.
        Returns a dict keyed by pair_key (e.g., "pair_0_1") with solution data.
        """
        if not self.to_be_highlighted:
            return {}
        
        # The to_be_highlighted field contains serialized tree_pair_solutions
        # Convert list format back to dict format for easier lookup
        tree_pair_solutions = {}
        
        for solution in self.to_be_highlighted:
            if isinstance(solution, dict) and "pair_key" in solution:
                pair_key = solution["pair_key"]
                tree_pair_solutions[pair_key] = solution
        
        return tree_pair_solutions
    
    def _extract_s_edge_metadata(self):
        """Extract s_edge summary metadata for frontend."""
        if not self.tree_metadata:
            return {
                "s_edge_count": 0,
                "trees_per_s_edge": {},
                "total_interpolated_trees": 0,
                "phase_distribution": {},
            }

        # Count s_edges by analyzing tree_pair_keys
        s_edge_counts = {}
        phase_counts = {}

        for meta in self.tree_metadata:
            # Count phases
            phase = meta.get("phase", "UNKNOWN")
            phase_counts[phase] = phase_counts.get(phase, 0) + 1

            # Count trees per s_edge (variable length)
            tree_pair_key = meta.get("tree_pair_key")
            if tree_pair_key:
                s_edge_counts[tree_pair_key] = s_edge_counts.get(tree_pair_key, 0) + 1

        return {
            "s_edge_count": len(s_edge_counts),
            "trees_per_s_edge": s_edge_counts,  # Variable counts per s-edge
            "total_interpolated_trees": self.interpolated_tree_count,
            "phase_distribution": phase_counts,
        }

    @classmethod
    def create_empty(cls, filename: str) -> "MovieData":
        """Create empty MovieData for failed processing scenarios."""
        return cls(
            tree_list=[],
            tree_names=[],
            tree_metadata=[],
            rfd_list=[],
            weighted_robinson_foulds_distance_list=[],
            distance_matrix=None,
            sorted_leaves=[],
            to_be_highlighted=[],
            lattice_edge_tracking=[],
            file_name=filename,
            window_size=1,
            window_step_size=1,
            msa_content=None,
            alignment_length=None,
            windows_are_overlapping=False,
            original_tree_count=0,
            interpolated_tree_count=0,
            processing_time_ms=0,
            rooting_enabled=False,
        )
