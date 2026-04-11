import React, { useEffect, useState } from 'react';
import { useMSA } from '../MSAContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const clampPositive = (value) => Math.max(1, Math.round(Number(value) || 1));

export function MSARegionOverrides() {
  const { msaRegion, setMsaRegion, clearMsaRegion } = useMSA();
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');

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

  const handleClearRegion = () => {
    clearMsaRegion();
    setStartValue('');
    setEndValue('');
  };

  return (
    <div className="flex items-center gap-2">
      <LabelledRangeInputs
        startValue={startValue}
        endValue={endValue}
        setStartValue={setStartValue}
        setEndValue={setEndValue}
      />
      <div className="flex items-center gap-1 ml-1">
        <Button size="xs" onClick={handleSetRegion} disabled={!startValue || !endValue} className="h-7 px-3">Set</Button>
        <Button size="xs" variant="ghost" onClick={handleClearRegion} className="h-7 text-muted-foreground hover:text-foreground">Clear</Button>
      </div>
    </div>
  );
}

function LabelledRangeInputs({ startValue, endValue, setStartValue, setEndValue }) {
  return (
    <>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Region</span>
      <div className="flex items-center gap-1">
        <Input
          id="msa-start"
          type="number"
          min={1}
          value={startValue}
          onChange={(e) => setStartValue(e.target.value)}
          className="w-20 h-7 text-xs tabular-nums bg-background/50 border-border/40"
          aria-label="Start column"
        />
        <span className="text-2xs text-muted-foreground font-medium">–</span>
        <Input
          id="msa-end"
          type="number"
          min={1}
          value={endValue}
          onChange={(e) => setEndValue(e.target.value)}
          className="w-20 h-7 text-xs tabular-nums bg-background/50 border-border/40"
          aria-label="End column"
        />
      </div>
    </>
  );
}
