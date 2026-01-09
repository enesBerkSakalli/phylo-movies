import React, { useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Gauge } from 'lucide-react';

export function PlaybackSpeedControl({ value, setValue }) {
  const handleChange = useCallback((vals) => {
    const v = Array.isArray(vals) ? vals[0] : 1;
    if (typeof v === 'number' && Number.isFinite(v)) setValue(v);
  }, [setValue]);

  return (
    <div className="speed-control" role="group" aria-labelledby="speed-control-label">
      <Gauge className="size-4" />
      <Slider
        id="animation-speed-range"
        min={0.1}
        max={5}
        step={0.1}
        value={[value]}
        onValueChange={handleChange}
        aria-label="Animation speed"
        className="w-32"
      />
    </div>
  );
}
