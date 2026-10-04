import React from 'react';
import { useMSA } from './useMSA.js';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  selectClearMsaRowOrder,
  selectCurrentTree,
  selectFrameIndex,
  selectMsaRowOrder,
  selectSetMsaRowOrder,
  selectTreeController,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { MSAViewActions } from './controls/MSAViewActions.jsx';
import { MSAColorLegend } from './controls/MSAColorLegend.jsx';
import {
  getColorSchemeGroups,
  isColorSchemeAvailable,
} from '../../msaViewer/utils/colorSchemeCatalog.js';

export function MSAControls() {
  const {
    processedData,
    msaRegion,
    showLetters,
    setShowLetters,
    colorScheme,
    setColorScheme,
    rowColorMap,
  } = useMSA();
  const canMatchTreeOrder = useAppStore((state) =>
    Boolean(selectTreeController(state) && selectCurrentTree(state))
  );
  const canResetOrder = useAppStore((state) => {
    const rowOrder = selectMsaRowOrder(state);
    return Array.isArray(rowOrder) && rowOrder.length > 0;
  });

  const handleMatchTreeOrder = () => {
    const state = useAppStore.getState();
    const treeController = selectTreeController(state);
    const currentTree = selectCurrentTree(state);
    const frameIndex = selectFrameIndex(state);
    if (!treeController) return;
    if (!currentTree) return;

    const layout = treeController.calculateLayout(currentTree, { treeIndex: frameIndex });
    if (!Array.isArray(layout?.leaves)) return;

    const leaves = [...layout.leaves].sort((a, b) => (a.angle ?? 0) - (b.angle ?? 0));

    const seen = new Set();
    const order = [];
    for (const l of leaves) {
      const id = l?.name;
      if (typeof id === 'string' && id.length > 0 && !seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    }

    if (order.length) {
      selectSetMsaRowOrder(useAppStore.getState())(order);
    }
  };

  const handleResetOrder = () => {
    selectClearMsaRowOrder(useAppStore.getState())();
  };

  const sequenceType = processedData?.type;
  const colorSchemeGroups = getColorSchemeGroups(sequenceType);

  // A protein-only scheme makes no sense for DNA (and vice versa).
  React.useEffect(() => {
    if (sequenceType && !isColorSchemeAvailable(colorScheme, sequenceType)) {
      setColorScheme('default');
    }
  }, [colorScheme, sequenceType, setColorScheme]);

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 overflow-visible border-b border-border/60 bg-muted/30 px-2 py-1"
      role="toolbar"
      aria-label="Alignment viewer controls"
    >
      <span className="sr-only" aria-live="polite">
        {msaRegion ? `Alignment window ${msaRegion.start} to ${msaRegion.end}` : ''}
      </span>
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Alignment viewport controls"
      >
        <MSAViewActions />
      </div>

      <Separator
        orientation="vertical"
        className="mx-1 self-center opacity-40 data-[orientation=vertical]:h-4"
      />

      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Alignment row order controls"
      >
        <Button
          type="button"
          size="xs"
          variant="secondary"
          onClick={handleMatchTreeOrder}
          disabled={!canMatchTreeOrder}
          className="h-7 text-2xs font-medium"
        >
          Match Tree Order
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={handleResetOrder}
          disabled={!canResetOrder}
          className="h-7 border-border/40 text-2xs text-muted-foreground hover:text-foreground"
        >
          Reset Order
        </Button>
      </div>

      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Alignment coloring controls"
      >
        <Label
          htmlFor="msa-color-scheme"
          className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Coloring
        </Label>
        <Select value={colorScheme} onValueChange={setColorScheme}>
          <SelectTrigger
            id="msa-color-scheme"
            className="w-[160px] h-7 text-xs bg-background/50 border-border/40"
          >
            <SelectValue placeholder="Color Scheme" />
          </SelectTrigger>
          <SelectContent className="z-[2000]">
            {colorSchemeGroups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.schemes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator
        orientation="vertical"
        className="mx-1 self-center opacity-40 data-[orientation=vertical]:h-4"
      />

      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Alignment residue display controls"
      >
        <Switch
          id="msa-toggle-letters"
          checked={showLetters}
          onCheckedChange={setShowLetters}
          aria-label="Toggle residue letters"
          className="scale-75"
        />
        <Label htmlFor="msa-toggle-letters" className="text-xs">
          Letters
        </Label>
      </div>

      <div className="ml-auto min-w-0">
        {processedData ? (
          <MSAColorLegend
            colorScheme={colorScheme}
            sequenceType={sequenceType}
            hasTaxonColors={Object.keys(rowColorMap ?? {}).length > 0}
          />
        ) : (
          <span className="text-xs font-medium text-destructive">No alignment data</span>
        )}
      </div>
    </div>
  );
}
