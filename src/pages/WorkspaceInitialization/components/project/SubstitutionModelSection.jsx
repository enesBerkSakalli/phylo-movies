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
import { Checkbox } from '../../../../components/ui/checkbox';
import { Switch } from '../../../../components/ui/switch';
import { cn } from '../../../../lib/utils';
import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';

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

      <FormField
        control={control}
        name="useGamma"
        render={({ field }) => (
          <FormItem className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled || !hasMsa}
              />
            </FormControl>
            <div className="flex flex-col gap-1 leading-none">
              <FormLabel
                className={cn(
                  'cursor-pointer text-sm font-normal',
                  !hasMsa && 'text-muted-foreground'
                )}
              >
                Gamma Rate Heterogeneity
              </FormLabel>
              <FormDescription className="text-2xs leading-tight">
                Adds site-rate variation.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </TreeInferenceOptionGroup>
  );
}
