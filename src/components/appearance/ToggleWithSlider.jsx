import React from 'react';
import { ToggleWithLabel } from '../ui/toggle-with-label';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';

export function ToggleWithSlider({
  id,
  label,
  description,
  checked,
  onToggle,
  sliderValue,
  onSliderChange,
  sliderLabel,
}) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleWithLabel
        id={id}
        label={label}
        description={description}
        checked={checked}
        onCheckedChange={onToggle}
        switchPosition="left"
      />
      {checked && (
        <div className="flex flex-col gap-3 pl-8 pr-1">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${id}-opacity-slider`}
              className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/70"
            >
              {sliderLabel}
            </Label>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round((1 - sliderValue) * 100)}%
            </span>
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
          <div className="text-2xs text-muted-foreground/80 leading-tight">
            Lower values make unfocused branches fainter.
          </div>
        </div>
      )}
    </div>
  );
}
