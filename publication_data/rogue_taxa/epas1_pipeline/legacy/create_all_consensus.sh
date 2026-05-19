#!/bin/bash
# Create consensus sequences for all samples

set -euo pipefail

REGION="chr2:46290000-46390000"
REF="data/ref/GRCh38.primary_assembly.genome.fa"

echo "Creating consensus sequences for EPAS1 region..."
mkdir -p out/consensus

# 1. Tibetan from SRR1265938
echo "Creating Tibetan consensus..."
samtools faidx $REF $REGION | bcftools consensus data/fastq/SRR1265938.epas1.win.vcf.gz > out/consensus/tibetan.fa
sed -i '' 's/>chr2:46290000-46390000/>tibetan/' out/consensus/tibetan.fa

# 2. 1000 Genomes samples (VCF uses "2" not "chr2")
VCF_1000G="data/vcf/ALL.chr2.shapeit2_integrated_snvindels_v2a_27022019.GRCh38.phased.vcf.gz"
REGION_1000G="2:46290000-46390000"

echo "Creating Han consensus (HG00436)..."
# First extract and fix chromosome naming
bcftools view -r $REGION_1000G -s HG00436 $VCF_1000G | sed 's/^2\t/chr2\t/' | bcftools view -Oz -o out/consensus/han.vcf.gz
tabix -p vcf out/consensus/han.vcf.gz
samtools faidx $REF $REGION | bcftools consensus -H 1 out/consensus/han.vcf.gz > out/consensus/han.fa
sed -i '' 's/>chr2:46290000-46390000/>han/' out/consensus/han.fa

echo "Creating CEU consensus (NA12878)..."
bcftools view -r $REGION_1000G -s NA12878 $VCF_1000G | sed 's/^2\t/chr2\t/' | bcftools view -Oz -o out/consensus/ceu.vcf.gz
tabix -p vcf out/consensus/ceu.vcf.gz
samtools faidx $REF $REGION | bcftools consensus -H 1 out/consensus/ceu.vcf.gz > out/consensus/ceu.fa
sed -i '' 's/>chr2:46290000-46390000/>ceu/' out/consensus/ceu.fa

echo "Creating YRI consensus (NA19238)..."
bcftools view -r $REGION_1000G -s NA19238 $VCF_1000G | sed 's/^2\t/chr2\t/' | bcftools view -Oz -o out/consensus/yri.vcf.gz
tabix -p vcf out/consensus/yri.vcf.gz
samtools faidx $REF $REGION | bcftools consensus -H 1 out/consensus/yri.vcf.gz > out/consensus/yri.fa
sed -i '' 's/>chr2:46290000-46390000/>yri/' out/consensus/yri.fa

# 3. Archaic genomes (these are in hg19 coordinates)
# For now, we'll use the reference for these regions as placeholders
# In production, you'd need to liftover or use hg19 reference

echo "Creating Denisovan consensus (using reference as placeholder for now)..."
samtools faidx $REF $REGION > out/consensus/denisovan.fa
sed -i '' 's/>chr2:46290000-46390000/>denisovan/' out/consensus/denisovan.fa

echo "Creating Neanderthal consensus (using reference as placeholder for now)..."
samtools faidx $REF $REGION > out/consensus/neanderthal.fa
sed -i '' 's/>chr2:46290000-46390000/>neanderthal/' out/consensus/neanderthal.fa

# Report sequence lengths
echo ""
echo "Checking sequence lengths:"
for sample in tibetan han ceu yri denisovan neanderthal; do
    echo -n "${sample}: "
    grep -v ">" out/consensus/${sample}.fa | tr -d '\n' | wc -c
done

echo ""
echo "Consensus sequences created in out/consensus/"

# Create aligned multi-FASTA
echo ""
echo "Creating aligned multi-FASTA..."
python3 -c "
from Bio import SeqIO
samples = ['tibetan', 'han', 'ceu', 'yri', 'denisovan', 'neanderthal']
seqs = {}
for s in samples:
    rec = list(SeqIO.parse(f'out/consensus/{s}.fa', 'fasta'))[0]
    seqs[s] = str(rec.seq)
min_len = min(len(seq) for seq in seqs.values())
print(f'Aligning to {min_len} bp')
with open('out/consensus/epas1.aln.fa', 'w') as out:
    for s in samples:
        out.write(f'>{s}\n{seqs[s][:min_len]}\n')
print(f'Created epas1.aln.fa with {len(samples)} sequences')
"