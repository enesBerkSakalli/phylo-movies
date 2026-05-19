#!/bin/bash
# Download archaic genome VCFs for EPAS1 analysis

echo "Downloading archaic genome VCFs (Denisovan and Neanderthal)..."

mkdir -p data/archaic

# Altai Denisovan - chromosome 2
echo "Downloading Altai Denisovan chr2..."
wget -c -O data/archaic/DenisovaPinky.chr2.hg19.vcf.gz \
  "http://cdna.eva.mpg.de/neandertal/altai/Denisovan/DenisovaPinky.hg19_1000g.2.mod.vcf.gz"

wget -c -O data/archaic/DenisovaPinky.chr2.hg19.vcf.gz.tbi \
  "http://cdna.eva.mpg.de/neandertal/altai/Denisovan/DenisovaPinky.hg19_1000g.2.mod.vcf.gz.tbi"

# Altai Neanderthal - chromosome 2
echo "Downloading Altai Neanderthal chr2..."
wget -c -O data/archaic/AltaiNeandertal.chr2.hg19.vcf.gz \
  "http://cdna.eva.mpg.de/neandertal/altai/AltaiNeandertal/VCF/AltaiNea.hg19_1000g.2.mod.vcf.gz"

wget -c -O data/archaic/AltaiNeandertal.chr2.hg19.vcf.gz.tbi \
  "http://cdna.eva.mpg.de/neandertal/altai/AltaiNeandertal/VCF/AltaiNea.hg19_1000g.2.mod.vcf.gz.tbi"

echo "Done! Archaic VCFs downloaded to data/archaic/"
echo "Note: These are hg19/GRCh37 coordinates - will need liftover to GRCh38 for the pipeline"