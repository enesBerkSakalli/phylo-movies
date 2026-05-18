import React from 'react';
import { useMSA } from './useMSA.js';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  selectClearMsaRowOrder,
  selectCurrentTree,
  selectCurrentTreeIndex,
  selectSetMsaRowOrder,
  selectTreeControllers,
  useAppStore
} from '../../state/phyloStore/store.js';
import { MSARegionOverrides, MSAViewActions, MSAVisibleRange } from './controls';

export function MSAControls() {
  const { processedData, showLetters, setShowLetters, colorScheme, setColorScheme } = useMSA();
  const treeControllers = useAppStore(selectTreeControllers);
  const currentTree = useAppStore(selectCurrentTree);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const setMsaRowOrder = useAppStore(selectSetMsaRowOrder);
  const clearMsaRowOrder = useAppStore(selectClearMsaRowOrder);

  const handleMatchTreeOrder = () => {
    const controller = treeControllers[0];
    if (!controller) return;
    if (!currentTree) return;

    const layout = controller.calculateLayout(currentTree, { treeIndex: currentTreeIndex });
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
      setMsaRowOrder(order);
    }
  };

  const handleResetOrder = () => {
    clearMsaRowOrder();
  };

  return (
    <div className="px-2 py-1 flex flex-wrap items-center gap-2 bg-muted/30 border-b border-border/60 shrink-0 overflow-x-auto overflow-y-hidden">
      <MSARegionOverrides />

      <Separator orientation="vertical" className="h-4 mx-2 opacity-40" />

      <div className="flex items-center gap-1">
        <MSAViewActions />
      </div>

      <Separator orientation="vertical" className="h-4 mx-2 opacity-40" />

      <div className="flex items-center gap-2">
        <Button size="xs" variant="secondary" onClick={handleMatchTreeOrder} className="h-7 text-[11px] font-medium">Match Tree Order</Button>
        <Button size="xs" variant="outline" onClick={handleResetOrder} className="h-7 border-border/40 text-muted-foreground hover:text-foreground text-[11px]">Reset Order</Button>
      </div>

      <MSAVisibleRange />

      <Separator orientation="vertical" className="h-4 mx-2 opacity-40" />

      <div className="flex items-center gap-2">
        <Label htmlFor="msa-color-scheme" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coloring</Label>
        <Select value={colorScheme} onValueChange={setColorScheme}>
          <SelectTrigger id="msa-color-scheme" className="w-[160px] h-7 text-xs bg-background/50 border-border/40">
            <SelectValue placeholder="Color Scheme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (Empty)</SelectItem>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="clustal">Clustal</SelectItem>
            <SelectItem value="clustal2">Clustal2</SelectItem>
            <SelectItem value="hydrophobicity">Hydrophobicity</SelectItem>
            <SelectItem value="zappo">Zappo</SelectItem>
            <SelectItem value="taylor">Taylor</SelectItem>
            <SelectItem value="buried">Buried</SelectItem>
            <SelectItem value="cinema">Cinema</SelectItem>
            <SelectItem value="helix">Helix</SelectItem>
            <SelectItem value="lesk">Lesk</SelectItem>
            <SelectItem value="mae">Mae</SelectItem>
            <SelectItem value="strand">Strand</SelectItem>
            <SelectItem value="turn">Turn</SelectItem>
            <SelectItem value="nucleotide">Nucleotide (DNA)</SelectItem>
            <SelectItem value="purine">Purine (DNA)</SelectItem>
            <SelectItem value="identity">Identity to Consensus</SelectItem>
            <SelectItem value="similarity">Similarity to Consensus</SelectItem>
            <SelectItem value="grayscale">Grayscale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-4 mx-2 opacity-40" />

      <div className="flex items-center gap-2">
        <Switch id="msa-toggle-letters" checked={showLetters} onCheckedChange={setShowLetters} aria-label="Toggle residue letters" className="scale-75" />
        <Label htmlFor="msa-toggle-letters" className="text-xs">Letters</Label>
      </div>

      <div className="ml-auto">
        {processedData ? (
          <Badge variant="secondary" className="text-xs">{processedData.type.toUpperCase()}</Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">No data</Badge>
        )}
      </div>
    </div>
  );
}
