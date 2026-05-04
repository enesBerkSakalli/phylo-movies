import React from 'react';
import { useFormContext } from 'react-hook-form';
import { GitBranch, Trees } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function TreeConstructionSection({ hasMsa, hasTrees, disabled }) {
  const { control, watch } = useFormContext();
  const treeInferenceEngine = watch('treeInferenceEngine') || 'iqtree';
  const isFastTree = treeInferenceEngine === 'fasttree';

  return (
    <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${!hasMsa ? 'bg-muted/30 opacity-60 border-dashed' : 'bg-card border-solid shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trees className={`size-4 ${!hasMsa ? 'text-muted-foreground' : 'text-primary'}`} />
          <span className="text-sm font-bold">
            Tree Construction
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

      <div className="space-y-3">
        <FormField
          control={control}
          name="treeInferenceEngine"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className={`text-sm font-normal ${!hasMsa ? 'text-muted-foreground' : ''}`}>
                Inference Engine
              </FormLabel>
              <Select
                value={field.value || 'iqtree'}
                onValueChange={field.onChange}
                disabled={disabled || !hasMsa}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="iqtree">IQ-TREE</SelectItem>
                  <SelectItem value="fasttree">FastTree 2</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="text-2xs leading-tight">
                {isFastTree
                  ? "FastTree is faster for exploratory sliding-window runs and exposes FastTree-specific pseudocount and no-ML options."
                  : "IQ-TREE is the default maximum-likelihood engine using fast search for responsive MSA window inference."}
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="midpointRooting"
          render={({ field }) => (
            <FormItem className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between gap-4 h-fit space-y-0 transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="size-4 text-primary" />
                  <FormLabel className="font-medium cursor-pointer text-sm">
                    Midpoint Rooting
                  </FormLabel>
                </div>
                <FormDescription className="text-2xs leading-tight max-w-[24rem]">
                  Establish the root at the branch that bisects the tree diameter. Applies to uploaded trees or trees inferred from MSA windows.
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
                  Gamma Rate Heterogeneity
                </FormLabel>
                <FormDescription className="text-2xs leading-tight">
                  Adds gamma-distributed site-rate variation to the selected engine's substitution model.
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
                  disabled={disabled || !hasMsa || !isFastTree}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa || !isFastTree ? 'text-muted-foreground' : ''}`}>
                  Pseudocounts
                </FormLabel>
                <FormDescription className="text-2xs leading-tight">
                  FastTree-only regularization for fragmentary sequences with limited overlap.
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
                  disabled={disabled || !hasMsa || !isFastTree}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={`text-sm font-normal cursor-pointer ${!hasMsa || !isFastTree ? 'text-muted-foreground' : ''}`}>
                  Skip ML Optimization
                </FormLabel>
                <FormDescription className="text-2xs leading-tight">
                  FastTree-only option that skips maximum-likelihood NNI updates. Faster but less accurate; branch lengths may be negative.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>

      <p className="text-2xs text-muted-foreground italic leading-tight">
        {hasTrees
          ? "Inference options apply only when an MSA file is provided. Midpoint rooting still applies to uploaded trees."
          : "Upload an MSA to infer trees here, or upload precomputed trees and use midpoint rooting only."}
      </p>
    </div>
  );
}
