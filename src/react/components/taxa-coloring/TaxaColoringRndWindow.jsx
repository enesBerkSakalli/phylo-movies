import React, { useMemo, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Palette, X } from 'lucide-react';
import { useAppStore } from '../../../js/core/store.js';
import { TaxaColoringWindow } from './TaxaColoringWindow.jsx';
import { applyColoringData } from '../../../js/treeColoring/utils/GroupingUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../js/constants/TreeColors.js';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TaxaColoringRndWindow() {
  const isOpen = useAppStore((s) => s.taxaColoringOpen);
  const setOpen = useAppStore((s) => s.setTaxaColoringOpen);
  const windowState = useAppStore((s) => s.taxaColoringWindow);
  const setWindowState = useAppStore((s) => s.setTaxaColoringWindow);

  const movieData = useAppStore((s) => s.movieData);
  const taxaGrouping = useAppStore((s) => s.taxaGrouping);
  const updateTaxaColors = useAppStore((s) => s.updateTaxaColors);
  const setTaxaGrouping = useAppStore((s) => s.setTaxaGrouping);

  const taxaNames = useMemo(() => movieData?.sorted_leaves || [], [movieData]);

  // Clamp window size to viewport if it exceeds it
  React.useEffect(() => {
    if (!isOpen) return;
    const { width, height, x, y } = windowState;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let next = { ...windowState };
    let changed = false;

    if (width > vw - 40) { next.width = vw - 40; changed = true; }
    if (height > vh - 40) { next.height = vh - 40; changed = true; }
    if (x + next.width > vw) { next.x = Math.max(0, vw - next.width - 20); changed = true; }
    if (y + next.height > vh) { next.y = Math.max(0, vh - next.height - 20); changed = true; }

    if (changed) {
      setWindowState(next);
    }
  }, [isOpen]);

  // Create a complete color map that includes both system colors and current taxa colors
  const completeColorMap = useMemo(() => {
    const map = { ...TREE_COLOR_CATEGORIES };
    taxaNames.forEach((taxon) => {
      map[taxon] = TREE_COLOR_CATEGORIES[taxon] || TREE_COLOR_CATEGORIES.defaultColor || "#000000";
    });
    return map;
  }, [taxaNames]);

  const handleApply = useCallback((colorData) => {
    if (!taxaNames.length) return;

    const newColorMap = applyColoringData(colorData, taxaNames, colorData.taxaColorMap);
    updateTaxaColors(newColorMap);

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
  }, [taxaNames, updateTaxaColors, setTaxaGrouping]);

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  const onDragStop = useCallback((_e, d) => {
      setWindowState({ x: d.x, y: d.y });
  }, [setWindowState]);

  const onResizeStop = useCallback((_e, _dir, ref, _delta, pos) => {
        setWindowState({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
          x: pos.x,
          y: pos.y,
        });
  }, [setWindowState]);

  if (!isOpen || !taxaNames.length) return null;

  return (
    <Rnd
      bounds="window"
      minWidth={500}
      minHeight={520}
      size={{ width: windowState.width, height: windowState.height }}
      position={{ x: windowState.x, y: windowState.y }}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
      dragHandleClassName="taxa-coloring-drag-handle"
      className="fixed z-50 pointer-events-auto shadow-2xl border border-border/60 rounded-xl bg-card/95 overflow-hidden"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/40 bg-card/50 taxa-coloring-drag-handle cursor-move select-none transition-colors hover:bg-card/70 group/header">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner group-hover/header:rotate-12 transition-transform duration-300">
               <Palette className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-foreground">Taxa Coloring</span>
              <span className="text-[10px] font-normal text-muted-foreground/80 tracking-wide uppercase">Assignment Manager</span>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="size-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
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
            originalColorMap={completeColorMap}
            onApply={handleApply}
            onClose={handleClose}
            initialState={taxaGrouping || {}}
          />
        </div>
      </div>
    </Rnd>
  );
}

export default TaxaColoringRndWindow;
