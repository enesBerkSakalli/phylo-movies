import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Gauge } from "lucide-react";

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "../../../../components/ui/form";
import { Checkbox } from "../../../../components/ui/checkbox";
import { cn } from '../../../../lib/utils';
import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';

export function IqTreeSearchSection({ hasMsa, disabled, supportsUfboot }) {
  const { control } = useFormContext();

  return (
    <TreeInferenceOptionGroup
      icon={Gauge}
      title="Search strategy"
      description={supportsUfboot ? "UFBoot disables fast search." : "Speed versus thoroughness."}
    >
      <FormField
        control={control}
        name="iqtreeFastSearch"
        render={({ field }) => (
          <FormItem className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled || !hasMsa || supportsUfboot}
              />
            </FormControl>
            <div className="flex flex-col gap-1 leading-none">
              <FormLabel className={cn("cursor-pointer text-sm font-normal", (!hasMsa || supportsUfboot) && "text-muted-foreground")}>
                IQ-TREE Fast Search
              </FormLabel>
              <FormDescription className="text-2xs leading-tight">
                {supportsUfboot
                  ? "UFBoot disables IQ-TREE -fast."
                  : "Use IQ-TREE -fast for responsive runs."}
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </TreeInferenceOptionGroup>
  );
}
