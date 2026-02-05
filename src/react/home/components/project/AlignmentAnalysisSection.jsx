import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Info } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AlignmentAnalysisSection({ hasMsa, disabled }) {
  const { control } = useFormContext();

  return (
    <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${!hasMsa ? 'bg-muted/30 opacity-60 border-dashed' : 'bg-card border-solid shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className={`size-4 ${!hasMsa ? 'text-muted-foreground' : 'text-primary'}`} />
          <span className="text-sm font-bold">
            Tree Construction via <a href="https://morgannprice.github.io/fasttree/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">FastTree 2</a>
          </span>
        </div>
        {!hasMsa && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-2xs h-5 py-0 cursor-help uppercase tracking-tighter">MSA Required</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Tree construction settings only apply when an MSA file is uploaded.</p>
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
              Number of sites to advance between consecutive windows.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tree Construction Model Options */}
      <div className="pt-2 space-y-3">
        <FormField
          control={control}
          name="useGtr"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className={`text-sm font-normal ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  Substitution Model
                </FormLabel>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium tabular-nums ${!field.value ? 'text-foreground' : 'text-muted-foreground'}`}>JC</span>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled || !hasMsa}
                    />
                  </FormControl>
                  <span className={`text-xs font-medium tabular-nums ${field.value ? 'text-foreground' : 'text-muted-foreground'}`}>GTR</span>
                </div>
              </div>
              <FormDescription className="text-2xs leading-tight">
                {field.value 
                  ? "GTR: General Time Reversible with 6 substitution rates and 4 base frequencies."
                  : "JC: Jukes-Cantor assumes equal substitution rates and base frequencies."}
              </FormDescription>
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
              <div className="space-y-1 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  Gamma20 Likelihood
                </FormLabel>
                <FormDescription className="text-2xs leading-tight">
                  Rescales branch lengths and computes likelihood under a discrete gamma distribution with 20 rate categories. Makes likelihoods comparable across runs (~5% slower).
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
              <div className="space-y-1 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  Pseudocounts
                </FormLabel>
                <FormDescription className="text-2xs leading-tight">
                  Regularization for fragmentary sequences. Recommended when alignments contain partial sequences with limited overlap.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="noMl"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled || !hasMsa}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                  Skip ML Optimization
                </FormLabel>
                <FormDescription className="text-2xs leading-tight">
                  Skip the maximum-likelihood NNI phase and use only minimum-evolution criteria. Faster but less accurate; branch lengths may be negative.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
