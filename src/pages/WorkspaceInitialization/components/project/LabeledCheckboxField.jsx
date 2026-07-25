import React from 'react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '../../../../components/ui/form';
import { Checkbox } from '../../../../components/ui/checkbox';
import { cn } from '../../../../lib/utils';

/**
 * A checkbox form field with a label and description, muted when the
 * setting doesn't currently apply (as opposed to `disabled`, which only
 * locks interaction without implying the setting is inapplicable).
 */
export function LabeledCheckboxField({ control, name, label, description, disabled, muted = false }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start gap-3">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
          <div className="flex flex-col gap-1 leading-none">
            <FormLabel className={cn('cursor-pointer text-sm font-normal', muted && 'text-muted-foreground')}>
              {label}
            </FormLabel>
            <FormDescription className="text-2xs leading-tight">{description}</FormDescription>
          </div>
        </FormItem>
      )}
    />
  );
}
