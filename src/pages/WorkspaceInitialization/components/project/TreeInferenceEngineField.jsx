import React from 'react';
import { useFormContext } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "../../../../components/ui/form";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { cn } from '../../../../lib/utils';

export function TreeInferenceEngineField({ hasMsa, disabled, isFastTree }) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="treeInferenceEngine"
      render={({ field }) => (
        <FormItem className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
          <FormLabel className={cn("text-sm font-medium", !hasMsa && "text-muted-foreground")}>
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
              <SelectGroup>
                <SelectItem value="iqtree">IQ-TREE</SelectItem>
                <SelectItem value="fasttree">FastTree 2</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormDescription className="text-2xs leading-tight">
            {isFastTree
              ? "Fast exploratory window inference."
              : "Default maximum-likelihood window inference."}
          </FormDescription>
        </FormItem>
      )}
    />
  );
}
