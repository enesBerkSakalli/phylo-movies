import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { processPhyloData } from '../../../js/msaViewer/utils/dataUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../js/constants/TreeColors.js';
import { getGroupForTaxon } from '../../../js/treeColoring/utils/GroupingUtils.js';

const MSAContext = createContext(null);

export function MSAProvider({ children }) {
  const movieData = useAppStore((s) => s.movieData);
  const hasMsa = useAppStore((s) => s.hasMsa);
  const msaRegion = useAppStore((s) => s.msaRegion);
  const setMsaRegion = useAppStore((s) => s.setMsaRegion);
  const clearMsaRegion = useAppStore((s) => s.clearMsaRegion);
  const taxaGrouping = useAppStore((s) => s.taxaGrouping);
  const taxaColorVersion = useAppStore((s) => s.taxaColorVersion);

  const [showLetters, setShowLetters] = useState(true);
  const [colorScheme, setColorScheme] = useState('default');
  const [viewAction, setViewAction] = useState(null);
  const [visibleRange, setVisibleRange] = useState(null);

  const triggerViewAction = (action) => {
    setViewAction({ action, id: Date.now() });
  };

  // Process data
  const processedData = useMemo(() => {
    if (!hasMsa || !movieData) return null;
    try {
      return processPhyloData(movieData);
    } catch (err) {
      console.warn('[MSA Context] Failed to process MSA data:', err);
      return null;
    }
  }, [hasMsa, movieData]);

  // Map each taxon id to its assigned color (group > per-taxon palette)
  const rowColorMap = useMemo(() => {
    if (!processedData?.sequences) return {};
    const map = {};

    const csvMap = taxaGrouping?.csvTaxaMap;
    const getCsvGroup = (taxon) => {
      if (!csvMap) return null;
      if (csvMap instanceof Map) return csvMap.get(taxon);
      if (typeof csvMap === 'object') return csvMap[taxon];
      return null;
    };

    processedData.sequences.forEach((seq) => {
      const id = seq.id;
      let color = null;

      if (taxaGrouping && taxaGrouping.mode !== 'taxa') {
        let group = null;
        if (taxaGrouping.mode === 'groups') {
          group = getGroupForTaxon(
            id,
            taxaGrouping.separators || taxaGrouping.separator,
            taxaGrouping.strategyType,
            {
              segmentIndex: taxaGrouping.segmentIndex,
              useRegex: taxaGrouping.useRegex,
              regexPattern: taxaGrouping.regexPattern,
            }
          );
        } else if (taxaGrouping.mode === 'csv') {
          group = getCsvGroup(id);
        }
        if (group && taxaGrouping.groupColorMap?.[group]) {
          color = taxaGrouping.groupColorMap[group];
        }
      }

      // Per-taxon explicit color (do not fall back to defaultColor; default -> no color)
      if (!color && TREE_COLOR_CATEGORIES[id]) {
        color = TREE_COLOR_CATEGORIES[id];
      }

      if (color) map[id] = color;
    });
    return map;
  }, [processedData, taxaGrouping, taxaColorVersion]);

  const value = useMemo(() => ({
    movieData,
    processedData,
    msaRegion,
    setMsaRegion,
    clearMsaRegion,
    showLetters,
    setShowLetters,
    colorScheme,
    setColorScheme,
    viewAction,
    triggerViewAction,
    visibleRange,
    setVisibleRange,
    rowColorMap,
  }), [
    movieData,
    processedData,
    msaRegion,
    setMsaRegion,
    clearMsaRegion,
    showLetters,
    setShowLetters,
    colorScheme,
    setColorScheme,
    viewAction,
    triggerViewAction,
    visibleRange,
    setVisibleRange,
    rowColorMap
  ]);

  return (
    <MSAContext.Provider value={value}>
      {children}
    </MSAContext.Provider>
  );
}

export function useMSA() {
  const context = useContext(MSAContext);
  if (!context) {
    throw new Error('useMSA must be used within an MSAProvider');
  }
  return context;
}
