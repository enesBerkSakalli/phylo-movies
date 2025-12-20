import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { processPhyloData } from '../../../js/msaViewer/utils/dataUtils.js';

const MSAContext = createContext(null);

export function MSAProvider({ children }) {
  const movieData = useAppStore((s) => s.movieData);
  const hasMsa = useAppStore((s) => s.hasMsa);
  const msaRegion = useAppStore((s) => s.msaRegion);
  const setMsaRegion = useAppStore((s) => s.setMsaRegion);
  const clearMsaRegion = useAppStore((s) => s.clearMsaRegion);

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
    setVisibleRange
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
