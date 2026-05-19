import os
import subprocess
import glob
import argparse
import math
from collections import Counter
from datetime import datetime


COMPOSITION_LABELS = ["A", "C", "G", "T", "AMBIGUOUS_OR_GAP"]
AMBIGUOUS_OR_GAP = set("RYSWKMBDHVN-?.")


def read_phylip_alignment(filepath):
    """
    Read relaxed/sequential PHYLIP, including wrapped/interleaved sequence
    blocks. Returns (names, sequences), with every sequence validated against
    the header site count.
    """
    with open(filepath, "r") as f:
        lines = f.read().splitlines()

    header = lines[0].strip().split()
    n_taxa = int(header[0])
    n_sites = int(header[1])

    names = []
    sequences = []
    line_index = 1

    while line_index < len(lines) and len(sequences) < n_taxa:
        line = lines[line_index].strip()
        line_index += 1
        if not line:
            continue

        parts = line.split(None, 1)
        if len(parts) != 2:
            raise ValueError(f"Could not parse PHYLIP first block line: {line[:80]}")
        names.append(parts[0])
        sequences.append("".join(parts[1].split()))

    if len(sequences) != n_taxa:
        raise ValueError(f"Expected {n_taxa} taxa, found {len(sequences)}")

    continuation_index = 0
    while line_index < len(lines) and any(len(seq) < n_sites for seq in sequences):
        line = lines[line_index].strip()
        line_index += 1
        if not line:
            continue

        parts = line.split(None, 1)
        if len(parts) == 2 and parts[0] in names:
            taxon_index = names.index(parts[0])
            chunk = "".join(parts[1].split())
            continuation_index = taxon_index + 1
        else:
            taxon_index = continuation_index % n_taxa
            chunk = "".join(line.split())
            continuation_index += 1

        sequences[taxon_index] += chunk

    bad_lengths = {
        name: len(seq)
        for name, seq in zip(names, sequences)
        if len(seq) != n_sites
    }
    if bad_lengths:
        preview = ", ".join(f"{name}={length}" for name, length in list(bad_lengths.items())[:5])
        raise ValueError(f"Expected {n_sites} sites for every taxon; got {preview}")

    return names, sequences


def read_phylip_sequential(filepath):
    """Compatibility wrapper for older callers."""
    return read_phylip_alignment(filepath)[1]


def composition_from_counts(counts):
    ambiguous_or_gap = sum(counts.get(char, 0) for char in AMBIGUOUS_OR_GAP)
    observed = sum(counts.values())
    represented = sum(counts.get(char, 0) for char in "ACGT") + ambiguous_or_gap
    if observed != represented:
        unknown = sorted(char for char in counts if char not in set("ACGT") | AMBIGUOUS_OR_GAP)
        raise ValueError(f"Unhandled sequence characters in alignment: {unknown}")

    return [
        counts.get("A", 0),
        counts.get("C", 0),
        counts.get("G", 0),
        counts.get("T", 0),
        ambiguous_or_gap,
    ]


def calculate_composition(alignment_array):
    """
    Calculates (nA, nC, nG, nT, nAmbiguousOrGap) for the whole alignment.
    Ambiguous IUPAC bases must be counted instead of silently dropped.
    """
    counts = Counter()
    for sequence in alignment_array:
        if isinstance(sequence, str):
            counts.update(sequence.upper())
        else:
            counts.update(str(char).upper() for char in sequence)
    return composition_from_counts(counts)


def euclidean_distance(left, right):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def generate_bootstrap_alignments(alignment_path, output_dir, n_replicates, seed=42):
    """
    Uses RAxML to generate bootstrap replicate alignments.
    RAxML -f j generates bootstrap alignments without running tree inference.
    """
    import shutil

    run_name = "BS_ALN"

    # Copy alignment to output directory with fixed name 'bootstrap'
    # RAxML names output files based on input filename
    base_name = "bootstrap"
    local_alignment = os.path.join(output_dir, base_name)
    shutil.copy(alignment_path, local_alignment)

    # Clean up any previous RAxML output files
    for f in glob.glob(os.path.join(output_dir, f"RAxML_*.{run_name}")):
        os.remove(f)
    for f in glob.glob(os.path.join(output_dir, f"{base_name}.BS*")):
        os.remove(f)

    cmd = [
        "raxmlHPC",
        "-f",
        "j",  # Generate bootstrap alignments only
        "-b",
        str(seed),  # Bootstrap random seed
        "-#",
        str(n_replicates),  # Number of replicates
        "-s",
        base_name,  # Input alignment (local name)
        "-m",
        "GTRGAMMA",  # Model (required but not used for -f j)
        "-n",
        run_name,  # Run name
        "-w",
        os.path.abspath(output_dir),  # Working directory
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, cwd=output_dir)
    if result.returncode != 0:
        print(f"RAxML bootstrap generation failed: {result.stderr}")
        print(f"stdout: {result.stdout}")
        raise RuntimeError("RAxML bootstrap generation failed")

    # RAxML creates files named: <alignment>.BS0, .BS1, .BS2, etc.
    bootstrap_files = []
    for i in range(n_replicates):
        bs_file = os.path.join(output_dir, f"{base_name}.BS{i}")
        if os.path.exists(bs_file):
            bootstrap_files.append(bs_file)

    return bootstrap_files


