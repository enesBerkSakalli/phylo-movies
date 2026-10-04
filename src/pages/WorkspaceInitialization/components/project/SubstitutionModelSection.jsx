import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Microscope } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '../../../../components/ui/form';
import { Switch } from '../../../../components/ui/switch';
import { cn } from '../../../../lib/utils';
import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';
import { LabeledCheckboxField } from './LabeledCheckboxField.jsx';

export function SubstitutionModelSection({ hasMsa, disabled }) {
  const { control } = useFormContext();

  return (
    <TreeInferenceOptionGroup
      icon={Microscope}
      title="Substitution model"
      description="How DNA changes are modelled along branches."
    >
      <FormField
        control={control}
        name="useGtr"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <FormLabel className={cn('text-sm font-normal', !hasMsa && 'text-muted-foreground')}>
                Model
              </FormLabel>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    !field.value ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  JC
                </span>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled || !hasMsa}
                  />
                </FormControl>
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    field.value ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  GTR
                </span>
              </div>
            </div>
            <FormDescription className="text-2xs leading-tight">
              {field.value
                ? 'GTR: each type of substitution gets its own rate. Recommended for real data.'
                : 'JC: all substitutions equally likely. Simplest and fastest model.'}
            </FormDescription>
          </FormItem>
        )}
      />

      <LabeledCheckboxField
        control={control}
        name="useGamma"
        label="Gamma rate variation"
        description="Lets some sites evolve faster than others. Recommended for most real data."
        disabled={disabled || !hasMsa}
        muted={!hasMsa}
      />
    </TreeInferenceOptionGroup>
  );
}
