#!/usr/bin/env python3
"""
Download EPAS1 pipeline inputs (GRCh38) and SRR FastQs.

What this grabs by default:
  1) SRR FastQs for the accession(s) you pass (defaults to SRR1265938) via ENA API
  2) 1000 Genomes GRCh38 chromosome 2 multi-sample VCF (+ .tbi) from UCSC
  3) GENCODE GRCh38 primary assembly FASTA (reference genome)

Optional: pass --skip-1000g or --skip-ref to omit big downloads.

Notes
-----
* SRR1265938 is the accession cited in Zhang et al. 2021 (PNAS) for EPAS1-targeted resequencing of 40 Tibetans.
* 1000G GRCh38 chr2 VCF is the widely used IGSR release mirrored at UCSC.
* Archaic (Altai Denisovan / Neanderthal) GRCh38 VCFs can be fetched from ArcSeqHub (if available) or you can use hg19 VCFs from Max Planck (cdna.eva.mpg.de) and liftover; this script leaves archaics to you for now.

Usage
-----
  python helpers/download.py \
      --out data \
      --srr SRR1265938 \
      --get-1000g \
      --get-ref

  python helpers/download.py --help

This script uses only the Python standard library + `requests` (optional). If `requests`
is not installed, it will fall back to `urllib`.
"""

from __future__ import annotations
import argparse
import hashlib
import os
import textwrap
from typing import List, Tuple, Optional

# Try to import requests for nicer streaming; fall back to urllib
try:
    import requests  # type: ignore
except Exception:
    requests = None  # type: ignore
    import urllib.request
    import urllib.error

# -------------------------------
# Small helpers
# -------------------------------


def safe_mkdir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def md5_of_file(path: str, chunk: int = 1 << 20) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def download(url: str, out_path: str) -> None:
    """Download URL to out_path with basic progress; supports http(s)."""
    # Skip if exists
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        print(f"[skip] {out_path} exists")
        return
    tmp = out_path + ".part"
    # Choose backend
    if requests is not None:
        with requests.get(url, stream=True) as r:  # type: ignore
            r.raise_for_status()
            total = int(r.headers.get("Content-Length") or 0)
            got = 0
            with open(tmp, "wb") as f:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    if chunk:
                        f.write(chunk)
                        got += len(chunk)
                        if total:
                            pct = (got / total) * 100
                            print(
                                f"\r[down] {os.path.basename(out_path)} {got / 1e6:.1f}/{total / 1e6:.1f} MB ({pct:.1f}%)",
                                end="",
                            )
                print()
    else:
        # urllib fallback (no nice progress)
        try:
            with urllib.request.urlopen(url) as r:  # type: ignore
                with open(tmp, "wb") as f:
                    f.write(r.read())
        except urllib.error.URLError as e:  # type: ignore
            raise SystemExit(f"Download failed: {url}\n{e}")
    os.replace(tmp, out_path)
    print(f"[ok] {out_path}")


# -------------------------------
# ENA: resolve SRR -> FastQ URLs
# -------------------------------

ENA_FASTQ_API = "https://www.ebi.ac.uk/ena/browser/api/tsv/"
# We request: fastq_ftp, fastq_md5, submitted_ftp in case fastqs are missing
ENA_FIELDS = [
    "run_accession",
    "fastq_ftp",
    "fastq_md5",
    "fastq_bytes",
    "submitted_ftp",
    "submitted_md5",
]


def ena_fastq_table(srr: str) -> List[dict]:
    """Return a list of dicts with ENA fields for the SRR."""
    import csv
    import io

    url = f"{ENA_FASTQ_API}{srr}?download=true&fields={','.join(ENA_FIELDS)}"
    print(f"[ENA] query: {url}")
    data: str
    if requests is not None:
        r = requests.get(url)  # type: ignore
        r.raise_for_status()
        data = r.text
    else:
        with urllib.request.urlopen(url) as resp:  # type: ignore
            data = resp.read().decode("utf-8")
    # Parse TSV
    lines = data.strip().splitlines()
    if not lines or lines[0].startswith("<html"):
        raise SystemExit(f"ENA API error or no records for {srr}\n{data[:200]}")
    reader = csv.DictReader(io.StringIO(data), delimiter="\t")
    return list(reader)


