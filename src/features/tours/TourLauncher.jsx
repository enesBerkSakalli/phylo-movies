import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AppTooltip } from '../../components/ui/app-tooltip';

const loadWorkspaceTour = () => import('./workspaceTour.js');

function preloadWorkspaceTour() {
  void loadWorkspaceTour();
}

function startWorkspaceTour() {
  void loadWorkspaceTour().then((module) => module.startWorkspaceTour());
}

export function TourLauncher() {
  return (
    <AppTooltip content="Start workspace tour" side="left">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Start workspace tour"
        onClick={startWorkspaceTour}
        onMouseEnter={preloadWorkspaceTour}
        onFocus={preloadWorkspaceTour}
      >
        <HelpCircle aria-hidden />
      </Button>
    </AppTooltip>
  );
}
