#!/bin/bash
# Download Vindija Neanderthal and Chimp sequences

set -euo pipefail

echo "Downloading additional archaic genomes..."

# 1. Vindija Neanderthal (from Max Planck)
echo "Downloading Vindija Neanderthal chr2 (4.3GB)..."
echo "This is the full chromosome 2 VCF, similar to the other archaic genomes"

# Check if already exists or partially downloaded
if [ -f data/archaic/VindijaNeandertal.chr2.hg19.vcf.gz ]; then
  echo "File already exists or partially downloaded"
  ls -lh data/archaic/VindijaNeandertal.chr2.hg19.vcf.gz
else
  wget -c -O data/archaic/VindijaNeandertal.chr2.hg19.vcf.gz \
    "http://cdna.eva.mpg.de/neandertal/Vindija/VCF/Vindija33.19/chr2_mq25_mapab100.vcf.gz"

  # Index it
  if [ -f data/archaic/VindijaNeandertal.chr2.hg19.vcf.gz ]; then
    echo "Indexing Vindija VCF..."
    tabix -p vcf data/archaic/VindijaNeandertal.chr2.hg19.vcf.gz
  fi
fi

# 2. For Chimp, we have several options:

# Option A: Download from Ensembl (panTro6/GRCh38 aligned)
echo ""
echo "For Chimp sequence, we have several options:"
echo "1. Use Ensembl REST API to get chimp sequence for syntenic region"
echo "2. Download chimp genome and extract region"
echo "3. Use UCSC liftOver to map coordinates"

# Let's try Ensembl REST API for the syntenic region
echo ""
echo "Fetching Chimp sequence from Ensembl..."

# The EPAS1 region in chimp (approximate - needs verification)
# Human chr2:46290000-46390000 maps approximately to chimp chr2B
# We'll use Ensembl API to get the homologous region

python3 -c "
import requests
import json

# Get homology for human EPAS1
print('Fetching chimp ortholog of EPAS1...')
url = 'https://rest.ensembl.org/homology/symbol/homo_sapiens/EPAS1?target_species=pan_troglodytes;type=orthologues;format=full'
headers = {'Content-Type': 'application/json'}
try:
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        data = r.json()
        if 'data' in data and len(data['data']) > 0:
            homologies = data['data'][0]['homologies']
            for h in homologies:
                if h['target']['species'] == 'pan_troglodytes':
                    print(f\"Chimp gene: {h['target']['id']}\")
                    print(f\"Location: {h['target']['location']}\")
    else:
        print('Failed to get homology data')
except Exception as e:
    print(f'Error: {e}')
    print('You may need to download chimp genome separately')
"

# Create a placeholder chimp sequence for now
echo ""
echo "Creating placeholder chimp sequence (you should replace with real chimp data)..."
# In practice, you'd extract the real chimp sequence from panTro6 or similar
samtools faidx data/ref/GRCh38.primary_assembly.genome.fa chr2:46290000-46390000 > data/archaic/chimp_placeholder.fa
sed -i '' 's/>chr2:46290000-46390000/>chimp/' data/archaic/chimp_placeholder.fa

echo ""
echo "Files created in data/archaic/:"
ls -lh data/archaic/*.vcf.gz data/archaic/*.fa 2>/dev/null | tail -5

echo ""
echo "Note: Archaic VCFs are in hg19 coordinates and need liftover to GRCh38"
echo "Chimp sequence should be replaced with actual chimp data from panTro6 or similar"