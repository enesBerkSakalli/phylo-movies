"""Core tree processing operations."""

from typing import List, Tuple, Any, Dict
from brancharchitect.elements.partition_set import PartitionSet
from brancharchitect.tree import Node
import numpy as np
from flask import current_app
from numpy._typing._array_like import NDArray

from .types import TreeList
from brancharchitect.rooting.rooting import midpoint_root
from brancharchitect.jumping_taxa.tree_interpolation import (
    interpolate_adjacent_blocked_tree_pairs,
)
from brancharchitect.distances.distances import (
    calculate_along_trajectory,
    calculate_matrix_distance,
    relative_robinson_foulds_distance,
    weighted_robinson_foulds_distance,
)
from brancharchitect.leaforder.tree_order_optimiser import TreeOrderOptimizer
from brancharchitect.jumping_taxa.lattice.lattice_solver import (
    iterate_lattice_algorithm,
)
from brancharchitect.elements.partition import Partition


class TreeProcessor:
    """Handles tree processing operations."""

    def __init__(self, trees: TreeList, enable_rooting: bool = True):
        self.trees = trees
        self.enable_rooting = enable_rooting
        self.logger = current_app.logger

    def root_trees(self) -> TreeList:
        """Apply midpoint rooting to trees if enabled."""
        if not self.enable_rooting:
            return self.trees

        rooted_trees: TreeList = []
        for i in range(0, len(self.trees), 1):
            try:
                rerooted_tree: Node = midpoint_root(self.trees[i])

            except Exception as e:
                self.logger.error(f"Midpoint rooting failed for tree {i}: {e}")
                rerooted_tree = self.trees[i]  # Use original tree if rooting fails
            rooted_trees.append(rerooted_tree)
        return rooted_trees

    def optimize_tree_order(self, trees: TreeList) -> TreeList:
        """Optimize the order of trees for better visualization."""
        if len(trees) <= 1:
            return trees

        try:
            optimizer = TreeOrderOptimizer(trees)
            optimizer.optimize(n_iterations=10, bidirectional=True)
            return trees
        except Exception as e:
            self.logger.error(f"Tree order optimization failed: {e}")
            return trees

    def interpolate_trees(self, trees: TreeList) -> Tuple[List[Node], List[str]]:
        """Generate interpolated trees and names for smoother animations."""
        try:
            interpolated_trees, consecutive_tree_names = (
                interpolate_adjacent_blocked_tree_pairs(trees)
            )
            return interpolated_trees, consecutive_tree_names
        except Exception as e:
            self.logger.error(f"Tree interpolation failed: {e}")
            return trees, []

    def calculate_distances(
        self, trees: TreeList
    ) -> Tuple[List[float], List[float], NDArray[Any]]:
        """Calculate various distance metrics between trees."""
        if len(trees) < 2:
            return [0.0], [0.0], np.zeros((1, 1))

        try:
            # Calculate distances along trajectory
            rfd_list: List[float] = calculate_along_trajectory(
                trees, relative_robinson_foulds_distance
            )
            wrfd_list: List[float] = calculate_along_trajectory(
                trees, weighted_robinson_foulds_distance
            )

            # Calculate full distance matrix
            matrix_distance: List[List[float]] = calculate_matrix_distance(
                trees, relative_robinson_foulds_distance
            )
            distance_matrix: NDArray[Any] = self._validate_distance_matrix(
                matrix_distance, len(trees)
            )

            return rfd_list, wrfd_list, distance_matrix

        except Exception as e:
            self.logger.error(f"Distance calculation failed: {e}")
            return [0.0], [0.0], np.zeros((len(trees), len(trees)))

    def calculate_jumping_taxa(
        self, trees: TreeList
    ) -> Tuple[
        List[List[list[int]]],
        List[List[Partition]],
        List[Dict[str, List[Tuple[int, ...]]]],
    ]:
        """Calculate jumping taxa between consecutive trees."""
        jumping_taxa_lists: List[List[list[int]]] = []
        s_edges_lists: List[List[Partition]] = []
        covers_lists: List[Dict[str, List[Tuple[int, ...]]]] = []
        if len(trees) < 2:
            return [[]], [], []

        try:
            for i in range(len(trees) - 1):
                raw_jumping_taxa, s_edges, covers = (
                    adapter_iterate_lattice_algorithm_with_covers(
                        trees[i], trees[i + 1]
                    )
                )
                jumping_taxa_lists.append([list(t) for t in raw_jumping_taxa])
                s_edges_lists.append(s_edges)
                covers_lists.append(covers)
            return (
                jumping_taxa_lists,
                s_edges_lists,
                covers_lists,
            )
        except Exception as e:
            self.logger.error(f"Jumping taxa calculation failed: {e}")
            return [[]], [], []

    def _validate_distance_matrix(
        self, matrix_distance: List[List[float]], expected_size: int
    ) -> NDArray[Any]:
        """Validate and convert distance matrix to numpy array."""
        # The type of matrix_distance is already List[List[float]], so no need to check isinstance

        if not matrix_distance:
            if expected_size <= 1:
                return np.zeros((1, 1))
            else:
                self.logger.error(
                    "Distance matrix is empty but multiple trees provided"
                )
                return np.zeros((expected_size, expected_size))

        # Validate structure
        # No need to check isinstance(row, list) since type hints guarantee this

        num_rows: int = len(matrix_distance)
        num_cols: int = len(matrix_distance[0]) if matrix_distance else 0

        if num_rows != num_cols or num_rows != expected_size:
            self.logger.error(
                f"Distance matrix dimensions invalid: {num_rows}x{num_cols}, expected {expected_size}x{expected_size}"
            )
            return np.zeros((expected_size, expected_size))

        try:
            distance_array = np.array(matrix_distance, dtype=float)

            if np.isnan(distance_array).any() or np.isinf(distance_array).any():
                self.logger.error("Distance matrix contains NaN or Inf values")
                return np.zeros((expected_size, expected_size))

            return distance_array

        except Exception as e:
            self.logger.error(f"Failed to convert distance matrix to numpy array: {e}")
            return np.zeros((expected_size, expected_size))


