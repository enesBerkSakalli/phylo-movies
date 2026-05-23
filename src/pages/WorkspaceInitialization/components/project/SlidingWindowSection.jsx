import React from 'react';
import { useFormContext } from 'react-hook-form';
import { SlidersHorizontal } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { cn } from '../../../../lib/utils';
import { STEP_MAX, STEP_MIN, WINDOW_MAX, WINDOW_MIN } from "../../workspaceInitializationFormModel.js";
import { MsaRequiredBadge } from './MsaRequiredBadge.jsx';

export function SlidingWindowSection({ hasMsa, disabled }) {
  const { control } = useFormContext();

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-md border p-4 transition-colors',
        !hasMsa ? 'border-dashed bg-muted/30 opacity-60' : 'bg-card'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className={cn('size-4', !hasMsa ? 'text-muted-foreground' : 'text-primary')} />
          <h3 className="text-sm font-semibold">Overlapping Sliding Windows</h3>
        </div>
        {!hasMsa && (
          <MsaRequiredBadge description="Sliding window settings only apply when an MSA file is uploaded." />
        )}
      </div>

      <p className="text-2xs text-muted-foreground leading-relaxed">
        The alignment is divided into overlapping sliding windows. Each window yields one input tree. When stride &lt; window size, consecutive windows share alignment columns.
      </p>

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
              Number of nucleotide columns per sliding window.
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
              Advancement between consecutive windows (in sites). Step sizes &lt; window size creates overlap.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
