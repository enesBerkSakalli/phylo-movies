import React from 'react';
import { Rocket } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';

export function ProjectActions({ disabled, reset, canSubmit, className }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={reset}
        disabled={disabled}
        className="w-full px-4 sm:w-auto"
      >
        Reset form
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !canSubmit}
        className="w-full px-6 sm:w-auto"
      >
        <Rocket data-icon="inline-start" />
        Create visualization
      </Button>
    </div>
  );
}
