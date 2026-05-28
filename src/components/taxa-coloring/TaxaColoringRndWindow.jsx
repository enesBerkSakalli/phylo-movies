import React, { useMemo, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '../ui/button';
import { Palette, X } from 'lucide-react';
import { AppTooltip } from '../ui/app-tooltip';
import { cn } from '../../lib/utils';
import {
  selectDatasetProvenance,
  selectFileName,
  selectLeafNamesByIndex,
  selectSetTaxaColoringOpen,
  selectSetTaxaColoringWindow,
  selectSetTaxaGrouping,
  selectTaxaColoringOpen,
  selectTaxaColoringWindow,
  selectTaxaGrouping,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { TaxaColoringWindow } from './TaxaColoringWindow.jsx';
import { SYSTEM_TREE_COLORS } from '../../constants/TreeColors.js';
import {
  fitFloatingWindowRect,
  getBrowserViewportSize,
  hasFloatingWindowRectChanged,
  toFloatingWindowRect,
} from '../ui/floatingWindowGeometry.js';
import {
  FLOATING_WINDOW_SURFACE_CLASS,
  getFloatingWindowLayerClass,
} from '../ui/floating-window-layer.js';

const EMPTY_INITIAL_STATE = {};
const TAXA_COLORING_WINDOW_BOUNDS = {
  minWidth: 500,
  minHeight: 520,
  margin: 16,
};
const NOROVIRUS_SELECTED_METADATA_SOURCE = {
  label: 'Norovirus metadata',
  fileName: 'subsampled_350_metadata.csv',
  filePath:
    import.meta.env.BASE_URL +
    'examples/recombination_norovirus/source_preparation/augur_subsampling/metadata/subsampled_350_metadata.csv',
  preferredColumn: 'VP1_type',
};

function fitTaxaColoringWindowRect(rect) {
  const viewport = getBrowserViewportSize();
  return fitFloatingWindowRect(rect, {
    ...TAXA_COLORING_WINDOW_BOUNDS,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });
}

export function TaxaColoringRndWindow({ isActive = false, onFocus } = {}) {
  const isOpen = useAppStore(selectTaxaColoringOpen);
  const setOpen = useAppStore(selectSetTaxaColoringOpen);
  const windowState = useAppStore(selectTaxaColoringWindow);
  const setWindowState = useAppStore(selectSetTaxaColoringWindow);
  const fittedWindow = fitTaxaColoringWindowRect(windowState);

  const taxaNames = useAppStore(selectLeafNamesByIndex);
  const fileName = useAppStore(selectFileName);
  const datasetProvenance = useAppStore(selectDatasetProvenance);
  const taxaGrouping = useAppStore(selectTaxaGrouping);
  const setTaxaGrouping = useAppStore(selectSetTaxaGrouping);

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

  const baselineColorMap = useMemo(() => {
    const map = {};
    const currentTaxaMap = taxaGrouping?.taxaColorMap || {};

    taxaNames.forEach((taxon) => {
      map[taxon] = currentTaxaMap[taxon] || SYSTEM_TREE_COLORS.defaultColor || '#000000';
    });
    return map;
  }, [taxaNames, taxaGrouping]);

  const metadataSources = useMemo(() => {
    const sourceLabel = datasetProvenance?.sourceLabel || '';
    const isNorovirusDataset =
      sourceLabel.includes('recombination_norovirus') ||
      String(fileName || '').toLowerCase().includes('norovirus') ||
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

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  const onDragStop = useCallback(
    (_e, d) => {
      const nextRect = fitTaxaColoringWindowRect({ ...fittedWindow, x: d.x, y: d.y });
      setWindowState(toFloatingWindowRect(nextRect));
    },
    [fittedWindow, setWindowState]
  );

  const onResizeStop = useCallback(
    (_e, _dir, ref, _delta, pos) => {
      const nextRect = fitTaxaColoringWindowRect({
        width: parseInt(ref.style.width, 10),
        height: parseInt(ref.style.height, 10),
        x: pos.x,
        y: pos.y,
      });
      setWindowState(toFloatingWindowRect(nextRect));
    },
    [setWindowState]
  );

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
      role="region"
      aria-labelledby="taxa-coloring-title"
      aria-describedby="taxa-coloring-description"
      className={cn(
        FLOATING_WINDOW_SURFACE_CLASS,
        'backdrop-blur-md',
        getFloatingWindowLayerClass(isActive)
      )}
    >
      <div className="flex h-full flex-col">
        <div className="taxa-coloring-drag-handle flex shrink-0 cursor-move select-none items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Palette className="size-4 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-col">
              <div
                id="taxa-coloring-title"
                className="truncate text-sm font-semibold leading-tight"
              >
                Taxa Colors
              </div>
              <div
                id="taxa-coloring-description"
                className="truncate text-xs leading-tight text-muted-foreground"
              >
                Assign colors to taxa, name patterns, or CSV groups.
              </div>
            </div>
          </div>
          <AppTooltip content="Close taxa coloring window">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleClose}
              aria-label="Close taxa coloring window"
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X aria-hidden />
            </Button>
          </AppTooltip>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-background/50">
          <TaxaColoringWindow
            taxaNames={taxaNames}
            originalColorMap={baselineColorMap}
            onApply={handleApply}
            initialState={initialState}
            metadataSources={metadataSources}
          />
        </div>
      </div>
    </Rnd>
  );
}

export default TaxaColoringRndWindow;
