#!/usr/bin/env python3
"""
Consensus Sequence Generator

This script generates consensus FASTA sequences for multiple samples based on VCF files
and a reference genome. It then merges these individual sequences into a single
multi-FASTA alignment file.

The process involves:
1. Reading a YAML configuration file for parameters and sample information.
2. For each sample:
   a. Filtering a source VCF by region, sample ID, and quality metrics (DP, QUAL).
   b. Normalizing the filtered VCF against the reference genome.
   c. Generating a consensus sequence using `bcftools consensus`.
   d. Ensuring the output sequence is in uppercase.
3. Merging all generated consensus FASTA files into a single alignment file.

Requirements:
- Python 3.6+
- PyYAML library (`pip install pyyaml`)
- bcftools, tabix (must be in the system's PATH)
"""
import yaml
import sys
import subprocess as sp
import os
import argparse
from pathlib import Path

def run_command(cmd_list, check=True):
    """Prints and runs a command, raising an error if it fails."""
    print(f"$ {' '.join(cmd_list)}")
    sp.run(cmd_list, check=check)

def generate_consensus_for_sample(name, sample_info, config):
    """
    Generates a single consensus FASTA file for a given sample.
    This function replicates the bcftools pipeline from the original bash script.
    """
    # --- Extract parameters from config ---
    region = config['ref']['region']
    ref_fasta = config['ref']['fasta']
    params = config.get('params', {})
    mask_lowqual = params.get('mask_lowqual', True)
    min_dp = params.get('min_dp', 8)
    min_qual = params.get('min_qual', 30)
    haplotype = params.get('haplotype', '1')

    source_vcf = sample_info.get('source')
    sample_id = sample_info.get('sample_id')

    output_dir = Path("out/consensus")
    output_dir.mkdir(parents=True, exist_ok=True)

    final_fasta = output_dir / f"{name}.fa"
    temp_vcf = output_dir / f"{name}.vcf.gz"

    if not source_vcf:
        print(f"~ Skipping {name}: 'source' not defined.")
        return
    if not os.path.exists(source_vcf):
        print(f"[WARN] Skipping {name}: Source VCF not found at '{source_vcf}'")
        return

    # --- 1. Build bcftools view command ---
    view_cmd = ["bcftools", "view", "-r", region]
    if sample_id:
        view_cmd.extend(["-s", sample_id])

    # Build filter expression
    filt_expr_parts = []
    if mask_lowqual:
        filt_expr_parts.append(f"FMT/DP>={min_dp}")
        filt_expr_parts.append(f"QUAL>={min_qual}")

    if filt_expr_parts:
        filter_expression = " && ".join(filt_expr_parts)
        view_cmd.extend(["-i", filter_expression])

    view_cmd.append(source_vcf)

    # --- 2. Build bcftools norm command ---
    norm_cmd = ["bcftools", "norm", "-f", ref_fasta, "-Oz", "-o", str(temp_vcf)]

    # --- 3. Build bcftools consensus command ---
    # First extract the region from reference
    consensus_cmd = [
        "bcftools", "consensus",
        "-H", str(haplotype),
        "-f", ref_fasta,
        str(temp_vcf)
    ]

    print(f"\n>>> Generating consensus for '{name}'...")

    try:
        # --- Execute the pipeline: view | norm ---
        print("$ " + " ".join(view_cmd) + " | " + " ".join(norm_cmd))
        p_view = sp.Popen(view_cmd, stdout=sp.PIPE)
        p_norm = sp.Popen(norm_cmd, stdin=p_view.stdout, stdout=sp.PIPE)
        p_view.stdout.close() # Allow p_view to receive a SIGPIPE if p_norm exits.
        norm_output, norm_err = p_norm.communicate()
        if p_norm.returncode != 0:
            raise sp.CalledProcessError(p_norm.returncode, norm_cmd, output=norm_output, stderr=norm_err)

        # --- 4. Index the temporary VCF ---
        run_command(["tabix", "-f", str(temp_vcf)])

        # --- 5. Generate consensus and write to FASTA file ---
        # First generate full consensus, then extract region
        print("$ " + " ".join(consensus_cmd) + f" | samtools faidx - {region} > {final_fasta}")

        # Run consensus and pipe to samtools to extract region
        consensus_proc = sp.Popen(consensus_cmd, stdout=sp.PIPE)
        samtools_cmd = ["samtools", "faidx", "-", region]
        with open(final_fasta, 'w') as f_out:
            samtools_proc = sp.Popen(samtools_cmd, stdin=consensus_proc.stdout, stdout=f_out)
            consensus_proc.stdout.close()
            samtools_proc.communicate()
            if samtools_proc.returncode != 0:
                raise sp.CalledProcessError(samtools_proc.returncode, samtools_cmd)

        # --- 6. Fix FASTA format - ensure uppercase sequence ---
        fix_fasta_uppercase(final_fasta)

    except sp.CalledProcessError as e:
        print(f"[ERROR] A command failed while processing '{name}':", file=sys.stderr)
        print(f"  Command: {' '.join(e.cmd)}", file=sys.stderr)
        print(f"  Exit Code: {e.returncode}", file=sys.stderr)
        return # Stop processing this sample
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred while processing '{name}': {e}", file=sys.stderr)
        return

    print(f"✓ Successfully generated: {final_fasta}")


def fix_fasta_uppercase(fasta_path: Path):
    """
    Reads a FASTA file, converts the sequence line(s) to uppercase,
    and overwrites the original file.
    """
    try:
        lines = fasta_path.read_text().splitlines()
        with open(fasta_path, 'w') as f:
            for line in lines:
                if not line.startswith('>'):
                    f.write(line.upper() + '\n')
                else:
                    f.write(line + '\n')
    except Exception as e:
        print(f"[WARN] Could not uppercase FASTA sequence for {fasta_path.name}: {e}")
        print("       Attempting to continue without this fix.")


def merge_fastas(consensus_dir: Path, output_file: Path):
    """
    Merges all individual .fa files in a directory into a single
    multi-FASTA alignment file.
    """
    print("\n>>> Merging consensus sequences...")
    fa_files = sorted(consensus_dir.glob('*.fa'))

    if not fa_files:
        print("[WARN] No consensus FASTA files found to merge.")
        return

    sequence_count = 0
    with open(output_file, 'w') as f_out:
        for fa_file in fa_files:
            sample_name = fa_file.stem
            content = fa_file.read_text().splitlines()
            if len(content) >= 2:
                header = f">{sample_name}"
                sequence = content[1] # Assuming single-line sequence after header
                f_out.write(f"{header}\n{sequence}\n")
                sequence_count += 1
            else:
                print(f"[WARN] Skipping empty or invalid FASTA file: {fa_file.name}")

    print(f"✓ Wrote multi-FASTA alignment to '{output_file}' ({sequence_count} samples)")


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Generate and merge consensus sequences from VCF files."
    )
    parser.add_argument(
        "config_file",
        nargs="?",
        default="config.yaml",
        help="Path to the YAML configuration file (default: config.yaml)"
    )
    args = parser.parse_args()

    # --- Load Configuration ---
    try:
        with open(args.config_file, 'r') as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"[ERROR] Configuration file not found: {args.config_file}", file=sys.stderr)
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"[ERROR] Error parsing YAML file: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Process each sample ---
    for sample_name, sample_info in config.get('samples', {}).items():
        generate_consensus_for_sample(sample_name, sample_info, config)

    # --- Merge all generated FASTA files ---
    output_dir = Path("out/consensus")
    merge_fastas(output_dir, output_dir / "epas1.aln.fa")

    print("\nDone.")


if __name__ == "__main__":
    main()
