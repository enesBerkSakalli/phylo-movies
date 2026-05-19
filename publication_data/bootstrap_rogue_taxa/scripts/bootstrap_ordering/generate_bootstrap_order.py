import os
import subprocess
import glob
import argparse
import hashlib
import json
import math
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
from datetime import datetime

from order_schema import ORDERING_FIELDNAMES, ORDERING_SEMANTICS


DEFAULT_BOOTSTRAP_SOURCE_ROOT = os.environ.get(
    "BOOTSTRAP_SOURCE_ROOT",
    os.path.join("publication_data", "bootstrap_rogue_taxa", "source_alignments"),
)
DEFAULT_DATASET_FILES = {
    "24": os.environ.get(
        "BOOTSTRAP_DATASET_24",
        "aberer_roguenarok_dataset_24_taxa24_sites14190.phy",
    ),
    "125": os.environ.get(
        "BOOTSTRAP_DATASET_125",
        "aberer_roguenarok_dataset_125_taxa125_sites29149.phy",
    ),
}
COMPOSITION_LABELS = ["A", "C", "G", "T", "AMBIGUOUS_OR_GAP"]
AMBIGUOUS_OR_GAP = set("RYSWKMBDHVN-?.")


def safe_slug(value):
    safe = []
    for char in str(value):
        if char.isalnum() or char in ("-", "_", "."):
            safe.append(char)
        else:
            safe.append("-")
    return "".join(safe).strip("-") or "unnamed"


def format_run_timestamp():
    return datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")


def build_run_id(args, datasets, timestamp):
    dataset_part = "-".join(safe_slug(ds["name"]) for ds in datasets)
    method = args.tree_program
    if args.tree_program == "iqtree":
        method = f"iqtree-{args.iqtree_mode}"
    pieces = [
        f"run_{timestamp}",
        safe_slug(method),
        f"bs{args.n_replicates:03d}",
        f"seed{args.seed}",
        f"ds{dataset_part}",
    ]
    if args.run_label:
        pieces.append(safe_slug(args.run_label))
    return "_".join(pieces)


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


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


