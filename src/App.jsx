import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { NodeContextMenu } from './components/NodeContextMenu.jsx';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import { SidebarProvider } from './components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { Dock } from './components/dock/Dock.jsx';
import { useDockPanelSync } from './components/dock/dockPanelSync.js';

import { selectInitialize, selectReset, useAppStore } from './state/phyloStore/store.js';
import { phyloData } from './services/data/dataService.js';
import { useTreeController } from './hooks/useTreeController.js';

export function App() {
  const initializeStore = useAppStore(selectInitialize);
  const resetStore = useAppStore(selectReset);
  const [bootstrapState, setBootstrapState] = React.useState('loading');

  // Initialize Tree Controller and Rendering Logic
  useTreeController();

  const navigate = useNavigate();
  const [error, setError] = React.useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parsedData = await phyloData.get();
        if (cancelled) return;

        if (!parsedData) {
          console.warn('[App bootstrap] No data found, redirecting to home...');
          navigate('/');
          return;
        }

        // Initialize store directly
        initializeStore(parsedData);
        setBootstrapState('ready');
      } catch (err) {
        console.error('[App bootstrap] Failed to initialize data:', err);
        setError(err.message || 'Failed to load data');
        setBootstrapState('error');
      }
    })();

    return () => {
      cancelled = true;
      resetStore();
    };
  }, [initializeStore, resetStore, navigate]);

  if (bootstrapState !== 'ready') {
    return (
      <VisualizationBootstrapState
        state={bootstrapState}
        error={error}
        onReturnHome={() => navigate('/')}
      />
    );
  }

  return (
    <TooltipProvider>
      {/* Context for the settings panel's shadcn menu primitives; the dock owns visibility. */}
      <SidebarProvider open onOpenChange={() => {}} className="flex-col">
        <VisualizationShell />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function VisualizationShell() {
  useDockPanelSync();
  return (
    <div className="flex h-svh min-h-0 w-full flex-col overflow-hidden">
      <Dock />
      <MoviePlayerBar />
      <NodeContextMenu />
      <Toaster />
    </div>
  );
}

export default App;

function VisualizationBootstrapState({ state, error, onReturnHome }) {
  const isError = state === 'error';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-lg"
        role={isError ? 'alert' : 'status'}
        aria-live="polite"
        aria-busy={!isError}
      >
        {!isError && (
          <div className="rounded-md bg-primary/10 p-3">
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">
            {isError ? 'Could not load saved visualization' : 'Loading saved visualization'}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isError
              ? error || 'The saved movie data could not be read from browser storage.'
              : 'Reading processed tree data and preparing the movie view.'}
          </p>
        </div>
        {isError && (
          <Button type="button" variant="outline" onClick={onReturnHome}>
            Return to project setup
          </Button>
        )}
      </div>
    </div>
  );
}
