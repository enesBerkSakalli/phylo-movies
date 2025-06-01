"""Core tree processing operations."""

from typing import List, Tuple, Any
from brancharchitect.tree import Node
import numpy as np
from flask import current_app
from numpy._typing._array_like import NDArray

from .types import TreeList
from brancharchitect.rooting import reroot_to_best_match
from brancharchitect.jumping_taxa.tree_interpolation import (
    interpolate_adjacent_tree_pairs,
)
from brancharchitect.distances import (
    calculate_along_trajectory,
    calculate_matrix_distance,
    relative_robinson_foulds_distance,
    weighted_robinson_foulds_distance,
)
from brancharchitect.leaforder.tree_order_optimiser import TreeOrderOptimizer
from brancharchitect.jumping_taxa.lattice.lattice_solver import (
    adapter_iterate_lattice_algorithm,
)


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
        for i in range(0, len(self.trees) - 1, 1):
            try:
                rerooted_tree: Node = reroot_to_best_match(
                    self.trees[i], self.trees[i + 1]
                )
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

    def interpolate_trees(self, trees: TreeList) -> TreeList:
        """Generate interpolated trees for smoother animations."""
        try:
            return interpolate_adjacent_tree_pairs(trees)
        except Exception as e:
            self.logger.error(f"Tree interpolation failed: {e}")
            return trees

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

    def calculate_jumping_taxa(self, trees: TreeList) -> List[List[list[int]]]:
        """Calculate jumping taxa between consecutive trees."""
        if len(trees) < 2:
            return [[]]

        leaf_order = getattr(trees[0], "_order", [])
        if not leaf_order:
            self.logger.warning(
                "No leaf order available, skipping jumping taxa calculation"
            )
            return [[] for _ in range(len(trees) - 1)]
        jumping_taxa: List[List[Tuple[int, ...]]] = []
        try:
            for i in range(len(trees) - 1):

                raw_jumping_taxa: List[Tuple[int, ...]] = (
                    adapter_iterate_lattice_algorithm(
                        trees[i], trees[i + 1], leaf_order
                    )
                )

                jumping_taxa.append(raw_jumping_taxa)

            # Convert each tuple to a list to match the expected return type
            jumping_taxa_lists: List[List[list[int]]] = [
                [list(taxa) for taxa in taxa_group] for taxa_group in jumping_taxa
            ]
            return jumping_taxa_lists
        except Exception as e:
            self.logger.error(f"Jumping taxa calculation failed: {e}")
            return [[] for _ in range(len(trees) - 1)]

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
