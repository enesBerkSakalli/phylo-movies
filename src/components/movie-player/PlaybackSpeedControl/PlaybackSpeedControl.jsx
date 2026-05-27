import React, { useCallback } from 'react';
import { Slider } from '../../ui/slider';
import { AppTooltip } from '../../ui/app-tooltip';
import { Gauge } from 'lucide-react';

export function PlaybackSpeedControl({ value, setValue }) {
  const handleChange = useCallback(
    (vals) => {
      const v = Array.isArray(vals) ? vals[0] : 1;
      if (typeof v === 'number' && Number.isFinite(v)) setValue(v);
    },
    [setValue]
  );

  return (
    <div className="speed-control" role="group" aria-labelledby="speed-control-label">
      <span id="speed-control-label" className="sr-only">
        Playback speed
      </span>
      <AppTooltip content={<p>Playback Speed: {value}x</p>}>
        <Gauge className="size-4" />
      </AppTooltip>
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