def tool_version(executable, version_args):
    try:
        result = subprocess.run(
            [executable, *version_args],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception as e:
        return {"executable": executable, "error": str(e)}

    output = "\n".join(part.strip() for part in (result.stdout, result.stderr) if part.strip())
    return {
        "executable": executable,
        "returncode": result.returncode,
        "output": output.splitlines()[:8],
    }


def check_tool(executable, label):
    if shutil.which(executable) is None:
        raise SystemExit(
            f"Missing required tool for this run: {label} ({executable}). "
            "Install it or pass the matching --*-bin option."
        )


def parse_datasets(dataset_args, source_root):
    selected = dataset_args or ["24", "125"]
    datasets = []
    for item in selected:
        if "=" in item:
            name, path = item.split("=", 1)
            if not os.path.isabs(path):
                path = os.path.join(source_root, path)
        else:
            name = item
            path = os.path.join(source_root, item)
            if not os.path.exists(path) and item in DEFAULT_DATASET_FILES:
                path = os.path.join(source_root, DEFAULT_DATASET_FILES[item])
        datasets.append({"name": name, "path": path})
    return datasets


def generate_bootstrap_alignments(
    alignment_path, output_dir, n_replicates, seed=42, raxml_hpc_bin="raxmlHPC"
):
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
        raxml_hpc_bin,
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

    if len(bootstrap_files) != n_replicates:
        raise RuntimeError(
            f"Expected {n_replicates} bootstrap alignments, found {len(bootstrap_files)} "
            f"in {output_dir}"
        )

    return bootstrap_files


def run_fasttree(alignment_path, output_dir, run_name, fasttree_bin="FastTree"):
    """
    Runs FastTree on a given alignment.
    Fastest option for tree inference.
    Returns the path to the tree file.
    """
    tree_path = os.path.join(output_dir, f"{run_name}.treefile")

    # Convert PHYLIP to FASTA for FastTree input.
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
    cmd = [fasttree_bin, "-gtr", "-gamma", "-nt", "-mlacc", "2", "-slownni", "-nosupport", "-quiet"]
    with open(fasta_path, "r") as fasta_in, open(tree_path, "w") as tree_out:
        result = subprocess.run(cmd, stdin=fasta_in, stdout=tree_out, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"FastTree failed: {result.stderr}")
        raise RuntimeError(f"FastTree failed for {alignment_path}")

    return tree_path


def run_iqtree(
    alignment_path,
    output_dir,
    run_name,
    model="GTR+G",
    threads=1,
    iqtree_bin="iqtree2",
    iqtree_mode="default",
    seed=42,
):
    """
    Runs IQ-TREE on a given alignment.
    Returns the path to the best tree.
    """
    prefix = os.path.join(output_dir, run_name)

    # Clean up any previous iqtree output files
    for f in glob.glob(f"{prefix}.*"):
        os.remove(f)

    cmd = [
        iqtree_bin,
        "-s",
        alignment_path,
        "-st",
        "DNA",
        "-m",
        model,
        "-pre",
        prefix,
        "-T",
        str(threads),
        "-seed",
        str(seed),
        "-quiet",
        "--redo",
    ]
    if iqtree_mode == "fast":
        cmd.insert(-2, "-fast")

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
        f.write(f"Run ID: {run_info['run_id']}\n")
        f.write(f"Output directory: {run_info['output_dir']}\n\n")

        f.write("PARAMETERS\n")
        f.write("-" * 40 + "\n")
        f.write(f"Tree inference program: {args.tree_program}\n")
        if args.tree_program == "iqtree":
            f.write(f"IQ-TREE mode: {args.iqtree_mode}\n")
        f.write(f"Number of bootstrap replicates: {args.n_replicates}\n")
        f.write(f"Random seed: {args.seed}\n")
        f.write(f"Number of threads per inference job: {args.threads}\n")
        f.write(f"Parallel replicate jobs: {args.jobs}\n\n")

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
                    f"    Original composition (A,C,G,T,AmbiguousOrGap): {ds['composition']}\n"
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
        elif args.tree_program == "iqtree":
            f.write("Program: IQ-TREE 2\n")
            f.write(f"Model: GTR+G; mode: {args.iqtree_mode}\n")
            f.write("Command pattern: iqtree2 -s <replicate_alignment> -st DNA -m GTR+G -T <threads> -seed <seed> -pre <prefix> -quiet --redo\n")
            if args.iqtree_mode == "fast":
                f.write("Additional flag: -fast\n")
        f.write("\n")

        f.write("OUTPUT FILES\n")
        f.write("-" * 40 + "\n")
        f.write("Run-level files:\n")
        f.write("  - RUN_MANIFEST.json: Machine-readable run provenance\n")
        f.write("  - run_log.txt: Human-readable run summary\n")
        f.write("Per dataset folder:\n")
        f.write("  - DATASET_MANIFEST.json: Dataset-level provenance\n")
        f.write(
            "  - ranked/composition_ranked_bootstrap_replicates_<name>.tsv: Semantic ordering table\n"
        )
        f.write("  - ranked/all_trees_<name>.nwk: All trees in ranked order (one per line)\n")
        f.write("  - bootstrap_alignments/bootstrap.BS<N>: Bootstrap replicate alignments\n")
        f.write("  - trees/rep_<NNNNNN>/: Per-replicate tree inference files\n")


def write_json(path, payload):
    with open(path, "w") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(
        description="Generate bootstrap replicates, infer trees, and rank by composition distance"
    )
    parser.add_argument(
        "--tree-program",
        choices=["fasttree", "iqtree"],
        default="iqtree",
        help="Tree inference program (default: iqtree)",
    )
    parser.add_argument(
        "--iqtree-mode",
        choices=["default", "fast"],
        default="default",
        help="IQ-TREE search mode. Use 'fast' only for exploratory/smoke runs.",
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
        "--jobs",
        type=int,
        default=1,
        help="Number of replicate tree-inference jobs to run concurrently (default: 1).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--source-root",
        default=DEFAULT_BOOTSTRAP_SOURCE_ROOT,
        help="Directory containing selected Aberer/RogueNaRok source alignment files.",
    )
    parser.add_argument(
        "--dataset",
        action="append",
        default=None,
        help="Dataset ID under --source-root, or NAME=PATH. Repeatable. Default: 24 and 125.",
    )
    parser.add_argument(
        "--output-base",
        default=os.path.join("publication_data", "bootstrap_rogue_taxa", "runs"),
        help="Base output directory. A timestamped run directory is created inside it.",
    )
    parser.add_argument(
        "--run-label",
        default=None,
        help="Optional short label appended to the timestamped run directory name.",
    )
    parser.add_argument(
        "--raxml-hpc-bin",
        default="raxmlHPC",
        help="RAxML 8 executable used for -f j bootstrap-alignment generation.",
    )
    parser.add_argument(
        "--iqtree-bin",
        default="iqtree2",
        help="IQ-TREE 2 executable.",
    )
    parser.add_argument(
        "--fasttree-bin",
        default="FastTree",
        help="FastTree executable for optional exploratory runs.",
    )
    args = parser.parse_args()

    if args.n_replicates < 1:
        raise SystemExit("--n-replicates must be at least 1.")
    if args.threads < 1:
        raise SystemExit("--threads must be at least 1.")
    if args.jobs < 1:
        raise SystemExit("--jobs must be at least 1.")

    check_tool(args.raxml_hpc_bin, "RAxML 8 raxmlHPC")
    if args.tree_program == "iqtree":
        check_tool(args.iqtree_bin, "IQ-TREE 2")
    elif args.tree_program == "fasttree":
        check_tool(args.fasttree_bin, "FastTree")

    datasets = parse_datasets(args.dataset, args.source_root)

    timestamp = format_run_timestamp()
    run_id = build_run_id(args, datasets, timestamp)
    output_base = os.path.join(args.output_base, run_id)
    ensure_dir(output_base)
    print(f"Output directory: {output_base}")

    # Prepare run info for logging
    run_info = {
        "timestamp": timestamp,
        "run_id": run_id,
        "output_dir": output_base,
    }
    run_manifest = {
        "schema_version": "1.0",
        "run_id": run_id,
        "timestamp_local": timestamp,
        "source_root": os.path.abspath(args.source_root),
        "tree_program": args.tree_program,
        "iqtree_mode": args.iqtree_mode if args.tree_program == "iqtree" else None,
        "n_replicates": args.n_replicates,
        "seed": args.seed,
        "threads": args.threads,
        "jobs": args.jobs,
        "tool_versions": {
            "raxml_hpc": tool_version(args.raxml_hpc_bin, ["-v"]),
            "iqtree": tool_version(args.iqtree_bin, ["--version"]) if args.tree_program == "iqtree" else None,
            "fasttree": tool_version(args.fasttree_bin, ["-help"]) if args.tree_program == "fasttree" else None,
        },
        "datasets": [],
        "outputs": {
            "run_log": "run_log.txt",
            "run_manifest": "RUN_MANIFEST.json",
        },
    }

    for ds in datasets:
        print(f"Processing {ds['name']}...")
        if not os.path.exists(ds["path"]):
            raise FileNotFoundError(f"Dataset {ds['name']} not found: {ds['path']}")

        try:
            names, sequences = read_phylip_alignment(ds["path"])
        except Exception as e:
            raise RuntimeError(f"Error reading alignment for dataset {ds['name']}: {e}") from e

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
        ds_slug = safe_slug(ds["name"])
        source_slug = safe_slug(os.path.basename(ds["path"]))
        dataset_label = f"dataset_{ds_slug}_source-{source_slug}_taxa{n_taxa}_sites{n_sites}"
        output_label = f"{ds_slug}_source-{source_slug}_taxa{n_taxa}_sites{n_sites}"
        ds_dir = os.path.join(output_base, dataset_label)
        bootstrap_dir = os.path.join(ds_dir, "bootstrap_alignments")
        trees_dir = os.path.join(ds_dir, "trees")
        ranked_dir = os.path.join(ds_dir, "ranked")
        ensure_dir(bootstrap_dir)
        ensure_dir(trees_dir)
        ensure_dir(ranked_dir)

        # Generate bootstrap alignments using RAxML
        print(f"  Generating {n_replicates} bootstrap alignments with RAxML...")
        bootstrap_files = generate_bootstrap_alignments(
            ds["path"], bootstrap_dir, n_replicates, seed=args.seed, raxml_hpc_bin=args.raxml_hpc_bin
        )
        print(f"  Generated {len(bootstrap_files)} bootstrap alignments.")

        def process_replicate(b, bs_file):
            # Read the bootstrap alignment to calculate composition.
            _, bs_alg_array = read_phylip_alignment(bs_file)

            c_rep = calculate_composition(bs_alg_array)

            # Euclidean distance
            dist = euclidean_distance(c_rep, c_orig)

            # Create directory for this replicate
            rep_label = f"rep_{b:06d}"
            rep_dir = os.path.join(trees_dir, rep_label)
            ensure_dir(rep_dir)

            # Run tree inference based on selected program
            run_name = rep_label
            if args.tree_program == "fasttree":
                print(f"    Running FastTree for replicate {b}...")
                tree_path = run_fasttree(bs_file, rep_dir, run_name, fasttree_bin=args.fasttree_bin)
            elif args.tree_program == "iqtree":
                print(f"    Running IQ-TREE for replicate {b} (threads={n_threads})...")
                tree_path = run_iqtree(
                    bs_file,
                    rep_dir,
                    run_name,
                    threads=n_threads,
                    iqtree_bin=args.iqtree_bin,
                    iqtree_mode=args.iqtree_mode,
                    seed=args.seed + b,
                )
            else:
                raise RuntimeError(f"Unsupported tree program: {args.tree_program}")

            return {"index": b, "distance": dist, "comp": c_rep, "tree_path": tree_path}

        if args.jobs > 1:
            print(f"  Running tree inference with {args.jobs} concurrent replicate jobs.")
            with ThreadPoolExecutor(max_workers=args.jobs) as executor:
                future_to_index = {
                    executor.submit(process_replicate, b, bs_file): b
                    for b, bs_file in enumerate(bootstrap_files)
                }
                for future in as_completed(future_to_index):
                    b = future_to_index[future]
                    try:
                        distances.append(future.result())
                    except Exception as e:
                        print(f"    Error processing bootstrap {b}: {e}")
                        raise
        else:
            for b, bs_file in enumerate(bootstrap_files):
                try:
                    distances.append(process_replicate(b, bs_file))
                except Exception as e:
                    print(f"    Error processing bootstrap {b}: {e}")
                    raise

        # Sort by distance, then replicate index for deterministic ties.
        sorted_replicates = sorted(distances, key=lambda x: (x["distance"], x["index"]))

        print(f"  Sorted replicates (first {min(5, len(sorted_replicates))}):")
        for i in range(min(5, len(sorted_replicates))):
            print(
                f"    Rep {sorted_replicates[i]['index']}: Dist={sorted_replicates[i]['distance']:.4f}"
            )

        # Write to file (inside dataset folder)
        out_file = os.path.join(ranked_dir, f"composition_ranked_bootstrap_replicates_{output_label}.tsv")
        with open(out_file, "w") as f:
            f.write("\t".join(ORDERING_FIELDNAMES) + "\n")
            for display_order, item in enumerate(sorted_replicates, start=1):
                f.write(
                    f"{display_order}\t"
                    f"{display_order}\t"
                    f"BS{item['index']}\t"
                    f"{item['index']}\t"
                    f"bootstrap.BS{item['index']}\t"
                    f"{item['distance']:.6f}\t"
                    "composition_distance_to_source_alignment\t"
                    "ascending\n"
                )
        print(f"  Saved order to {out_file}")

        # Write all trees to a single file (one tree per line, in sorted order)
        all_trees_file = os.path.join(ranked_dir, f"all_trees_{output_label}.nwk")
        with open(all_trees_file, "w") as f:
            for item in sorted_replicates:
                with open(item["tree_path"], "r") as tree_f:
                    tree_content = tree_f.read().strip()
                    f.write(tree_content + "\n")
        print(f"  Saved all trees to {all_trees_file}\n")

        dataset_manifest = {
            "schema_version": "1.0",
            "dataset": ds["name"],
            "source_file_basename": os.path.basename(ds["path"]),
            "dataset_label": dataset_label,
            "dataset_directory": os.path.relpath(ds_dir, output_base),
            "source_alignment": os.path.abspath(ds["path"]),
            "source_alignment_relative_to_source_root": os.path.relpath(
                os.path.abspath(ds["path"]), os.path.abspath(args.source_root)
            ),
            "source_alignment_sha256": sha256_file(ds["path"]),
            "n_taxa": n_taxa,
            "n_sites": n_sites,
            "composition_labels": COMPOSITION_LABELS,
            "original_composition": c_orig,
            "bootstrap_alignment_directory": os.path.relpath(bootstrap_dir, ds_dir),
            "tree_directory": os.path.relpath(trees_dir, ds_dir),
            "ranked_outputs": {
                "composition_ranked_bootstrap_replicates": os.path.relpath(out_file, ds_dir),
                "composition_ranked_bootstrap_replicates_sha256": sha256_file(out_file),
                "all_trees": os.path.relpath(all_trees_file, ds_dir),
                "all_trees_sha256": sha256_file(all_trees_file),
            },
            "ordering_semantics": ORDERING_SEMANTICS,
            "tree_program": args.tree_program,
            "iqtree_mode": args.iqtree_mode if args.tree_program == "iqtree" else None,
            "n_replicates_requested": n_replicates,
            "n_replicates_completed": len(sorted_replicates),
            "seed": args.seed,
            "threads": args.threads,
            "jobs": args.jobs,
        }
        dataset_manifest_path = os.path.join(ds_dir, "DATASET_MANIFEST.json")
        write_json(dataset_manifest_path, dataset_manifest)
        run_manifest["datasets"].append(dataset_manifest)

    # Write run log at the end (after all datasets processed)
    write_json(os.path.join(output_base, "RUN_MANIFEST.json"), run_manifest)
    log_file = os.path.join(output_base, "run_log.txt")
    write_run_log(log_file, datasets, args, run_info)
    print(f"Run log saved to {log_file}")


if __name__ == "__main__":
    main()
