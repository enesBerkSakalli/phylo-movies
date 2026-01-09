import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A reusable slider component with a label and value display,
 * designed to fit consistently in the application sidebars.
 */
export function LabeledSlider({
  id,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  valueDisplay,
  title,
  ariaLabel,
  className,
}) {
  return (
    <div className={cn("grid gap-2.5", className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          title={title}
          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
        {valueDisplay && (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {valueDisplay}
          </span>
        )}
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={onChange}
        aria-label={ariaLabel || label}
        className="w-full py-1"
      />
    </div>
  );
}
