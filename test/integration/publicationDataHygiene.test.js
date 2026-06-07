import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { auditPublicationData, TAXA_SCALE_TIERS } from '../../scripts/check-publication-data.mjs';

describe('publication data hygiene', () => {
  it('verifies retained publication files against manifests and content counts', () => {
    const report = auditPublicationData();

    expect(report.status).toBe('PASS');
    expect(report.errors).toEqual([]);
    expect(report.bootstrap.sourceAlignments.map((entry) => entry.taxa)).toEqual([24, 125]);
    expect(report.bootstrap.currentResults.map((entry) => entry.taxa)).toEqual([24, 125]);
    expect(report.bootstrap.currentResults.map((entry) => entry.treeCount)).toEqual([200, 200]);
    expect(report.norovirus.rawSnapshot).toMatchObject({
      sequences: 4565,
      accessionVersions: 4565,
    });
    expect(report.norovirus.finalAlignment).toMatchObject({
      sequences: 334,
      sites: 8058,
      metadataRows: 334,
      fullGenotypeTaxa: 326,
      polymeraseOnlyTaxa: 8,
    });
    expect(report.norovirus.subsets).toEqual([
      {
        filename: 'recan_working_subset_48taxa_8058bp.fasta',
        sequences: 48,
        missingFromFinal: 0,
      },
      {
        filename: 'recan_focused_subset_6taxa_8058bp.fasta',
        sequences: 6,
        missingFromFinal: 0,
      },
    ]);
    expect(report).not.toHaveProperty('msprimePerformance');
    expect(report.maxPublicationTaxa).toBe(500);
  }, 30_000);

  it('documents the committed and generated taxa scale boundaries', () => {
    expect(TAXA_SCALE_TIERS).toEqual([
      {
        label: 'committed-small',
        taxa: 24,
        source: 'RogueNaRok/Aberer publication bootstrap result',
      },
      {
        label: 'committed-medium',
        taxa: 125,
        source: 'RogueNaRok/Aberer publication bootstrap result',
      },
      {
        label: 'committed-msa',
        taxa: 334,
        source: 'Norovirus publication MSA',
      },
      {
        label: 'committed-tree-search',
        taxa: 500,
        source: 'IQ-TREE topology-search trajectory example',
      },
    ]);
  });

  it('pins the norovirus upstream workflow and exact accession-version snapshot', () => {
    const provenancePath = path.join(
      process.cwd(),
      'publication_data',
      'recombination_norovirus',
      'SOURCE_PROVENANCE.md'
    );
    const provenance = fs.readFileSync(provenancePath, 'utf8');
    const accessionVersionsPath = path.join(
      process.cwd(),
      'publication_data',
      'recombination_norovirus',
      'source_preparation',
      'augur_subsampling',
      '01_raw',
      'full_genome_accession_versions.txt'
    );
    const recreateScriptPath = path.join(
      process.cwd(),
      'publication_data',
      'recombination_norovirus',
      'source_preparation',
      'augur_subsampling',
      'scripts',
      'recreate_nextstrain_augur_snapshot.sh'
    );

    const accessionVersions = fs.readFileSync(accessionVersionsPath, 'utf8').trim().split(/\r?\n/);
    const recreateScript = fs.readFileSync(recreateScriptPath, 'utf8');

    expect(provenance).not.toContain('Not recoverable');
    expect(provenance).toContain('bce398d15a14c82a2a8c3574da289205e2c5844f');
    expect(provenance).toContain('full_genome_accession_versions.txt');
    expect(accessionVersions).toHaveLength(4565);
    expect(accessionVersions[0]).toMatch(/^[A-Z]{1,3}_?\d+\.\d+$/);
    expect(recreateScript).toContain('nextstrain build');
    expect(recreateScript).toContain('augur filter');
    expect(recreateScript).toContain('NEXTSTRAIN_NOROVIRUS_COMMIT');
    expect(recreateScript).toContain('full_genome_accession_versions.txt');
    expect(recreateScript).toContain('git -C "${SCRIPT_DIR}" rev-parse --show-toplevel');
    expect(recreateScript).not.toContain('../../../../../..');
  });
});
