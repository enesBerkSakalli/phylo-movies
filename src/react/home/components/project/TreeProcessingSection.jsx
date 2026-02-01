import React from 'react';
import { GitBranch } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

export function TreeProcessingSection({ control, hasTrees, hasMsa, disabled }) {
  return (
    <div className="space-y-4 p-4 rounded-xl border bg-card shadow-sm border-solid">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="size-4 text-primary" />
        <span className="text-sm font-bold">Tree Processing</span>
      </div>

      <FormField
        control={control}
        name="midpointRooting"
        render={({ field }) => (
          <FormItem className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between gap-4 h-fit space-y-0 transition-colors hover:bg-muted/30">
            <div className="space-y-1">
              <FormLabel className="font-medium cursor-pointer text-sm">Midpoint Rooting</FormLabel>
              <FormDescription className="text-[11px] leading-tight max-w-[160px]">
                Automatically root trees at their midpoint.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="pt-2">
        <p className="text-[10px] text-muted-foreground italic leading-tight">
          {hasTrees
            ? "Applies to uploaded Newick/JSON trees."
            : hasMsa
              ? "Applies to trees generated from MSA segments."
              : "Configure how trees will be rooted."}
        </p>
      </div>
    </div>
  );
}
