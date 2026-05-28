#!/usr/bin/env python3
"""Select the locked Phylo-Movies norovirus snapshot from Nextstrain ingest output."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Filter Nextstrain norovirus ingest outputs to locked accession versions."
    )
    parser.add_argument("--accession-versions", required=True, type=Path)
    parser.add_argument("--nextstrain-sequences", required=True, type=Path)
    parser.add_argument("--nextstrain-metadata", required=True, type=Path)
    parser.add_argument("--output-sequences", required=True, type=Path)
    parser.add_argument("--output-metadata", required=True, type=Path)
    args = parser.parse_args()

    locked_versions = read_locked_versions(args.accession_versions)
    metadata_rows, fieldnames = read_metadata(args.nextstrain_metadata)
    sequences = read_fasta(args.nextstrain_sequences)

    metadata_by_version = {row["accession_version"]: row for row in metadata_rows}
    missing_metadata = [version for version in locked_versions if version not in metadata_by_version]
    if missing_metadata:
        raise SystemExit(
            "Missing locked accession versions in Nextstrain metadata: "
            + ", ".join(missing_metadata[:10])
        )

    args.output_metadata.parent.mkdir(parents=True, exist_ok=True)
    args.output_sequences.parent.mkdir(parents=True, exist_ok=True)

    with args.output_metadata.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        for version in locked_versions:
            writer.writerow(metadata_by_version[version])

    with args.output_sequences.open("w") as handle:
        for version in locked_versions:
            accession = version.split(".", 1)[0]
            sequence = sequences.get(version) or sequences.get(accession)
            if sequence is None:
                raise SystemExit(f"Missing locked accession in Nextstrain FASTA: {version}")
            handle.write(f">{accession}\n")
            for index in range(0, len(sequence), 80):
                handle.write(sequence[index : index + 80] + "\n")

    return 0


def read_locked_versions(path: Path) -> list[str]:
    versions = [line.strip() for line in path.read_text().splitlines() if line.strip()]
    if len(set(versions)) != len(versions):
        raise SystemExit(f"Duplicate accession versions in {path}")
    return versions


def read_metadata(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])
    if "accession_version" not in fieldnames:
        raise SystemExit(f"{path} is missing accession_version column")
    return rows, fieldnames


def read_fasta(path: Path) -> dict[str, str]:
    records: dict[str, str] = {}
    current_id: str | None = None
    chunks: list[str] = []

    def flush() -> None:
        if current_id is not None:
            records[current_id] = "".join(chunks)

    for line in path.read_text().splitlines():
        if line.startswith(">"):
            flush()
            current_id = line[1:].split()[0]
            chunks = []
        else:
            chunks.append(line.strip())
    flush()
    return records


if __name__ == "__main__":
    raise SystemExit(main())
