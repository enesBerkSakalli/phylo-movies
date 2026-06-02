import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AppTooltip } from '../../components/ui/app-tooltip';
import { startWorkspaceTour } from './workspaceTour.js';

export function TourLauncher() {
  return (
    <AppTooltip content="Start workspace tour" side="left">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Start workspace tour"
        onClick={startWorkspaceTour}
      >
        <HelpCircle aria-hidden />
      </Button>
    </AppTooltip>
  );
}

export default TourLauncher;
