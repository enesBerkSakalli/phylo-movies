#!/usr/bin/env python3
"""
Rename sequences and create metadata with simple IDs: accession|Gtype|Ptype

Usage:
    python3 rename_sequences.py

Input files:
    - subsampled_350_metadata.tsv
    - subsampled_350_gappyout.fasta

Output files:
    - subsampled_350_renamed.fasta
    - subsampled_350_metadata.csv
"""

import csv
import re


def clean_ptype(ptype):
    """Remove GII./GI./GV. prefix from P-type to get just P## format."""
    if not ptype:
        return ""
    # GII.P16 -> P16, GI.P1 -> P1, GI.PNA4 -> PNA4, etc.
    match = re.search(r"P[A-Z]*\d+", ptype)
    return match.group(0) if match else ptype


def extract_gtype_from_strain(strain):
    """Extract G-type from strain name patterns like GI.Pb-GI.6 or GI.P4-GI.4"""
    if not strain:
        return ""
    # Look for patterns like GI.6, GII.17, GIII.2, GV.1 (after a dash or slash)
    # Priority: after dash like "-GI.6" or at end
    match = re.search(r"[-/](G[IV]+)\.(\d+)", strain)
    if match:
        return f"{match.group(1)}.{match.group(2)}"
    # Also check for standalone GIII (bovine norovirus)
    match = re.search(r"\b(GIII)\b", strain)
    if match:
        return "GIII"
    return ""


def create_taxon_id(accession, gtype, ptype):
    """Create simple taxon ID: accession_Ptype_G-number"""
    ptype_clean = clean_ptype(ptype)
    # Convert GII.17 -> GII-17
    gtype_clean = gtype.replace(".", "-") if gtype else ""

    if gtype_clean and ptype_clean:
        return f"{accession}_{ptype_clean}_{gtype_clean}"
    elif ptype_clean:
        return f"{accession}_{ptype_clean}"
    elif gtype_clean:
        return f"{accession}_{gtype_clean}"
    else:
        return accession


def main():
    # Step 1: Read FULL metadata and create ID mapping
    print("Reading full_genome_metadata.tsv...")
    id_map = {}
    metadata_rows = []

    with open("full_genome_metadata.tsv", "r") as f:
        reader = csv.DictReader(f, delimiter="\t")
        fieldnames = reader.fieldnames

        for row in reader:
            acc = row["accession"]
            strain = row.get("strain", "")
            # Use VP1_type first, fallback to ORF2_type, then parse from strain
            gtype = (
                row.get("VP1_type", "")
                or row.get("ORF2_type", "")
                or extract_gtype_from_strain(strain)
            )
            ptype = row.get("RdRp_type", "")

            taxon = create_taxon_id(acc, gtype, ptype)
            id_map[acc] = taxon
            row["taxon"] = taxon
            metadata_rows.append(row)

    print(f"  Loaded {len(id_map)} sequences from full metadata")

    # Step 2: Get list of accessions in FASTA
    print("Reading FASTA accessions...")
    fasta_accessions = set()
    with open("subsampled_350_gappyout.fasta", "r") as f:
        for line in f:
            if line.startswith(">"):
                acc = line[1:].strip().split()[0]
                fasta_accessions.add(acc)
    print(f"  Found {len(fasta_accessions)} sequences in FASTA")

    # Step 3: Filter metadata to only include FASTA sequences
    filtered_rows = [
        row for row in metadata_rows if row["accession"] in fasta_accessions
    ]
    print(f"  Filtered to {len(filtered_rows)} sequences with metadata")

    # Step 4: Write CSV metadata (only for sequences in FASTA)
    print("Writing metadata CSV...")
    with open("subsampled_350_metadata.csv", "w", newline="") as f:
        csv_fieldnames = ["taxon"] + list(fieldnames)
        writer = csv.DictWriter(f, fieldnames=csv_fieldnames)
        writer.writeheader()
        writer.writerows(filtered_rows)

    # Step 5: Rename FASTA sequences (gappyout version)
    print("Renaming FASTA sequences (gappyout)...")
    with open("subsampled_350_gappyout.fasta", "r") as fin:
        with open("subsampled_350_gappyout_final.fasta", "w") as fout:
            for line in fin:
                if line.startswith(">"):
                    acc = line[1:].strip().split()[0]
                    new_id = id_map.get(acc, acc)
                    fout.write(f">{new_id}\n")
                else:
                    fout.write(line)

    # Show examples
    print("\n=== Sample taxon IDs ===")
    for i, (acc, taxon) in enumerate(list(id_map.items())[:10]):
        print(f"  {taxon}")

    print(f"\nCreated:")
    print(f"  - subsampled_350_gappyout_final.fasta")
    print(f"  - subsampled_350_metadata.csv")


if __name__ == "__main__":
    main()
