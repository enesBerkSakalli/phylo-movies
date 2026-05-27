import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Wrench } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '../../../../components/ui/form';
import { Checkbox } from '../../../../components/ui/checkbox';
import { cn } from '../../../../lib/utils';
import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';

export function FastTreeOptionsSection({ hasMsa, disabled }) {
  const { control } = useFormContext();

  return (
    <TreeInferenceOptionGroup
      icon={Wrench}
      title="FastTree-only options"
      description="FastTree-specific flags."
    >
      <FormField
        control={control}
        name="usePseudo"
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
                Pseudocounts
              </FormLabel>
              <FormDescription className="text-2xs leading-tight">
                Sends FastTree <code>-pseudo</code>.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="noMl"
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
                Skip ML Optimization
              </FormLabel>
              <FormDescription className="text-2xs leading-tight">
                Sends FastTree <code>-noml</code>.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </TreeInferenceOptionGroup>
  );
}
