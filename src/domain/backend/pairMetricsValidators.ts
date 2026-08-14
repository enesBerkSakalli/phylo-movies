/**
 * pair_metrics validation: the per-pair rows and the semantics record
 * describing how robinson_foulds and weighted_robinson_foulds were computed.
 */

import type { PairMetricRow, PairMetrics, PhyloMovieData } from './phyloMovieTypes';
import {
  assertExactRecordKeys,
  assertRecord,
  requiredArray,
  requiredRecord,
  validateFiniteNumber,
  validateInteger,
} from './schemaValidation';

function validateOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a boolean`);
  }
  return value;
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a string`);
  }
  return value;
}

function validatePairMetricSemantics(value: unknown): PairMetrics['semantics'] {
  assertRecord(value, 'pair_metrics.semantics');
  assertExactRecordKeys(value, 'pair_metrics.semantics', [
    'robinson_foulds',
    'weighted_robinson_foulds',
  ]);

  const semantics: PairMetrics['semantics'] = {};

  if (value.robinson_foulds !== undefined) {
    assertRecord(value.robinson_foulds, 'pair_metrics.semantics.robinson_foulds');
    assertExactRecordKeys(value.robinson_foulds, 'pair_metrics.semantics.robinson_foulds', [
      'topology',
      'normalization',
      'scope',
    ]);
    semantics.robinson_foulds = {};

    const topology = validateOptionalString(
      value.robinson_foulds.topology,
      'pair_metrics.semantics.robinson_foulds.topology'
    );
    const normalization = validateOptionalString(
      value.robinson_foulds.normalization,
      'pair_metrics.semantics.robinson_foulds.normalization'
    );
    const scope = validateOptionalString(
      value.robinson_foulds.scope,
      'pair_metrics.semantics.robinson_foulds.scope'
    );

    if (topology !== undefined) semantics.robinson_foulds.topology = topology;
    if (normalization !== undefined) semantics.robinson_foulds.normalization = normalization;
    if (scope !== undefined) semantics.robinson_foulds.scope = scope;
  }

  if (value.weighted_robinson_foulds !== undefined) {
    assertRecord(value.weighted_robinson_foulds, 'pair_metrics.semantics.weighted_robinson_foulds');
    assertExactRecordKeys(
      value.weighted_robinson_foulds,
      'pair_metrics.semantics.weighted_robinson_foulds',
      ['topology', 'includes_branch_lengths', 'includes_terminal_and_root_splits', 'scope']
    );
    semantics.weighted_robinson_foulds = {};

    const topology = validateOptionalString(
      value.weighted_robinson_foulds.topology,
      'pair_metrics.semantics.weighted_robinson_foulds.topology'
    );
    const includesBranchLengths = validateOptionalBoolean(
      value.weighted_robinson_foulds.includes_branch_lengths,
      'pair_metrics.semantics.weighted_robinson_foulds.includes_branch_lengths'
    );
    const includesTerminalAndRootSplits = validateOptionalBoolean(
      value.weighted_robinson_foulds.includes_terminal_and_root_splits,
      'pair_metrics.semantics.weighted_robinson_foulds.includes_terminal_and_root_splits'
    );
    const scope = validateOptionalString(
      value.weighted_robinson_foulds.scope,
      'pair_metrics.semantics.weighted_robinson_foulds.scope'
    );

    if (topology !== undefined) semantics.weighted_robinson_foulds.topology = topology;
    if (includesBranchLengths !== undefined) {
      semantics.weighted_robinson_foulds.includes_branch_lengths = includesBranchLengths;
    }
    if (includesTerminalAndRootSplits !== undefined) {
      semantics.weighted_robinson_foulds.includes_terminal_and_root_splits =
        includesTerminalAndRootSplits;
    }
    if (scope !== undefined) semantics.weighted_robinson_foulds.scope = scope;
  }

  return semantics;
}

function validatePairMetricRow(value: unknown, index: number): PairMetricRow {
  const fieldName = `pair_metrics.rows[${index}]`;
  const row = requiredRecord(value, fieldName);
  assertExactRecordKeys(row, fieldName, [
    'pair_id',
    'pair_ordinal',
    'robinson_foulds',
    'weighted_robinson_foulds',
  ]);

  if (typeof row.pair_id !== 'string' || row.pair_id.length === 0) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName}.pair_id must be a non-empty string`
    );
  }

  return {
    pair_id: row.pair_id,
    pair_ordinal: validateInteger(row.pair_ordinal, `${fieldName}.pair_ordinal`),
    robinson_foulds: validateFiniteNumber(row.robinson_foulds, `${fieldName}.robinson_foulds`),
    weighted_robinson_foulds: validateFiniteNumber(
      row.weighted_robinson_foulds,
      `${fieldName}.weighted_robinson_foulds`
    ),
  };
}

export function validatePairMetrics(value: unknown): PhyloMovieData['pair_metrics'] {
  assertRecord(value, 'pair_metrics');
  assertExactRecordKeys(value, 'pair_metrics', ['rows', 'semantics']);

  return {
    rows: requiredArray(value.rows, 'pair_metrics.rows').map((row, index) =>
      validatePairMetricRow(row, index)
    ),
    semantics: validatePairMetricSemantics(value.semantics),
  };
}
