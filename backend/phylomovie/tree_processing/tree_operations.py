"""
Core Tree Processing Operations.

This module defines the `TreeProcessor` class, which encapsulates various
phylogenetic tree processing functionalities. These include rooting,
order optimization, interpolation, distance calculation, jumping taxa
identification, and embedding generation for visualization.
"""

from typing import List, Tuple, Any
# Node will be imported within the try-except block or fall back to Any
import numpy as np # Single import
from flask import current_app
from numpy.typing import NDArray # Corrected import for NDArray

from .types import TreeList
try:
    from brancharchitect.tree import Node
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
except ModuleNotFoundError:
    # Define fallbacks for all imported names if brancharchitect is not found
    Node = Any
    reroot_to_best_match = lambda x, y: x # Returns the first tree as is
    interpolate_adjacent_tree_pairs = lambda x: x # Returns original trees
    calculate_along_trajectory = lambda x, y: [0.0] * (len(x) -1 if len(x)>0 else 0) # Returns list of zeros
    calculate_matrix_distance = lambda x, y: [[0.0 for _ in r] for r in x] # Returns zero matrix
    relative_robinson_foulds_distance = None
    weighted_robinson_foulds_distance = None
    TreeOrderOptimizer = None # Cannot easily mock this class behavior
    adapter_iterate_lattice_algorithm = lambda x,y,z: []


# Assuming perform_umap is in phylomovie.utils
# If it's a local import, adjust path, e.g. from ..utils import perform_umap
# For now, assuming it's available via current_app or a direct import if needed
from ..utils import perform_umap # Corrected import path


class TreeProcessor:
    """Handles tree processing operations."""

    def __init__(self, trees: TreeList, enable_rooting: bool = True):
        """
        Initialize the TreeProcessor.

        Args:
            trees: A list of tree objects (Nodes) to be processed.
            enable_rooting: Flag to enable/disable midpoint rooting.
        """
        self.trees = trees
        self.enable_rooting = enable_rooting
        self.logger = current_app.logger
        self.distance_matrix: NDArray[Any] = np.array([]) # Initialize distance_matrix

    def root_trees(self) -> TreeList:
        """
        Apply midpoint rooting to trees if enabled.
        Note: This method roots tree_i against tree_{i+1}.
        The last tree in the original list is not processed by reroot_to_best_match
        and is not included in the returned list if len(self.trees) > 0.
        The returned list will have len(self.trees) - 1 elements if rooting is
        performed on a list with >1 trees. If 0 or 1 tree, or rooting disabled,
        original list/tree is returned.
        """
        if not self.enable_rooting or len(self.trees) <= 1: # If only 1 tree, no pair to root against
            return self.trees

        rooted_trees: TreeList = []
        # Loop to len(self.trees) - 1 to ensure self.trees[i+1] is always valid
        for i in range(len(self.trees) - 1):
            try:
                # tree_i is rooted based on tree_{i+1}
                rerooted_tree: Node = reroot_to_best_match(
                    self.trees[i], self.trees[i+1]
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
            matrix_distance_list: List[List[float]] = calculate_matrix_distance(
                trees, relative_robinson_foulds_distance
            )
            # Validate and store in self.distance_matrix
            self.distance_matrix = self._validate_distance_matrix(
                matrix_distance_list, len(trees)
            )

            return rfd_list, wrfd_list, self.distance_matrix

        except Exception as e:
            self.logger.error(f"Distance calculation failed: {e}")
            self.distance_matrix = np.zeros((len(trees), len(trees)))
            return [0.0], [0.0], self.distance_matrix

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

    def _generate_geometrical_embedding(self) -> list:
        """
        Generate simple geometrical embedding patterns based on self.distance_matrix.
        """
        n_samples = self.distance_matrix.shape[0]
        if self.distance_matrix.size == 0 or n_samples == 0 :
            self.logger.warning(
                "Distance matrix is empty, returning empty geometrical embedding"
            )
            return []

        self.logger.info(f"Generating geometrical embedding for {n_samples} samples")

        # Create simple geometrical patterns based on sample count
        if n_samples == 1:
            embedding = [[0.0, 0.0]] # Single point at origin
        elif n_samples == 2:
            embedding = [[-1.0, 0.0], [1.0, 0.0]] # Two points on x-axis
        elif n_samples <= 10:
            # Circular arrangement for small datasets
            angles = np.linspace(0, 2 * np.pi, n_samples, endpoint=False)
            radius = 2.0
            embedding = [
                [radius * np.cos(angle), radius * np.sin(angle)] for angle in angles
            ]
        else:
            # Grid arrangement for larger datasets
            grid_size = int(np.ceil(np.sqrt(n_samples)))
            embedding = []
            for i in range(n_samples):
                row = i // grid_size
                col = i % grid_size
                x = (col - grid_size / 2) * 2.0 # Center the grid around origin
                y = (row - grid_size / 2) * 2.0
                embedding.append([x, y])

        self.logger.info(f"Generated {len(embedding)} geometrical embedding points")
        return embedding

    def generate_embedding(self, enable_embedding: bool = True) -> list:
        """
        Generate UMAP or geometrical embedding from self.distance_matrix.
        Args:
            enable_embedding: Flag to enable UMAP or fallback to geometrical.
        Returns:
            List of embedding coordinates.
        """
        if self.distance_matrix.size == 0:
            self.logger.warning("Distance matrix is empty, skipping embedding generation.")
            return []

        if not enable_embedding:
            self.logger.info("UMAP embedding disabled, generating geometrical embedding.")
            return self._generate_geometrical_embedding()

        try:
            umap_params = {
                "n_components": current_app.config["UMAP_N_COMPONENTS"],
                "random_state": current_app.config["UMAP_RANDOM_STATE"],
                "n_neighbors": current_app.config["UMAP_N_NEIGHBORS"],
                "min_dist": current_app.config["UMAP_MIN_DIST"],
            }
            self.logger.info(f"Using UMAP parameters from config: {umap_params}")
            # Ensure perform_umap is correctly imported or accessed
            # from ..utils import perform_umap
            embedding_array = perform_umap(self.distance_matrix, **umap_params)
            self.logger.info("UMAP embedding generated successfully.")
            return embedding_array.tolist()
        except KeyError as e:
            self.logger.error(f"UMAP configuration key missing: {e}. Falling back to geometrical embedding.")
            return self._generate_geometrical_embedding()
        except Exception as e:
            self.logger.error(f"UMAP embedding failed: {e}. Falling back to geometrical embedding.")
            return self._generate_geometrical_embedding()
