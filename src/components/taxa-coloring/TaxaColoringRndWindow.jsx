import React, { useMemo, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '../ui/button';
import { Palette, X } from 'lucide-react';
import {
  selectLeafNamesByIndex,
  selectSetTaxaColoringOpen,
  selectSetTaxaColoringWindow,
  selectSetTaxaGrouping,
  selectTaxaColoringOpen,
  selectTaxaColoringWindow,
  selectTaxaGrouping,
  useAppStore
} from '../../state/phyloStore/store.js';
import { TaxaColoringWindow } from './TaxaColoringWindow.jsx';
import { SYSTEM_TREE_COLORS } from '../../constants/TreeColors.js';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  fitFloatingWindowRect,
  getBrowserViewportSize,
  getFloatingWindowViewportInsets,
  hasFloatingWindowRectChanged,
  toFloatingWindowRect,
} from '../ui/floatingWindowGeometry.js';

// Stable empty object to avoid creating new objects on each render
const EMPTY_INITIAL_STATE = {};
const TAXA_COLORING_WINDOW_BOUNDS = {
  minWidth: 500,
  minHeight: 520,
  margin: 16,
};

function fitTaxaColoringWindowRect(rect) {
  const viewport = getBrowserViewportSize();
  const insets = getFloatingWindowViewportInsets();
  return fitFloatingWindowRect(rect, {
    ...TAXA_COLORING_WINDOW_BOUNDS,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    leftInset: insets.left,
    rightInset: insets.right,
    topInset: insets.top,
    bottomInset: insets.bottom,
  });
}

export function TaxaColoringRndWindow({ isActive = false, onFocus } = {}) {
  const isOpen = useAppStore(selectTaxaColoringOpen);
  const setOpen = useAppStore(selectSetTaxaColoringOpen);
  const windowState = useAppStore(selectTaxaColoringWindow);
  const setWindowState = useAppStore(selectSetTaxaColoringWindow);
  const fittedWindow = fitTaxaColoringWindowRect(windowState);

  const taxaNames = useAppStore(selectLeafNamesByIndex);
  const taxaGrouping = useAppStore(selectTaxaGrouping);
  const setTaxaGrouping = useAppStore(selectSetTaxaGrouping);

  // Stable initial state reference to prevent unnecessary re-renders
  const initialState = useMemo(() => taxaGrouping || EMPTY_INITIAL_STATE, [taxaGrouping]);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const fitWindow = () => {
      const currentRect = useAppStore.getState().taxaColoringWindow;
      const nextRect = fitTaxaColoringWindowRect(currentRect);
      if (hasFloatingWindowRectChanged(currentRect, nextRect)) {
        setWindowState(toFloatingWindowRect(nextRect));
      }
    };

    fitWindow();
    window.addEventListener('resize', fitWindow);
    return () => window.removeEventListener('resize', fitWindow);
  }, [isOpen, setWindowState]);

  React.useEffect(() => {
    if (isOpen) onFocus?.();
  }, [isOpen, onFocus]);

  // Create a clean color map for the UI to use as a baseline.
  // We strictly isolate taxon names from system colors to prevent collisions.
  const baselineColorMap = useMemo(() => {
    const map = {};
    const currentTaxaMap = taxaGrouping?.taxaColorMap || {};

    taxaNames.forEach((taxon) => {
      // Use assigned color if it exists, otherwise use system default
      map[taxon] = currentTaxaMap[taxon] || SYSTEM_TREE_COLORS.defaultColor || "#000000";
    });
    return map;
  }, [taxaNames, taxaGrouping]);

  const handleApply = useCallback((colorData) => {
    if (!taxaNames.length) return;

    // Persist grouping info for UI (tooltips) and window state restoration
    setTaxaGrouping({
      mode: colorData?.mode || 'taxa',
      separators: colorData?.separators || null,
      strategyType: colorData?.strategyType || null,
      segmentIndex: colorData?.segmentIndex,
      useRegex: colorData?.useRegex,
      regexPattern: colorData?.regexPattern,
      csvTaxaMap: (colorData?.csvTaxaMap instanceof Map) ? Object.fromEntries(colorData.csvTaxaMap) : (colorData?.csvTaxaMap || null),
      groupColorMap: colorData?.groupColorMap || null,
      taxaColorMap: colorData?.taxaColorMap || null, // Persist taxa colors for restoration
      // CSV-specific fields for full state restoration
      csvGroups: colorData?.csvGroups || null,
      csvColumn: colorData?.csvColumn || null,
      csvData: colorData?.csvData || null,
      csvFileName: colorData?.csvFileName || null,
    });
  }, [taxaNames, setTaxaGrouping]);

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  const onDragStop = useCallback((_e, d) => {
    const nextRect = fitTaxaColoringWindowRect({ ...fittedWindow, x: d.x, y: d.y });
    setWindowState(toFloatingWindowRect(nextRect));
  }, [fittedWindow, setWindowState]);

  const onResizeStop = useCallback((_e, _dir, ref, _delta, pos) => {
    const nextRect = fitTaxaColoringWindowRect({
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: pos.x,
      y: pos.y,
    });
    setWindowState(toFloatingWindowRect(nextRect));
  }, [setWindowState]);

  if (!isOpen || !taxaNames.length) return null;

  return (
    <Rnd
      bounds="window"
      minWidth={fittedWindow.minWidth}
      minHeight={fittedWindow.minHeight}
      size={{ width: fittedWindow.width, height: fittedWindow.height }}
      position={{ x: fittedWindow.x, y: fittedWindow.y }}
      onMouseDown={onFocus}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
      dragHandleClassName="taxa-coloring-drag-handle"
      className={`fixed ${isActive ? 'z-[1200]' : 'z-[1100]'} pointer-events-auto shadow-2xl border border-border/60 rounded-xl bg-card/95 overflow-hidden`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/40 bg-card/50 taxa-coloring-drag-handle cursor-move select-none transition-colors hover:bg-card/70 group/header">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner group-hover/header:rotate-12 transition-transform duration-300">
               <Palette className="size-5" />
            </div>
            <div className="flex flex-col gap-1 leading-none">
              <span className="text-foreground">Taxa Coloring</span>
              <span className="text-2xs font-normal text-muted-foreground/80 tracking-wide uppercase">Assignment Manager</span>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close taxa coloring window"
                className="size-8 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent variant="destructive">Close Coloring Window</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden bg-background/50">
          <TaxaColoringWindow
            taxaNames={taxaNames}
            originalColorMap={baselineColorMap}
            onApply={handleApply}
            onClose={handleClose}
            initialState={initialState}
          />
        </div>
      </div>
    </Rnd>
  );
}

export default TaxaColoringRndWindow;
