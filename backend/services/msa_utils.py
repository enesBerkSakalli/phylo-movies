"""Simplified MSA utilities - only what's needed for tree processing."""

import re
from typing import Optional, Dict, Any, Union
from logging import Logger


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


class WindowParameters:
    """Simple window parameters class."""

    def __init__(self, window_size: int, step_size: int):
        self.window_size = window_size
        self.step_size = step_size
        self.is_overlapping = step_size < window_size

    def to_dict(self) -> Dict[str, Any]:
        return {
            "window_size": self.window_size,
            "step_size": self.step_size,
            "is_overlapping": self.is_overlapping,
        }


def infer_window_parameters(num_trees: int, alignment_length: int) -> WindowParameters:
    """Infer sliding window parameters from tree count and alignment length."""
    if num_trees <= 1:
        return WindowParameters(alignment_length, alignment_length)

    # Simple calculation
    window_size = max(1, alignment_length // num_trees)
    step_size = max(1, alignment_length // num_trees)

    return WindowParameters(window_size, step_size)


def _process_msa_data(
    msa_content: Optional[str],
    num_trees: int,
    window_size: int = 1,
    step_size: int = 1,
    logger: Optional[Logger] = None,
) -> Dict[str, Optional[Union[int, str, bool]]]:
    """Process MSA content and infer window parameters."""
    if not msa_content:
        return {
            "inferred_window_size": None,
            "inferred_step_size": None,
            "windows_are_overlapping": None,
            "alignment_length": None,
        }

    alignment_length = get_alignment_length(msa_content)
    if not alignment_length:
        if logger:
            logger.warning("Could not determine alignment length from MSA content")
        return {
            "inferred_window_size": None,
            "inferred_step_size": None,
            "windows_are_overlapping": None,
            "alignment_length": None,
        }

    if logger:
        logger.info(f"MSA alignment length: {alignment_length}")

    window_params = None
    if window_size == 1 and step_size == 1:
        # Infer window parameters
        window_params = infer_window_parameters(num_trees, alignment_length)
        if logger:
            logger.info(f"Inferred window parameters: {window_params.to_dict()}")

    return {
        "inferred_window_size": window_params.window_size if window_params else None,
        "inferred_step_size": window_params.step_size if window_params else None,
        "windows_are_overlapping": (
            window_params.is_overlapping if window_params else None
        ),
        "alignment_length": alignment_length,
        "msa_content": msa_content,  # Return raw MSA content for frontend storage
    }
