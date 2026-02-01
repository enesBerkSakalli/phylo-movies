import React from 'react';
import { Info } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AlignmentAnalysisSection({ control, hasMsa, disabled }) {
  return (
    <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${!hasMsa ? 'bg-muted/30 opacity-60 border-dashed' : 'bg-card border-solid shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className={`size-4 ${!hasMsa ? 'text-muted-foreground' : 'text-primary'}`} />
          <span className="text-sm font-bold">Alignment Analysis</span>
        </div>
        {!hasMsa && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-[9px] cursor-help">MSA Required</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">These settings only apply when an MSA file is uploaded.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <FormField
        control={control}
        name="windowSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>Window Size</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100000}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-[11px] leading-tight">
              Alignment columns per frame (1–100k).
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
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>Step Size</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100000}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-[11px] leading-tight">
              Columns to advance per step (1–100k).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tree Inference Model Options */}
      <div className="pt-2 space-y-3">
        <span className={`text-xs font-medium uppercase tracking-wide ${!hasMsa ? 'text-muted-foreground' : 'text-foreground'}`}>
          Tree Inference Model
        </span>

        <FormField
          control={control}
          name="useGtr"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled || !hasMsa}
                />
              </FormControl>
              <div className="space-y-0.5 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  GTR Model
                </FormLabel>
                <FormDescription className="text-[10px] leading-tight">
                  {field.value
                    ? "General Time Reversible – more realistic for viral sequences"
                    : "Jukes-Cantor (JC) – simpler, faster, assumes equal substitution rates"}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="useGamma"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled || !hasMsa}
                />
              </FormControl>
              <div className="space-y-0.5 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  Gamma Rate Heterogeneity
                </FormLabel>
                <FormDescription className="text-[10px] leading-tight">
                  Accounts for rate variation across sites (slower but more accurate).
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="usePseudo"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled || !hasMsa}
                />
              </FormControl>
              <div className="space-y-0.5 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  Pseudocounts
                </FormLabel>
                <FormDescription className="text-[10px] leading-tight">
                  Recommended for gappy alignments with little sequence overlap.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
