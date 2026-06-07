import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { Info } from 'lucide-react';

export function EmptyStateAlert({ mode }) {
  return (
    <Alert className="bg-muted/30 border-dashed border-muted-foreground/30 py-6">
      <div className="col-span-2 col-start-1 flex w-full flex-col items-center gap-2 text-center">
        <div className="p-3 rounded-md bg-muted/50 mb-1">
          <Info className="size-6 text-muted-foreground" />
        </div>
        <div className="flex max-w-[320px] flex-col items-center">
          <AlertTitle className="text-center text-base font-semibold">
            {mode === 'taxa'
              ? 'No taxa available for coloring'
              : 'No groups found with current settings'}
          </AlertTitle>
          <AlertDescription className="justify-items-center text-center text-sm text-muted-foreground">
            {mode === 'taxa'
              ? 'Load a phylogenetic dataset to start configuring taxa colors.'
              : 'Try adjusting your grouping strategy or separators to detect taxa groups.'}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