def parse_fastq_urls(row: dict) -> List[Tuple[str, Optional[str]]]:
    """From one ENA TSV row, return list of (https_url, md5) for FastQs.
    If fastq_ftp is empty, fall back to submitted_ftp.
    """
    urls: List[str] = []
    md5s: List[str] = []
    if row.get("fastq_ftp"):
        urls = row["fastq_ftp"].split(";")
        md5s = (row.get("fastq_md5") or "").split(";")
    elif row.get("submitted_ftp"):
        urls = row["submitted_ftp"].split(";")
        md5s = (row.get("submitted_md5") or "").split(";")
    https_urls = []
    for i, u in enumerate(urls):
        # Ensure https instead of ftp
        if u.startswith("ftp://"):
            u = "https://" + u[len("ftp://") :]
        elif u.startswith("ftps://"):
            u = "https://" + u[len("ftps://") :]
        https_urls.append((u, md5s[i] if i < len(md5s) else None))
    return https_urls


def download_srr_fastqs(srr: str, out_dir: str) -> List[str]:
    safe_mkdir(out_dir)
    rows = ena_fastq_table(srr)
    written: List[str] = []
    for row in rows:
        pairs = parse_fastq_urls(row)
        if not pairs:
            print(
                f"[warn] No FastQ URLs found for {srr}. You may need SRA Toolkit (prefetch/fasterq-dump)."
            )
            continue
        for url, md5 in pairs:
            fname = os.path.basename(url)
            out_path = os.path.join(out_dir, fname)
            download(url, out_path)
            if md5:
                got = md5_of_file(out_path)
                if got.lower() != md5.lower():
                    raise SystemExit(
                        f"MD5 mismatch for {fname}: expected {md5} got {got}"
                    )
            written.append(out_path)
    return written


# -------------------------------
# Main CLI
# -------------------------------


def main():
    ap = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=__doc__,
        epilog=textwrap.dedent(
            """
            Tips:
              • If ENA is missing FastQs for an SRR, install SRA Toolkit and use:
                    prefetch <SRR> && fasterq-dump <SRR> -O data/fastq
              • Archaic VCFs (GRCh38) are available from ArcSeqHub; hg19 VCFs from Max Planck (cdna.eva.mpg.de).
            """
        ),
    )
    ap.add_argument(
        "--out", default="data", help="Base output directory (default: data)"
    )
    ap.add_argument(
        "--srr",
        default="SRR1265938",
        help="Comma-separated SRR accessions to fetch from ENA (default: SRR1265938)",
    )
    ap.add_argument(
        "--get-1000g", action="store_true", help="Download 1000G GRCh38 chr2 VCF + .tbi"
    )
    ap.add_argument(
        "--get-ref",
        action="store_true",
        help="Download GENCODE GRCh38 primary assembly FASTA",
    )

    args = ap.parse_args()

    base = os.path.abspath(args.out)
    d_fastq = os.path.join(base, "fastq")
    d_ref = os.path.join(base, "ref")
    d_vcf = os.path.join(base, "vcf")

    print(f"[setup] out base: {base}")

    # 1) SRR FastQs via ENA
    if args.srr:
        for srr in [s.strip() for s in args.srr.split(",") if s.strip()]:
            print(f"\n=== SRR → FastQ: {srr} ===")
            try:
                written = download_srr_fastqs(srr, d_fastq)
                if written:
                    print("[done] Wrote:\n  - " + "\n  - ".join(written))
            except Exception as e:
                print(f"[error] {srr}: {e}")
                print(
                    "Hint: install SRA Toolkit and use prefetch/fasterq-dump as a fallback."
                )

    # 2) 1000G GRCh38 chr2 VCF from UCSC mirror (IGSR)
    if args.get_1000g:
        safe_mkdir(d_vcf)
        vcf_url = (
            "https://hgdownload.soe.ucsc.edu/gbdb/hg38/1000Genomes/"
            "ALL.chr2.shapeit2_integrated_snvindels_v2a_27022019.GRCh38.phased.vcf.gz"
        )
        tbi_url = vcf_url + ".tbi"
        print("\n=== 1000G GRCh38 chr2 VCF ===")
        download(vcf_url, os.path.join(d_vcf, os.path.basename(vcf_url)))
        download(tbi_url, os.path.join(d_vcf, os.path.basename(tbi_url)))

    # 3) GRCh38 primary assembly FASTA (GENCODE Release 48)
    if args.get_ref:
        safe_mkdir(d_ref)
        fasta_url = (
            "https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_48/"
            "GRCh38.primary_assembly.genome.fa.gz"
        )
        print("\n=== GRCh38 primary assembly (GENCODE) ===")
        out_fa_gz = os.path.join(d_ref, os.path.basename(fasta_url))
        download(fasta_url, out_fa_gz)
        # Also fetch the .fai if present (not guaranteed); if not, user will index with samtools
        try:
            download(fasta_url + ".fai", out_fa_gz + ".fai")
        except Exception:
            print(
                "[info] No .fai on server; remember to run: samtools faidx GRCh38.primary_assembly.genome.fa.gz"
            )

    print("\nAll requested downloads finished.")


if __name__ == "__main__":
    main()
