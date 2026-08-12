import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  selectHasMsa,
  selectMsaPreviousRegion,
  selectMsaRegion,
  selectMsaRowOrder,
  selectMsaSequences,
  selectTaxaColorVersion,
  selectTaxaGrouping,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { calculateConsensus, processMsaSequences } from '../../msaViewer/utils/dataUtils.js';
import { getTaxonColor } from '../../treeColoring/utils/GroupingUtils';
import { MSAContext, MSAViewportContext, MSAViewportDispatchContext } from './MSAContextValue.js';

export function MSAProvider({ children }) {
  const hasMsa = useAppStore(selectHasMsa);
  const msaSequences = useAppStore(selectMsaSequences);
  const msaRegion = useAppStore(selectMsaRegion);
  const msaPreviousRegion = useAppStore(selectMsaPreviousRegion);
  const msaRowOrder = useAppStore(selectMsaRowOrder);
  const taxaGrouping = useAppStore(selectTaxaGrouping);
  const taxaColorVersion = useAppStore(selectTaxaColorVersion);

  const [showLetters, setShowLetters] = useState(true);
  const [colorScheme, setColorScheme] = useState('default');
  const [visibleRange, setVisibleRange] = useState(null);
  const viewerCommandsRef = useRef(null);

  const connectViewerCommands = useCallback((commands) => {
    viewerCommandsRef.current = commands;
    return () => {
      if (viewerCommandsRef.current === commands) {
        viewerCommandsRef.current = null;
      }
    };
  }, []);

  const zoomIn = useCallback(() => {
    viewerCommandsRef.current?.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    viewerCommandsRef.current?.zoomOut();
  }, []);

  const fitAlignment = useCallback(() => {
    viewerCommandsRef.current?.fitAlignment();
  }, []);

  const centerViewportOn = useCallback((position) => {
    viewerCommandsRef.current?.centerViewportOn(position);
  }, []);

  const parsedData = useMemo(() => {
    if (!hasMsa || !msaSequences) return null;
    try {
      const parsed = processMsaSequences(msaSequences);
      if (!parsed) return null;
      return {
        ...parsed,
        consensus: calculateConsensus(parsed.sequences),
      };
    } catch (err) {
      console.warn('[MSA Context] Failed to process MSA data:', err);
      return null;
    }
  }, [hasMsa, msaSequences]);

  const processedData = useMemo(() => {
    if (!parsedData || !Array.isArray(msaRowOrder) || msaRowOrder.length === 0) {
      return parsedData;
    }

    const seqMap = new Map(parsedData.sequences.map((sequence) => [sequence.id, sequence]));
    const sequences = [];

    for (const id of msaRowOrder) {
      const sequence = seqMap.get(id);
      if (sequence) {
        sequences.push(sequence);
        seqMap.delete(id);
      }
    }

    seqMap.forEach((sequence) => sequences.push(sequence));
    return {
      ...parsedData,
      sequences,
      rows: sequences.length,
    };
  }, [parsedData, msaRowOrder]);

  // Map each taxon id to its assigned color (group/csv/taxon coloring)
  const rowColorMap = useMemo(() => {
    // The color manager may update in place; its version is the cache invalidation signal.
    void taxaColorVersion;
    if (!processedData?.sequences) return {};
    const map = {};

    processedData.sequences.forEach((seq) => {
      const id = seq.id;
      const color = getTaxonColor(id, taxaGrouping, null);
      if (color) map[id] = color;
    });
    return map;
  }, [processedData, taxaColorVersion, taxaGrouping]);

  const value = useMemo(
    () => ({
      processedData,
      msaRegion,
      msaPreviousRegion,
      showLetters,
      setShowLetters,
      colorScheme,
      setColorScheme,
      rowColorMap,
      connectViewerCommands,
      zoomIn,
      zoomOut,
      fitAlignment,
      centerViewportOn,
    }),
    [
      processedData,
      msaRegion,
      msaPreviousRegion,
      showLetters,
      colorScheme,
      rowColorMap,
      connectViewerCommands,
      zoomIn,
      zoomOut,
      fitAlignment,
      centerViewportOn,
    ]
  );

  const viewportValue = useMemo(() => ({ visibleRange, setVisibleRange }), [visibleRange]);

  return (
    <MSAContext.Provider value={value}>
      <MSAViewportDispatchContext.Provider value={setVisibleRange}>
        <MSAViewportContext.Provider value={viewportValue}>{children}</MSAViewportContext.Provider>
      </MSAViewportDispatchContext.Provider>
    </MSAContext.Provider>
  );
}
