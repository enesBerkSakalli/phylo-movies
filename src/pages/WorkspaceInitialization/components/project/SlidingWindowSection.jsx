import React from 'react';
import { useFormContext } from 'react-hook-form';
import { SlidersHorizontal } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { cn } from '../../../../lib/utils';
import { STEP_MAX, STEP_MIN, WINDOW_MAX, WINDOW_MIN } from "../../workspaceInitializationFormModel.js";
import { MsaRequiredBadge } from './MsaRequiredBadge.jsx';

export function SlidingWindowSection({ hasMsa, hasTrees = false, disabled, embedded = false }) {
  const { control } = useFormContext();
  const description = hasTrees
    ? 'Map alignment columns onto the uploaded tree sequence.'
    : 'Window and stride used to infer one tree per MSA slice.';

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4 transition-colors',
        embedded ? '' : 'rounded-md border p-4',
        !embedded && (!hasMsa ? 'border-dashed bg-muted/30' : 'bg-card')
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className={cn('size-4', !hasMsa ? 'text-muted-foreground' : 'text-primary')} />
            <h3 className="text-sm font-semibold">Overlapping Sliding Windows</h3>
          </div>
          {!hasMsa && (
            <MsaRequiredBadge description="Sliding window settings only apply when an MSA file is uploaded." />
          )}
        </div>
      )}

      <p className="text-2xs text-muted-foreground leading-relaxed">{description}</p>

      <FormField
        control={control}
        name="windowSize"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>Window Size (sites)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={WINDOW_MIN}
                max={WINDOW_MAX}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9 tabular-nums"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-2xs leading-tight">
              Nucleotide columns per window.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="stepSize"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>Step Size (sites)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={STEP_MIN}
                max={STEP_MAX}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9 tabular-nums"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-2xs leading-tight">
              Site stride between windows.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
