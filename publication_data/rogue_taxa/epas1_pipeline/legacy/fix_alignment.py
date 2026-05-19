#!/usr/bin/env python3
"""
Fix alignment by ensuring all sequences have the same length
"""
from Bio import SeqIO
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord

# Read all sequences
sequences = {}
for name in ['tibetan', 'han', 'ceu', 'yri', 'denisovan', 'neanderthal']:
    fasta_file = f'out/consensus/{name}.fa'
    try:
        rec = next(SeqIO.parse(fasta_file, 'fasta'))
        sequences[name] = str(rec.seq).upper()
    except:
        print(f"Warning: Could not read {fasta_file}")
        continue

if not sequences:
    print("Error: No sequences found")
    exit(1)

# Find the minimum length to ensure all sequences can be aligned
min_length = min(len(seq) for seq in sequences.values())
print(f"Minimum sequence length: {min_length}")

# Trim all sequences to the same length
aligned_records = []
for name, seq in sequences.items():
    trimmed_seq = seq[:min_length]
    record = SeqRecord(Seq(trimmed_seq), id=name, description="")
    aligned_records.append(record)

# Write the aligned sequences
output_file = 'out/consensus/epas1.aln.fa'
SeqIO.write(aligned_records, output_file, 'fasta')
print(f"Wrote aligned sequences to {output_file}")
print(f"Number of sequences: {len(aligned_records)}")
print(f"Alignment length: {min_length}")