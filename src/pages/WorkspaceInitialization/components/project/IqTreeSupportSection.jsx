import React from 'react';
import { useFormContext } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../components/ui/form';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../lib/utils';
import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';
import {
  IQTREE_REPLICATE_COUNT_MAX,
  IQTREE_SH_ALRT_REPLICATE_COUNT_MIN,
  IQTREE_UFBOOT_REPLICATE_COUNT_MIN,
} from '../../workspaceInitializationFormModel.js';

export function IqTreeSupportSection({
  hasMsa,
  disabled,
  supportMode,
  supportsUfboot,
  supportsShAlrt,
}) {
  const { control } = useFormContext();
  const hasSupportRun = supportMode !== 'none';

  return (
    <TreeInferenceOptionGroup
      icon={ShieldCheck}
      title="Branch support annotations"
      description="Optional IQ-TREE labels for SPR move review."
    >
      <FormField
        control={control}
        name="iqtreeSupportMode"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel className={cn('text-sm font-normal', !hasMsa && 'text-muted-foreground')}>
              Support Mode
            </FormLabel>
            <Select
              value={field.value || 'none'}
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
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="ufboot">UFBoot</SelectItem>
                  <SelectItem value="sh_alrt">SH-aLRT</SelectItem>
                  <SelectItem value="sh_alrt_ufboot">SH-aLRT + UFBoot</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormDescription className="text-2xs leading-tight">
              {field.value === 'none'
                ? 'No support run will be requested.'
                : 'Replicates and optional BNNI are sent with the support run.'}
            </FormDescription>
          </FormItem>
        )}
      />

      {hasSupportRun && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {supportsUfboot && (
              <ReplicateInput
                control={control}
                name="iqtreeUfbootReplicates"
                label="UFBoot replicates"
                min={IQTREE_UFBOOT_REPLICATE_COUNT_MIN}
                disabled={disabled || !hasMsa}
              />
            )}
            {supportsShAlrt && (
              <ReplicateInput
                control={control}
                name="iqtreeShAlrtReplicates"
                label="SH-aLRT replicates"
                min={IQTREE_SH_ALRT_REPLICATE_COUNT_MIN}
                disabled={disabled || !hasMsa}
              />
            )}
          </div>

          <FormField
            control={control}
            name="iqtreeBnni"
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
                    Bootstrap NNI
                  </FormLabel>
                  <FormDescription className="text-2xs leading-tight">
                    Enables IQ-TREE <code>-bnni</code>.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </>
      )}
    </TreeInferenceOptionGroup>
  );
}

function ReplicateInput({ control, name, label, min, disabled }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col gap-2">
          <FormLabel className={cn('text-sm font-normal', disabled && 'text-muted-foreground')}>
            {label}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              min={min}
              max={IQTREE_REPLICATE_COUNT_MAX}
              step={100}
              inputMode="numeric"
              disabled={disabled}
              className="h-9 tabular-nums"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
