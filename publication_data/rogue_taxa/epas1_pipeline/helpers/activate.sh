#!/bin/bash
# Activation script for EPAS1 pipeline environment

source ~/miniconda3/etc/profile.d/conda.sh
conda activate epas1-pipeline

echo "EPAS1 pipeline environment activated!"
echo "Available tools:"
echo "  - bcftools: $(bcftools --version | head -1)"
echo "  - samtools: $(samtools --version | head -1)"
echo "  - fasttree: $(fasttree 2>&1 | grep -i version | head -1)"
echo "  - iqtree2: available"
echo "  - Python: $(python --version)"
echo ""
echo "To run the pipeline:"
echo "  1. Add your data files to data/ directories"
echo "  2. Update config.yaml with actual file paths"
echo "  3. Run: make all"