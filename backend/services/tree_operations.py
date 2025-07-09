"""Core tree processing operations."""

from brancharchitect.movie_pipeline.types import InterpolationSequence, PipelineConfig
from brancharchitect import TreeInterpolationPipeline
from flask import current_app

from .types import TreeList


class TreeProcessor:
    """Handles tree processing operations."""

    def __init__(self, trees: TreeList, enable_rooting: bool = False):
        self.trees = trees
        self.enable_rooting = enable_rooting
        self.logger = current_app.logger

    def interpolate_trees(self, trees: TreeList) -> InterpolationSequence:
        """Interpolate between trees using TreeInterpolationPipeline."""
        if len(trees) < 2:
            self.logger.warning("Need at least 2 trees for interpolation")
            # Return a minimal InterpolationSequence for single tree
            from brancharchitect.movie_pipeline.types import (
                create_single_tree_interpolation_sequence,
            )

            return create_single_tree_interpolation_sequence(trees)

        try:
            config = PipelineConfig(
                enable_rooting=self.enable_rooting,
                optimization_iterations=20,
                bidirectional_optimization=False,
                enable_distance_matrix=False,
                logger_name="my_pipeline",
            )

            pipeline = TreeInterpolationPipeline(config=config)
            results: InterpolationSequence = pipeline.process_trees(trees)

            return results
        except Exception as e:
            self.logger.error(f"Tree interpolation failed with {type(e).__name__}: {e}")
            self.logger.error(f"Failed processing {len(trees)} trees")
            raise RuntimeError(
                f"Tree interpolation failed: {type(e).__name__}: {e}"
            ) from e
