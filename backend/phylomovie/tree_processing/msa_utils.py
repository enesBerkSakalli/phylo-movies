"""Utilities for processing Multiple Sequence Alignment (MSA) data."""

from typing import Optional, Tuple
from .types import WindowParameters


def get_alignment_length(msa_content: str) -> Optional[int]:
    """
    Extract alignment length from MSA content.
    
    Supports FASTA, CLUSTAL, and PHYLIP formats.
    
    Args:
        msa_content: String containing the MSA data
        
    Returns:
        Alignment length or None if it couldn't be determined
    """
    if not msa_content:
        return None
    
    lines = msa_content.splitlines()
    
    # Check for PHYLIP format first (has dimensions in first line)
    if lines and lines[0].strip():
        first_line = lines[0].strip().replace('\t', ' ')
        parts = [p for p in first_line.split(' ') if p]
        if len(parts) >= 2 and all(p.isdigit() for p in parts[:2]):
            return int(parts[1])
    
    # Handle FASTA format
    if any(line.startswith('>') for line in lines):
        seq_lines = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('>'):
                seq_lines.append(line)
                if len(seq_lines) == 1:
                    break
        
        if seq_lines:
            return len(seq_lines[0])
    
    # Handle CLUSTAL format
    if any(line.upper().startswith('CLUSTAL') for line in lines):
        for i, line in enumerate(lines):
            if i > 0 and line and not line.startswith('CLUSTAL') and not line.strip().startswith('*'):
                parts = line.split()
                if len(parts) >= 2:
                    return len(parts[1])
    
    # Fallback: try to find the first likely sequence
    for line in lines:
        line = line.strip()
        if line and not line.startswith('>') and not line.startswith('CLUSTAL'):
            parts = line.split()
            if len(parts) >= 2 and len(parts[1]) > 5:
                return len(parts[1])
    
    return None


def infer_window_parameters(num_trees: int, alignment_length: int) -> WindowParameters:
    """
    Infer optimal window parameters for sliding window analysis.
    
    Args:
        num_trees: Number of trees in the phylogenetic analysis
        alignment_length: Length of the MSA alignment
        
    Returns:
        WindowParameters object with inferred values
    """
    if num_trees < 2 or alignment_length < 1:
        return WindowParameters(alignment_length, alignment_length, False)

    # Try non-overlapping windows first
    if alignment_length >= num_trees:
        window_size = alignment_length // num_trees
        if window_size > 0:
            return WindowParameters(window_size, window_size, False)
    
    # Use overlapping windows if non-overlapping isn't feasible
    window_size = max(alignment_length // 5, 10)
    window_size = min(window_size, alignment_length)
    
    if num_trees > 1:
        step_size = (alignment_length - window_size) // (num_trees - 1)
        step_size = max(1, step_size)
    else:
        step_size = window_size
    
    is_overlapping = step_size < window_size
    
    return WindowParameters(window_size, step_size, is_overlapping)
