import React from 'react';
import { useFormContext } from 'react-hook-form';
import { GitBranch } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '../../../../components/ui/form';
import { Switch } from '../../../../components/ui/switch';
import { cn } from '../../../../lib/utils';

export function TreeAdjustmentSection({ disabled, embedded = false }) {
  const { control } = useFormContext();

  return (
    <section
      className={cn('flex min-w-0 flex-col gap-4', !embedded && 'rounded-md border bg-card p-4')}
    >
      {!embedded && (
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Tree Adjustments</h3>
        </div>
      )}

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Normalize roots before movement comparison.
      </p>

      <FormField
        control={control}
        name="midpointRooting"
        render={({ field }) => (
          <FormItem className="flex h-fit items-center justify-between gap-4 rounded-md border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
            <div className="flex min-w-0 flex-col gap-1">
              <FormLabel className="cursor-pointer text-sm font-medium">Midpoint Rooting</FormLabel>
              <FormDescription className="text-2xs leading-tight">
                Root each tree at its diameter midpoint.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
            </FormControl>
          </FormItem>
        )}
      />
    </section>
  );
}
