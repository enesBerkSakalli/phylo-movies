# Makefile
.PHONY: all consensus windows strip clean

CFG?=config.yaml

all: consensus windows strip

consensus:
	python scripts/consensus.py $(CFG)

windows:
	python scripts/window_trees.py $(CFG)

strip:
	python scripts/quick_strip.py

clean:
	rm -rf out/windows out/consensus/*.vcf.gz out/consensus/*.fa out/*.csv out/*.json out/*.png out/windows/*.treefile out/windows/*.log out/windows/*.ckp.gz out/windows/*.iqtree
