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
      description="Model and rate variation."
    >
      <FormField
        control={control}
        name="useGtr"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <FormLabel className={cn('text-sm font-normal', !hasMsa && 'text-muted-foreground')}>
                Substitution Model
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
                ? 'GTR estimates rates and base frequencies.'
                : 'JC assumes equal rates and frequencies.'}
            </FormDescription>
          </FormItem>
        )}
      />

      <LabeledCheckboxField
        control={control}
        name="useGamma"
        label="Gamma Rate Heterogeneity"
        description="Adds site-rate variation."
        disabled={disabled || !hasMsa}
        muted={!hasMsa}
      />
    </TreeInferenceOptionGroup>
  );
}
