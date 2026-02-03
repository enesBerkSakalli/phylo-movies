import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAppStore } from '@/js/core/store';
import { processPhyloData } from '@/js/msaViewer/utils/dataUtils';
import { TREE_COLOR_CATEGORIES } from '@/js/constants/TreeColors';
import { getGroupForTaxon } from '@/js/treeColoring/utils/GroupingUtils';

const MSAContext = createContext(null);

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectMovieData = (s) => s.movieData;
const selectHasMsa = (s) => s.hasMsa;
const selectMsaRegion = (s) => s.msaRegion;
const selectSetMsaRegion = (s) => s.setMsaRegion;
const selectClearMsaRegion = (s) => s.clearMsaRegion;
const selectMsaPreviousRegion = (s) => s.msaPreviousRegion;
const selectMsaRowOrder = (s) => s.msaRowOrder;
const selectTaxaGrouping = (s) => s.taxaGrouping;
const selectTaxaColorVersion = (s) => s.taxaColorVersion;

export function MSAProvider({ children }) {
  const movieData = useAppStore(selectMovieData);
  const hasMsa = useAppStore(selectHasMsa);
  const msaRegion = useAppStore(selectMsaRegion);
  const setMsaRegion = useAppStore(selectSetMsaRegion);
  const clearMsaRegion = useAppStore(selectClearMsaRegion);
  const msaPreviousRegion = useAppStore(selectMsaPreviousRegion);
  const msaRowOrder = useAppStore(selectMsaRowOrder);
  const taxaGrouping = useAppStore(selectTaxaGrouping);
  const taxaColorVersion = useAppStore(selectTaxaColorVersion);

  const [showLetters, setShowLetters] = useState(true);
  const [colorScheme, setColorScheme] = useState('default');
  const [viewAction, setViewAction] = useState(null);
  const [visibleRange, setVisibleRange] = useState(null);
  const [scrollAction, setScrollAction] = useState(null);

  const triggerViewAction = (action) => {
    setViewAction({ action, id: Date.now() });
  };

  // Trigger a scroll to a specific row/col position from scrollbars
  const scrollToPosition = (position) => {
    setScrollAction({ ...position, id: Date.now() });
  };

  // Process data
  const processedData = useMemo(() => {
    if (!hasMsa || !movieData) return null;
    try {
      const parsed = processPhyloData(movieData);
      if (!parsed) return null;

      // Apply optional row ordering based on msaRowOrder (taxon IDs)
      if (Array.isArray(msaRowOrder) && msaRowOrder.length) {
        const seqMap = new Map(parsed.sequences.map((s) => [s.id, s]));
        const reordered = [];

        // First: add in requested order when present
        msaRowOrder.forEach((id) => {
          const seq = seqMap.get(id);
          if (seq) {
            reordered.push(seq);
            seqMap.delete(id);
          }
        });

        // Then: append any remaining sequences not in the order list
        seqMap.forEach((seq) => reordered.push(seq));

        return {
          ...parsed,
          sequences: reordered,
          rows: reordered.length
        };
      }

      return parsed;
    } catch (err) {
      console.warn('[MSA Context] Failed to process MSA data:', err);
      return null;
    }
  }, [hasMsa, movieData, msaRowOrder]);

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

      // Per-taxon explicit color (only if not a system key)
      if (!color) {
        const systemKeys = ['markedColor', 'pivotEdgeColor', 'strokeColor', 'defaultColor'];
        if (!systemKeys.includes(id) && TREE_COLOR_CATEGORIES[id]) {
          color = TREE_COLOR_CATEGORIES[id];
        }
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
    msaPreviousRegion,
    showLetters,
    setShowLetters,
    colorScheme,
    setColorScheme,
    viewAction,
    triggerViewAction,
    visibleRange,
    setVisibleRange,
    rowColorMap,
    scrollAction,
    scrollToPosition,
  }), [
    movieData,
    processedData,
    msaRegion,
    setMsaRegion,
    clearMsaRegion,
    msaPreviousRegion,
    showLetters,
    setShowLetters,
    colorScheme,
    setColorScheme,
    viewAction,
    triggerViewAction,
    visibleRange,
    setVisibleRange,
    rowColorMap,
    scrollAction,
    scrollToPosition
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
