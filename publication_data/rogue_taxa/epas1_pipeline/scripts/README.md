# Canonical Scripts

These scripts form the intended EPAS1 rogue-taxon analysis path:

- `consensus.py`: build per-sample consensus sequences and a merged alignment
- `window_trees.py`: slice the alignment into windows, infer trees, and assign states
- `utils_topology.py`: shared topology/state classification utilities
- `quick_strip.py`: optional visual summary from the window-state CSV

These files are important for publication reproducibility, but the current audit
still marks them as needing fixes before external release.