def run_raxml_tree(alignment_path, output_dir, run_name, seed=42, threads=4):
    """
    Runs RAxML-NG tree inference on a given alignment.
    Falls back to raxmlHPC if raxml-ng fails.
    Returns the path to the best tree.
    """
    # Clean up any previous raxml-ng output files
    prefix = os.path.join(output_dir, run_name)
    for f in glob.glob(f"{prefix}.*"):
        os.remove(f)

    cmd = [
        "raxml-ng",
        "--search",  # Tree search
        "--msa",
        alignment_path,  # Input alignment
        "--model",
        "GTR+G",  # GTR + Gamma model
        "--prefix",
        prefix,  # Output prefix
        "--seed",
        str(seed),  # Random seed
        "--threads",
        str(threads),  # Number of threads
        "--blopt",
        "nr_safe",  # Safer branch length optimization (fixes numerical issues)
        "--redo",  # Overwrite existing files
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    tree_path = f"{prefix}.raxml.bestTree"

    if result.returncode != 0 or not os.path.exists(tree_path):
        # Fallback to raxmlHPC
        print(f"      RAxML-NG failed, falling back to raxmlHPC...")
        for f in glob.glob(os.path.join(output_dir, f"RAxML_*.{run_name}")):
            os.remove(f)

        cmd_fallback = [
            "raxmlHPC",
            "-f",
            "d",  # New rapid hill-climbing
            "-p",
            str(seed),  # Parsimony random seed
            "-s",
            alignment_path,  # Input alignment
            "-m",
            "GTRCAT",  # GTR + CAT approximation (faster)
            "-n",
            run_name,  # Run name
            "-w",
            os.path.abspath(output_dir),  # Working directory
        ]

        result_fallback = subprocess.run(cmd_fallback, capture_output=True, text=True)
        if result_fallback.returncode != 0:
            print(f"raxmlHPC tree inference also failed: {result_fallback.stderr}")
            raise RuntimeError(f"RAxML tree inference failed for {alignment_path}")

        tree_path = os.path.join(output_dir, f"RAxML_bestTree.{run_name}")

    return tree_path


def run_fasttree(alignment_path, output_dir, run_name):
    """
    Runs FastTree on a given alignment.
    Fastest option for tree inference.
    Returns the path to the tree file.
    """
    tree_path = os.path.join(output_dir, f"{run_name}.treefile")

    # Convert PHYLIP to FASTA for FastTree compatibility.
    fasta_path = os.path.join(output_dir, f"{run_name}.fa")
    names, sequences = read_phylip_alignment(alignment_path)
    with open(fasta_path, "w") as f:
        for name, seq in zip(names, sequences):
            f.write(f">{name}\n{seq}\n")

    # FastTree with high-accuracy flags:
    # -gtr: GTR model for nucleotides
    # -gamma: Gamma rate variation (rescale at end)
    # -nt: nucleotide alignment
    # -mlacc 2: optimize all 5 branches at each NNI in 2 rounds (more thorough)
    # -slownni: disable heuristics to skip constant subtrees (more accurate)
    # -nosupport: skip SH-like support (not needed for composition ranking)
    # -quiet: suppress progress output
    # OpenMP threading is automatic (uses all available cores)
    cmd = f"FastTree -gtr -gamma -nt -mlacc 2 -slownni -nosupport -quiet < {fasta_path} > {tree_path}"

    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FastTree failed: {result.stderr}")
        raise RuntimeError(f"FastTree failed for {alignment_path}")

    return tree_path


def run_iqtree(alignment_path, output_dir, run_name, model="GTR+G", threads=4):
    """
    Runs IQ-TREE on a given alignment.
    Returns the path to the best tree.
    """
    prefix = os.path.join(output_dir, run_name)

    # Clean up any previous iqtree output files
    for f in glob.glob(f"{prefix}.*"):
        os.remove(f)

    cmd = [
        "iqtree2",
        "-s",
        alignment_path,
        "-m",
        model,
        "-pre",
        prefix,
        "-nt",
        str(threads),
        "-fast",
        "-quiet",
        "--redo",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"IQ-TREE failed: {result.stderr}")
        raise RuntimeError(f"IQ-TREE failed for {alignment_path}")

    return f"{prefix}.treefile"


def write_run_log(log_path, datasets, args, run_info):
    """
    Writes a detailed log of the run parameters and generation process.
    """
    with open(log_path, "w") as f:
        f.write("=" * 60 + "\n")
        f.write("BOOTSTRAP ORDERING ANALYSIS - RUN LOG\n")
        f.write("=" * 60 + "\n\n")

        f.write(f"Run timestamp: {run_info['timestamp']}\n")
        f.write(f"Output directory: {run_info['output_dir']}\n\n")

        f.write("PARAMETERS\n")
        f.write("-" * 40 + "\n")
        f.write(f"Tree inference program: {args.tree_program}\n")
        f.write(f"Number of bootstrap replicates: {args.n_replicates}\n")
        f.write(f"Random seed: {args.seed}\n")
        f.write(f"Number of threads: {args.threads}\n\n")

        f.write("BOOTSTRAP ALIGNMENT GENERATION\n")
        f.write("-" * 40 + "\n")
        f.write("Method: RAxML -f j (bootstrap alignment generation)\n")
        f.write(
            "  - Creates resampled alignments by sampling columns with replacement\n"
        )
        f.write("  - Each replicate has same dimensions as original alignment\n\n")

        f.write("COMPOSITION DISTANCE METRIC\n")
        f.write("-" * 40 + "\n")
        f.write("Formula: Euclidean distance of nucleotide composition vectors\n")
        f.write(
            "  - Composition vector: (count_A, count_C, count_G, count_T, count_AmbiguousOrGap)\n"
        )
        f.write("  - Distance = sqrt(sum((comp_replicate - comp_original)^2))\n")
        f.write("  - Lower distance = replicate more similar to original\n\n")

        f.write("DATASETS PROCESSED\n")
        f.write("-" * 40 + "\n")
        for ds in datasets:
            f.write(f"  {ds['name']}: {ds['path']}\n")
            if "n_taxa" in ds:
                f.write(f"    Taxa: {ds['n_taxa']}, Sites: {ds['n_sites']}\n")
                f.write(
                    f"    Original composition (A,C,G,T,Gap): {ds['composition']}\n"
                )
        f.write("\n")

        f.write("TREE INFERENCE\n")
        f.write("-" * 40 + "\n")
        if args.tree_program == "fasttree":
            f.write("Program: FastTree (OpenMP multi-threaded)\n")
            f.write(
                "Command: FastTree -gtr -gamma -nt -mlacc 2 -slownni -nosupport -quiet\n"
            )
            f.write("Model: GTR + Gamma (rescaled branch lengths)\n")
            f.write("Accuracy settings:\n")
            f.write("  -mlacc 2: Optimize all 5 branches at each NNI in 2 rounds\n")
            f.write("  -slownni: Disable heuristics to skip constant subtrees\n")
            f.write("  -nosupport: Skip SH-like support calculation\n")
            f.write("  -quiet: Suppress progress output\n")
            f.write("  OpenMP: Uses all available CPU cores automatically\n")
        elif args.tree_program == "raxml":
            f.write("Program: RAxML-NG (with raxmlHPC fallback)\n")
            f.write("Model: GTR+G\n")
        elif args.tree_program == "iqtree":
            f.write("Program: IQ-TREE 2\n")
            f.write("Model: GTR+G with -fast flag\n")
        f.write("\n")

        f.write("OUTPUT FILES\n")
        f.write("-" * 40 + "\n")
        f.write("Per dataset folder:\n")
        f.write(
            "  - bootstrap_order_<name>.txt: Ranked replicates by composition distance\n"
        )
        f.write("  - all_trees_<name>.nwk: All trees in ranked order (one per line)\n")
        f.write("  - rep_<N>/: Per-replicate tree files\n")
        f.write("  - <alignment>.BS<N>: Bootstrap replicate alignments\n")


def main():
    parser = argparse.ArgumentParser(
        description="Generate bootstrap replicates, infer trees, and rank by composition distance"
    )
    parser.add_argument(
        "--tree-program",
        choices=["fasttree", "raxml", "iqtree"],
        default="fasttree",
        help="Tree inference program (default: fasttree)",
    )
    parser.add_argument(
        "--n-replicates",
        type=int,
        default=200,
        help="Number of bootstrap replicates (default: 200)",
    )
    parser.add_argument(
        "--threads",
        type=int,
        default=4,
        help="Number of threads for tree inference (default: 4)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    args = parser.parse_args()
    datasets = [
        # {
        #     "name": "24",
        #     "path": "/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/data/datasets/alignments/24",
        # },
        # {
        #     "name": "125",
        #     "path": "/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/data/datasets/alignments/125",
        # },
        {
            "name": "350",
            "path": "/Users/berksakalli/Projects/rogue_taxa_analysis/online-data/data/datasets/alignments/350",
        },
    ]

    # Create timestamped run folder
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_base = os.path.join("out/runs", f"run_{timestamp}")
    if not os.path.exists(output_base):
        os.makedirs(output_base)
    print(f"Output directory: {output_base}")

    # Prepare run info for logging
    run_info = {
        "timestamp": timestamp,
        "output_dir": output_base,
    }

    for ds in datasets:
        print(f"Processing {ds['name']}...")
        if not os.path.exists(ds["path"]):
            print(f"File not found: {ds['path']}")
            continue

        try:
            names, sequences = read_phylip_alignment(ds["path"])
        except Exception as e:
            print(f"  Error reading alignment: {e}")
            continue

        n_taxa = len(names)
        n_sites = len(sequences[0])
        print(f"  Loaded: {n_taxa} taxa, {n_sites} sites.")

        # Original composition
        c_orig = calculate_composition(sequences)
        print(f"  Original Comp ({','.join(COMPOSITION_LABELS)}): {c_orig}")

        # Store dataset info for logging
        ds["n_taxa"] = n_taxa
        ds["n_sites"] = n_sites
        ds["composition"] = c_orig

        # Bootstraps - use CLI arguments
        n_replicates = args.n_replicates
        n_threads = args.threads
        distances = []

        # Base directory for this dataset
        ds_dir = os.path.join(output_base, ds["name"])
        if not os.path.exists(ds_dir):
            os.makedirs(ds_dir)

        # Generate bootstrap alignments using RAxML
        print(f"  Generating {n_replicates} bootstrap alignments with RAxML...")
        bootstrap_files = generate_bootstrap_alignments(
            ds["path"], ds_dir, n_replicates, seed=args.seed
        )
        print(f"  Generated {len(bootstrap_files)} bootstrap alignments.")

        for b, bs_file in enumerate(bootstrap_files):
            # Read the bootstrap alignment to calculate composition
            # Use custom parser for RAxML sequential PHYLIP output
            try:
                bs_alg_array = read_phylip_sequential(bs_file)
            except Exception as e:
                print(f"    Error reading bootstrap {b}: {e}")
                continue

            c_rep = calculate_composition(bs_alg_array)

            # Euclidean distance
            dist = euclidean_distance(c_rep, c_orig)

            # Create directory for this replicate
            rep_dir = os.path.join(ds_dir, f"rep_{b}")
            if not os.path.exists(rep_dir):
                os.makedirs(rep_dir)

            # Run tree inference based on selected program
            run_name = f"rep_{b}"
            if args.tree_program == "fasttree":
                print(f"    Running FastTree for replicate {b}...")
                tree_path = run_fasttree(bs_file, rep_dir, run_name)
            elif args.tree_program == "iqtree":
                print(f"    Running IQ-TREE for replicate {b} (threads={n_threads})...")
                tree_path = run_iqtree(bs_file, rep_dir, run_name, threads=n_threads)
            else:  # raxml
                print(
                    f"    Running RAxML-NG for replicate {b} (threads={n_threads})..."
                )
                tree_path = run_raxml_tree(
                    bs_file, rep_dir, run_name, seed=args.seed + b, threads=n_threads
                )

            distances.append(
                {"index": b, "distance": dist, "comp": c_rep, "tree_path": tree_path}
            )

        # Sort by distance
        sorted_replicates = sorted(distances, key=lambda x: x["distance"])

        print("  Sorted replicates (first 5):")
        for i in range(5):
            print(
                f"    Rep {sorted_replicates[i]['index']}: Dist={sorted_replicates[i]['distance']:.4f}"
            )

        # Write to file (inside dataset folder)
        out_file = os.path.join(ds_dir, f"bootstrap_order_{ds['name']}.txt")
        with open(out_file, "w") as f:
            f.write("rank\trep_index\tdistance\ttree_path\n")
            for rank, item in enumerate(sorted_replicates):
                f.write(
                    f"{rank}\t{item['index']}\t{item['distance']:.6f}\t{item['tree_path']}\n"
                )
        print(f"  Saved order to {out_file}")

        # Write all trees to a single file (one tree per line, in sorted order)
        all_trees_file = os.path.join(ds_dir, f"all_trees_{ds['name']}.nwk")
        with open(all_trees_file, "w") as f:
            for item in sorted_replicates:
                with open(item["tree_path"], "r") as tree_f:
                    tree_content = tree_f.read().strip()
                    f.write(tree_content + "\n")
        print(f"  Saved all trees to {all_trees_file}\n")

    # Write run log at the end (after all datasets processed)
    log_file = os.path.join(output_base, "run_log.txt")
    write_run_log(log_file, datasets, args, run_info)
    print(f"Run log saved to {log_file}")


if __name__ == "__main__":
    main()
