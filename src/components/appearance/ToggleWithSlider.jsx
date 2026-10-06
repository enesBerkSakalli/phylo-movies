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
  // sliderValue is the opacity of unfocused branches; the control shows how
  // strongly they are dimmed, so moving right always means fainter.
  const dimStrength = 1 - sliderValue;

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
              className="text-2xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {sliderLabel}
            </Label>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(dimStrength * 100)}%
            </span>
          </div>
          <Slider
            id={`${id}-opacity-slider`}
            min={0}
            max={1}
            step={0.05}
            value={[dimStrength]}
            onValueChange={([strength]) => onSliderChange([1 - strength])}
            className="w-full py-1"
          />
          <div className="text-2xs text-muted-foreground leading-tight">
            Higher values make unfocused branches fainter.
          </div>
        </div>
      )}
    </div>
  );
}