def adapter_iterate_lattice_algorithm_with_covers(
    input_tree1: Node, input_tree2: Node, leaf_order: List[str] = []
) -> Tuple[List[Tuple[int, ...]], List[Partition], Dict[str, List[Tuple[int, ...]]]]:
    """
    Adapter for iterate_lattice_algorithm. Translates List[Partition] solutions to List[Tuple[int, ...]].
    """
    # solution_partitions is List[Partition]
    s_edges: List[Partition] = []
    solution_partitions, s_edges = iterate_lattice_algorithm(
        input_tree1, input_tree2, leaf_order
    )

    translated_solutions: List[Tuple[int, ...]] = []
    translated_s_edges: List[Tuple[int, ...]] = []
    # unique_covers_t1 and t2 are PartitionSet[Partition]

    unique_covers_t1: PartitionSet[Partition] = input_tree1.to_splits().union(
        input_tree2.to_splits()
    )

    unique_covers_t2: PartitionSet[Partition] = input_tree1.to_splits().union(
        input_tree2.to_splits()
    )

    unique_covers_atoms_t1: PartitionSet[Partition] = unique_covers_t1.atom()
    unique_covers_atoms_t2: PartitionSet[Partition] = unique_covers_t2.atom()

    unique_translated_covers_t1: List[Tuple[int, ...]] = []
    unique_translated_covers_t2: List[Tuple[int, ...]] = []

    for cover in unique_covers_atoms_t1:
        indices_tuple = cover.resolve_to_indices()
        unique_translated_covers_t1.append(indices_tuple)

    for cover in unique_covers_atoms_t2:
        indices_tuple = cover.resolve_to_indices()
        unique_translated_covers_t2.append(indices_tuple)

    for s_edge in s_edges:
        indices_tuple = s_edge.resolve_to_indices()
        translated_s_edges.append(tuple(sorted(indices_tuple)))

    for sol_partition in solution_partitions:  # sol_partition is a Partition
        indices_tuple = sol_partition.resolve_to_indices()
        translated_solutions.append(
            tuple(sorted(indices_tuple))
        )  # Sort for consistent output

    return (
        translated_solutions,
        s_edges,
        {
            "t1": unique_translated_covers_t1,
            "t2": unique_translated_covers_t2,
        },
    )
