"""Simplified MSA utilities - only what's needed for tree processing."""

import re
from typing import Optional, Dict, Any


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
