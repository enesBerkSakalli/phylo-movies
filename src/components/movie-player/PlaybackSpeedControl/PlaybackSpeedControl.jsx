import React from 'react';
import { Slider } from '../../ui/slider';
import { AppTooltip } from '../../ui/app-tooltip';
import { Gauge } from 'lucide-react';

export function PlaybackSpeedControl({ value, setValue }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-labelledby="speed-control-label">
      <span id="speed-control-label" className="sr-only">
        Playback speed
      </span>
      <AppTooltip content={<p>Playback speed: {value.toFixed(1)}×</p>}>
        <Gauge className="size-4" />
      </AppTooltip>
      <Slider
        id="animation-speed-range"
        min={0.1}
        max={5}
        step={0.1}
        value={[value]}
        onValueChange={([speed]) => setValue(speed)}
        aria-label="Playback speed"
        className="w-32 [&_[data-slot=slider-thumb]]:size-[18px]"
      />
      <span className="w-9 text-right text-xs font-semibold tabular-nums" aria-hidden>
        {value.toFixed(1)}×
      </span>
    </div>
  );
}
