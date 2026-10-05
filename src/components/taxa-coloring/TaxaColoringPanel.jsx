import React, { useMemo, useCallback } from 'react';
import {
  selectDatasetProvenance,
  selectFileName,
  selectLeafNamesByIndex,
  selectSetTaxaGrouping,
  selectTaxaGrouping,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { TaxaColoringWindow } from './TaxaColoringWindow.jsx';

const EMPTY_INITIAL_STATE = {};
const NOROVIRUS_SELECTED_METADATA_SOURCE = {
  label: 'Norovirus metadata',
  fileName: 'subsampled_350_metadata.csv',
  filePath:
    import.meta.env.BASE_URL +
    'examples/recombination_norovirus/source_preparation/augur_subsampling/metadata/subsampled_350_metadata.csv',
  preferredColumn: 'VP1_type',
};

export function TaxaColoringPanel() {
  const taxaNames = useAppStore(selectLeafNamesByIndex);
  const fileName = useAppStore(selectFileName);
  const datasetProvenance = useAppStore(selectDatasetProvenance);
  const taxaGrouping = useAppStore(selectTaxaGrouping);
  const setTaxaGrouping = useAppStore(selectSetTaxaGrouping);

  const initialState = useMemo(() => taxaGrouping || EMPTY_INITIAL_STATE, [taxaGrouping]);

  const baselineColorMap = useMemo(() => {
    const map = {};
    const currentTaxaMap = taxaGrouping?.taxaColorMap || {};

    // Carry over explicit assignments only. Seeding every taxon with
    // SYSTEM_TREE_COLORS.defaultColor made the map dense, and since the window
    // applies its result on mount, that black reached the store for taxa the
    // user never colored: MSA row labels then took their "has a color" branch
    // and rendered white-on-black, and monophyletic detection saw every
    // uncolored subtree as sharing one color. Consumers already fall back to
    // the system default when an entry is absent.
    taxaNames.forEach((taxon) => {
      const assigned = currentTaxaMap[taxon];
      if (assigned) map[taxon] = assigned;
    });
    return map;
  }, [taxaNames, taxaGrouping]);

  const metadataSources = useMemo(() => {
    const sourceLabel = datasetProvenance?.source_label || '';
    const isNorovirusDataset =
      sourceLabel.includes('recombination_norovirus') ||
      String(fileName || '')
        .toLowerCase()
        .includes('norovirus') ||
      taxaNames.some((taxon) => /^[A-Z]{1,3}\d+_/.test(taxon));

    return isNorovirusDataset ? [NOROVIRUS_SELECTED_METADATA_SOURCE] : [];
  }, [datasetProvenance, fileName, taxaNames]);

  const handleApply = useCallback(
    (colorData) => {
      if (!taxaNames.length) return;

      setTaxaGrouping({
        mode: colorData?.mode || 'taxa',
        separators: colorData?.separators || null,
        strategyType: colorData?.strategyType || null,
        segmentIndex: colorData?.segmentIndex,
        useRegex: colorData?.useRegex,
        regexPattern: colorData?.regexPattern,
        csvTaxaMap:
          colorData?.csvTaxaMap instanceof Map
            ? Object.fromEntries(colorData.csvTaxaMap)
            : colorData?.csvTaxaMap || null,
        groupColorMap: colorData?.groupColorMap || null,
        taxaColorMap: colorData?.taxaColorMap || null,
        csvGroups: colorData?.csvGroups || null,
        csvColumn: colorData?.csvColumn || null,
        csvData: colorData?.csvData || null,
        csvFileName: colorData?.csvFileName || null,
      });
    },
    [taxaNames, setTaxaGrouping]
  );

  if (!taxaNames.length) {
    return <p className="p-4 text-xs text-muted-foreground">No taxa loaded.</p>;
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-background/50">
      <TaxaColoringWindow
        taxaNames={taxaNames}
        originalColorMap={baselineColorMap}
        onApply={handleApply}
        initialState={initialState}
        metadataSources={metadataSources}
      />
    </div>
  );
}

export default TaxaColoringPanel;
