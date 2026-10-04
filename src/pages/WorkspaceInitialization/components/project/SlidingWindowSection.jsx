import React from 'react';
import { useFormContext } from 'react-hook-form';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import {
  STEP_MAX,
  STEP_MIN,
  WINDOW_MAX,
  WINDOW_MIN,
} from '../../workspaceInitializationFormModel.js';
import { MsaGatedFormSection } from './MsaGatedFormSection.jsx';

export function SlidingWindowSection({
  hasMsa,
  hasTrees = false,
  disabled,
  embedded = false,
  windowPlan = null,
  onApplySuggestion,
}) {
  const { control, watch } = useFormContext();
  const windowSize = Number(watch('windowSize'));
  const stepSize = Number(watch('stepSize'));
  const description = hasTrees
    ? 'Map alignment columns onto the uploaded tree sequence.'
    : 'Window and stride used to infer one tree per MSA slice.';

  return (
    <MsaGatedFormSection
      icon={SlidersHorizontal}
      title="Overlapping Sliding Windows"
      badgeDescription="Sliding window settings only apply when an MSA file is uploaded."
      description={description}
      hasMsa={hasMsa}
      embedded={embedded}
    >
      <FormField
        control={control}
        name="windowSize"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>
              Window Size (sites)
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                min={WINDOW_MIN}
                max={WINDOW_MAX}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9 tabular-nums"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-2xs leading-tight">
              Alignment columns used to infer each tree.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="stepSize"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel className={!hasMsa ? 'text-muted-foreground' : ''}>
              Step Size (sites)
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                min={STEP_MIN}
                max={STEP_MAX}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled || !hasMsa}
                className="bg-background/50 h-9 tabular-nums"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-2xs leading-tight">
              Columns between window centres. Sets how many windows (trees) there are.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {windowPlan && (
        <WindowPlanStatus
          plan={windowPlan}
          windowSize={windowSize}
          stepSize={stepSize}
          disabled={disabled}
          onApplySuggestion={onApplySuggestion}
        />
      )}
    </MsaGatedFormSection>
  );
}

function WindowPlanStatus({ plan, windowSize, stepSize, disabled, onApplySuggestion }) {
  const { alignment, treeCount, suggestion, windowCount, warnings } = plan;
  const differsFromSuggestion =
    suggestion && (suggestion.windowSize !== windowSize || suggestion.stepSize !== stepSize);

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs" role="status">
      <p className="tabular-nums">
        <span className="font-medium">
          {alignment.sequenceCount.toLocaleString()} sequences ×{' '}
          {alignment.siteCount.toLocaleString()} sites
        </span>
        {windowCount ? (
          <span className="text-muted-foreground">
            {' '}
            · {windowCount.toLocaleString()} windows
            {treeCount ? ` for ${treeCount.toLocaleString()} trees` : ''}
          </span>
        ) : null}
      </p>
      {warnings.map((warning) => (
        <p key={warning} className="flex gap-1.5 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {warning}
        </p>
      ))}
      {differsFromSuggestion && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-xs"
          disabled={disabled}
          onClick={onApplySuggestion}
        >
          Use suggested {suggestion.windowSize.toLocaleString()} /{' '}
          {suggestion.stepSize.toLocaleString()}
          {treeCount ? ' (one window per tree)' : ''}
        </Button>
      )}
    </div>
  );
}
