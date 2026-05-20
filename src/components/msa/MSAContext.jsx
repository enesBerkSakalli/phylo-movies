import React, { useState, useMemo, useCallback } from 'react';
import {
  selectClearMsaRegion,
  selectHasMsa,
  selectMsaPreviousRegion,
  selectMsaRegion,
  selectMsaRowOrder,
  selectMsaSequences,
  selectSetMsaRegion,
  selectTaxaColorVersion,
  selectTaxaGrouping,
  useAppStore
} from '../../state/phyloStore/store.js';
import { processMsaSequences } from '../../msaViewer/utils/dataUtils';
import { SYSTEM_TREE_COLORS } from '../../constants/TreeColors';
import { getTaxonColor } from '../../treeColoring/utils/GroupingUtils';
import { MSAContext } from './MSAContextValue.js';

export function MSAProvider({ children }) {
  const hasMsa = useAppStore(selectHasMsa);
  const msaSequences = useAppStore(selectMsaSequences);
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

  const triggerViewAction = useCallback((action) => {
    setViewAction({ action, id: Date.now() });
  }, []);

  // Trigger a scroll to a specific row/col position from scrollbars
  const scrollToPosition = useCallback((position) => {
    setScrollAction({ ...position, id: Date.now() });
  }, []);

  const systemTreeColors = useMemo(() => ({
    version: taxaColorVersion,
    colors: { ...SYSTEM_TREE_COLORS },
  }), [taxaColorVersion]);

  // Process data
  const processedData = useMemo(() => {
    if (!hasMsa || !msaSequences) return null;
    try {
      const parsed = processMsaSequences(msaSequences);
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
  }, [hasMsa, msaSequences, msaRowOrder]);

  // Map each taxon id to its assigned color (group/csv/taxon coloring)
  const rowColorMap = useMemo(() => {
    if (!processedData?.sequences) return {};
    const map = {};
    const systemKeys = ['subtreeHighlightColor', 'pivotEdgeColor', 'strokeColor', 'defaultColor'];

    processedData.sequences.forEach((seq) => {
      const id = seq.id;
      let color = getTaxonColor(id, taxaGrouping, null);

      if (!color) {
        if (!systemKeys.includes(id) && systemTreeColors.colors[id]) {
          color = systemTreeColors.colors[id];
        }
      }

      if (color) map[id] = color;
    });
    return map;
  }, [processedData, taxaGrouping, systemTreeColors]);

  const value = useMemo(() => ({
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
