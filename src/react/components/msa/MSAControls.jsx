import React, { useState, useEffect } from 'react';
import { useMSA } from './MSAContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const clampPositive = (value) => Math.max(1, Math.round(Number(value) || 1));

export function MSAControls() {
  const { processedData, msaRegion, setMsaRegion, clearMsaRegion, showLetters, setShowLetters, colorScheme, setColorScheme, triggerViewAction, visibleRange } = useMSA();

  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');

  // Sync local inputs with global state
  useEffect(() => {
    if (msaRegion) {
      setStartValue(String(msaRegion.start));
      setEndValue(String(msaRegion.end));
    } else {
      setStartValue('');
      setEndValue('');
    }
  }, [msaRegion]);

  const handleSetRegion = () => {
    let start = clampPositive(startValue);
    let end = clampPositive(endValue);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (start > end) [start, end] = [end, start];
      setMsaRegion(start, end);
    }
  };

  const handleClear = () => {
    clearMsaRegion();
    setStartValue('');
    setEndValue('');
  };

  return (
    <div className="px-1.5 py-1 border-b border-border flex flex-wrap items-center gap-1.5 bg-card">
      <div className="flex items-center gap-1">
        <label htmlFor="msa-start" className="text-xs font-medium">Region</label>
        <Input
          id="msa-start"
          type="number"
          min={1}
          value={startValue}
          onChange={(e) => setStartValue(e.target.value)}
          className="w-20 h-7 text-xs"
          aria-label="Start column"
        />
        <span className="text-[10px] text-muted-foreground">to</span>
        <Input
          id="msa-end"
          type="number"
          min={1}
          value={endValue}
          onChange={(e) => setEndValue(e.target.value)}
          className="w-20 h-7 text-xs"
          aria-label="End column"
        />
        <Button size="xs" onClick={handleSetRegion} disabled={!startValue || !endValue}>Set</Button>
        <Button size="xs" variant="outline" onClick={handleClear}>Clear</Button>
      </div>

      <div className="h-6 w-px bg-border mx-2" />

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon-xs" onClick={() => triggerViewAction('ZOOM_IN')} title="Zoom In">
          <ZoomIn className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => triggerViewAction('ZOOM_OUT')} title="Zoom Out">
          <ZoomOut className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => triggerViewAction('RESET')} title="Reset View">
          <RotateCcw className="size-3.5" />
        </Button>
      </div>

      {visibleRange && (
        <div className="text-xs text-muted-foreground border-l border-border pl-3 ml-1">
          Visible: {visibleRange.start} - {visibleRange.end}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Select value={colorScheme} onValueChange={setColorScheme}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Color Scheme" />
          </SelectTrigger>
          <SelectContent>
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
            <SelectItem value="grayscale">Grayscale</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border mx-1" />

        <Switch id="msa-toggle-letters" checked={showLetters} onCheckedChange={setShowLetters} aria-label="Toggle residue letters" className="scale-75" />
        <label htmlFor="msa-toggle-letters" className="text-xs">Letters</label>
        {processedData ? (
          <Badge variant="secondary" className="text-xs">{processedData.type.toUpperCase()}</Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">No data</Badge>
        )}
      </div>
    </div>
  );
}
