#!/usr/bin/env python3
"""Convert TSV metadata to CSV with renamed sequence IDs."""

import csv
import re


def clean_strain(strain):
    """Clean strain name for use in sequence ID."""
    strain = re.sub(r"[/()]", "_", strain)
    strain = re.sub(r"_+", "_", strain)
    return strain.strip("_")


def clean_ptype(ptype):
    """Remove GII./GI./GV. prefix from P-type."""
    return re.sub(r"^G[IV]+\.", "", ptype)


def create_new_id(row):
    """Create descriptive sequence ID."""
    strain = clean_strain(row.get("strain", ""))
    year = row.get("date", "")[:4]
    country = row.get("country", "")
    gtype = row.get("VP1_type", "")
    ptype = clean_ptype(row.get("RdRp_type", ""))

    if gtype and ptype:
        return f"{strain}|{gtype}[{ptype}]|{country}|{year}"
    elif gtype:
        return f"{strain}|{gtype}|{country}|{year}"
    else:
        return f"{strain}|{country}|{year}"


# Read TSV and write CSV
with open("subsampled_350_metadata.tsv", "r") as tsv_in:
    reader = csv.DictReader(tsv_in, delimiter="\t")

    with open("subsampled_350_metadata.csv", "w", newline="") as csv_out:
        # Use 'taxon' as first column (standard for phylogenetic tools)
        fieldnames = ["taxon"] + reader.fieldnames
        writer = csv.DictWriter(csv_out, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            row["taxon"] = create_new_id(row)
            writer.writerow(row)

print("Created subsampled_350_metadata.csv")
print(f"Columns: {len(fieldnames)}")
