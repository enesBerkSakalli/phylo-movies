import React from 'react';
import { useFormContext } from 'react-hook-form';
import { SlidersHorizontal } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SlidingWindowSection({ hasMsa, disabled }) {
  const { control } = useFormContext();

  return (
    <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${!hasMsa ? 'bg-muted/30 opacity-60 border-dashed' : 'bg-card border-solid shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className={`size-4 ${!hasMsa ? 'text-muted-foreground' : 'text-primary'}`} />
          <span className="text-sm font-bold">Overlapping Sliding Windows</span>
        </div>
        {!hasMsa && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-2xs h-5 py-0 cursor-help uppercase tracking-tighter">MSA Required</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Sliding window settings only apply when an MSA file is uploaded.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <p className="text-2xs text-muted-foreground leading-relaxed">
        The alignment is partitioned into overlapping windows. Each window yields one inferred tree. When stride &lt; window size, consecutive windows share alignment columns.
      </p>

      <FormField
        control={control}
        name="windowSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>Window Size (sites)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100000}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9 tabular-nums"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-2xs leading-tight">
              Number of nucleotide columns per sliding window frame.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="stepSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>Step Size (sites)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100000}
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
    </div>
  );
}
