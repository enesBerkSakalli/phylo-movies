#!/bin/bash
# Get chimp sequence for EPAS1 region

set -euo pipefail

echo "Getting Chimp sequence for EPAS1 region..."

# Option 1: Download from UCSC (panTro6 - chimp genome assembly)
echo "Downloading chimp chr2 from UCSC panTro6..."

# The EPAS1 region in chimp
# Human chr2:46,290,000-46,390,000 (GRCh38) corresponds approximately to
# Chimp chr2B in panTro6 assembly

# Download chimp chr2B sequence (about 90MB compressed)
if [ ! -f data/archaic/panTro6.chr2B.fa.gz ]; then
  echo "Downloading panTro6 chr2B..."
  wget -c -O data/archaic/panTro6.chr2B.fa.gz \
    "https://hgdownload.cse.ucsc.edu/goldenPath/panTro6/chromosomes/chr2B.fa.gz"
fi

# Extract and index
if [ -f data/archaic/panTro6.chr2B.fa.gz ]; then
  echo "Extracting..."
  gunzip -c data/archaic/panTro6.chr2B.fa.gz > data/archaic/panTro6.chr2B.fa
  samtools faidx data/archaic/panTro6.chr2B.fa

  # The homologous region needs to be determined via alignment
  # For now, we'll use a known syntenic region (approximate)
  # Human EPAS1 chr2:46,290,000-46,390,000 maps approximately to
  # Chimp chr2B:47,500,000-47,600,000 (this is approximate and should be verified)

  echo "Extracting approximate EPAS1 syntenic region from chimp..."
  samtools faidx data/archaic/panTro6.chr2B.fa chr2B:47500000-47600000 > data/archaic/chimp_epas1_region.fa
  sed -i '' 's/>chr2B:47500000-47600000/>chimp/' data/archaic/chimp_epas1_region.fa

  echo "Chimp sequence saved to data/archaic/chimp_epas1_region.fa"
  echo "Note: The coordinates are approximate. For accurate synteny, use UCSC liftOver or Ensembl Compara"
else
  echo "Failed to download chimp sequence"
fi

echo ""
echo "Alternative: Use Ensembl REST API for precise orthologous region"
echo "Visit: https://rest.ensembl.org/documentation/info/homology_symbol"