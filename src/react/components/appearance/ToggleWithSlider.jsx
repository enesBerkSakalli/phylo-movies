import React from 'react';
import { ToggleWithLabel } from '@/components/ui/toggle-with-label';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export function ToggleWithSlider({ id, label, description, checked, onToggle, sliderValue, onSliderChange, sliderLabel }) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleWithLabel id={id} label={label} description={description} checked={checked} onCheckedChange={onToggle} switchPosition="left" />
      {checked && (
        <div className="flex flex-col gap-3 pl-8 pr-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${id}-opacity-slider`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{sliderLabel}</Label>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round((1 - sliderValue) * 100)}%</span>
          </div>
          <Slider
            id={`${id}-opacity-slider`}
            min={0}
            max={1}
            step={0.05}
            value={[sliderValue]}
            onValueChange={onSliderChange}
            className="w-full py-1"
          />
          <div className="text-[10px] text-muted-foreground/80 leading-tight">
            Lower opacity increases dimming intensity for non-focused elements.
          </div>
        </div>
      )}
    </div>
  );
}
