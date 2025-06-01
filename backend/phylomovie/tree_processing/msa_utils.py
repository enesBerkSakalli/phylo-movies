"""
MSA (Multiple Sequence Alignment) Utilities.

This module provides helper functions for processing MSA files and content,
such as determining alignment length and inferring sliding window parameters
for analysis in conjunction with phylogenetic trees. It also includes
utilities for parsing Newick tree files directly from FileStorage objects.
"""

import re
from typing import Optional, Union, Any # Added Any for fallback
# Logger import is consolidated below
from werkzeug.datastructures import FileStorage
try:
    from brancharchitect.tree import Node
    from brancharchitect.io import parse_newick
except ModuleNotFoundError:
    Node = Any # Fallback
    parse_newick = lambda x: [] # Dummy fallback

# Import the centralized WindowParameters and TreeList type
from .types import WindowParameters, TreeList

from logging import Logger # Consolidated Logger import

def get_alignment_length(msa_content: str) -> Optional[int]:
    """Extract alignment length from MSA content."""
    if not msa_content:
        return None

    lines = msa_content.strip().split("\n")

    # FASTA format
    if any(line.startswith(">") for line in lines):
        sequences: list[str] = []
        current_seq = ""
        for line in lines:
            if line.startswith(">"):
                if current_seq:
                    sequences.append(current_seq)
                    current_seq = ""
            else:
                current_seq += line.strip()
        if current_seq:
            sequences.append(current_seq)

        return len(sequences[0]) if sequences else None

    # PHYLIP format
    elif re.match(r"^\s*\d+\s+\d+", lines[0]):
        header_match = re.match(r"^\s*(\d+)\s+(\d+)", lines[0])
        if header_match:
            return int(header_match.group(2))

    # Clustal format
    elif any("CLUSTAL" in line.upper() for line in lines[:3]):
        for line in lines:
            if (
                line.strip()
                and not line.startswith("CLUSTAL")
                and not line.strip().startswith("*")
            ):
                parts = line.split()
                if len(parts) >= 2:
                    return len("".join(parts[1:]))

    return None


def infer_window_parameters(num_trees: int, alignment_length: int, logger: Optional[Logger] = None) -> WindowParameters:
    """
    Infer sliding window parameters from tree count and alignment length.
    This version maintains the original simple inference logic.
    Args:
        num_trees: Number of trees.
        alignment_length: Length of the MSA.
        logger: Optional logger instance.
    Returns:
        WindowParameters object.
    """
    # If num_trees is 0 or 1, it implies the entire alignment is one block.
    # (num_trees <= 0 shouldn't happen with parsed trees)
    if num_trees <= 1:
        w_size = alignment_length
        s_size = alignment_length
        # is_overlapping is true if step_size < window_size
        if logger:
            logger.info(f"num_trees <= 1, setting window_size and step_size to alignment_length: {alignment_length}")
        return WindowParameters(window_size=w_size, step_size=s_size, is_overlapping=(s_size < w_size))

    # Simple calculation based on the original version in msa_utils
    window_size = max(1, alignment_length // num_trees)
    step_size = window_size # Original msa_utils inferred non-overlapping windows this way
    if logger:
        logger.info(f"Inferred window_size: {window_size}, step_size: {step_size} for {num_trees} trees and alignment length {alignment_length}")

    return WindowParameters(window_size=window_size, step_size=step_size, is_overlapping=(step_size < window_size))


def parse_newick_from_filestorage(file_storage: FileStorage, logger: Optional[Logger] = None) -> TreeList:
    """
    Parse Newick content from a FileStorage object.

    Args:
        file_storage: werkzeug.datastructures.FileStorage object.
        logger: Optional logger instance for error logging.

    Returns:
        List of parsed tree Nodes. Returns empty list on failure.
    """
    try:
        newick_text = file_storage.read().decode("utf-8").strip("\r")
        if not newick_text:
            if logger:
                logger.warning("Uploaded Newick file is empty.")
            return []

        trees: Union[Node, TreeList] = parse_newick(newick_text)

        # Ensure parse_newick always returns a list
        if isinstance(trees, Node):
            trees = [trees]
        elif trees is None: # Should not happen based on brancharchitect docs if string is non-empty
             if logger:
                logger.error("Newick parsing returned None for non-empty input.")
             return []


        if not trees: # If parsing resulted in an empty list (e.g. empty string or format error)
            if logger:
                logger.warning("No valid trees parsed from file. Content might be malformed or empty.")
            return [] # Explicitly return empty list

        return trees

    except Exception as e:
        if logger:
            logger.error(f"Newick parsing failed: {e}", exc_info=True)
        return []
