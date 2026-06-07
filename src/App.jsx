import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { ToolsSidebar } from './components/sidebar/ToolsSidebar.jsx';
import { DeckGLCanvas } from './components/deckgl/DeckGLCanvas.jsx';
import { TreeCanvasControls } from './components/deckgl/TreeCanvasControls.jsx';
import { MsaRndWindow } from './components/msa/MsaRndWindow.jsx';
import { MSAProvider } from './components/msa/MSAContext';
import { TaxaColoringRndWindow } from './components/taxa-coloring/TaxaColoringRndWindow.jsx';
import { NodeContextMenu } from './components/NodeContextMenu.jsx';
import { TransitionInspectorPanel } from './components/TransitionInspectorPanel.jsx';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import { HUD } from './components/HUD/HUD.jsx';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { Loader2 } from 'lucide-react';

import {
  selectFileName,
  selectDatasetProvenance,
  selectInitialize,
  selectReset,
  selectSetTaxaColoringOpen,
  useAppStore,
} from './state/phyloStore/store.js';
import { phyloData } from './services/data/dataService.js';
import { useTreeController } from './hooks/useTreeController.js';

export function App() {
  const fileName = useAppStore(selectFileName) || 'Loading...';
  const datasetProvenance = useAppStore(selectDatasetProvenance);
  const initializeStore = useAppStore(selectInitialize);
  const resetStore = useAppStore(selectReset);
  const setTaxaColoringOpen = useAppStore(selectSetTaxaColoringOpen);
  const [sprAnalyticsOpen, setSprAnalyticsOpen] = React.useState(false);
  const [activeFloatingWindow, setActiveFloatingWindow] = React.useState(null);
  const [bootstrapState, setBootstrapState] = React.useState('loading');

  // Initialize Tree Controller and Rendering Logic
  useTreeController();

  const navigate = useNavigate();
  const [error, setError] = React.useState(null);
  const focusMsaWindow = React.useCallback(() => setActiveFloatingWindow('msa'), []);
  const focusTaxaColoringWindow = React.useCallback(
    () => setActiveFloatingWindow('taxa-coloring'),
    []
  );
  const focusSprAnalyticsWindow = React.useCallback(
    () => setActiveFloatingWindow('spr-analytics'),
    []
  );
  const openSprAnalyticsWindow = React.useCallback(() => {
    setSprAnalyticsOpen(true);
    setActiveFloatingWindow('spr-analytics');
  }, []);
  const openTaxaColoringWindow = React.useCallback(() => {
    setTaxaColoringOpen(true);
    setActiveFloatingWindow('taxa-coloring');
  }, [setTaxaColoringOpen]);
  const closeSprAnalyticsWindow = React.useCallback(() => {
    setSprAnalyticsOpen(false);
    setActiveFloatingWindow((activeWindow) =>
      activeWindow === 'spr-analytics' ? null : activeWindow
    );
  }, []);

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
      <SidebarProvider className="flex-col">
        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          <ToolsSidebar
            fileName={fileName}
            datasetProvenance={datasetProvenance}
            error={error}
            sprAnalyticsOpen={sprAnalyticsOpen}
            isSprAnalyticsActive={activeFloatingWindow === 'spr-analytics'}
            onOpenSprAnalytics={openSprAnalyticsWindow}
            onCloseSprAnalytics={closeSprAnalyticsWindow}
            onFocusSprAnalytics={focusSprAnalyticsWindow}
            onOpenTaxaColoring={openTaxaColoringWindow}
          />

          <SidebarInset className="min-w-0 overflow-hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <DeckGLCanvas />
              <TreeCanvasControls />
              <HUD />
              <TransitionInspectorPanel />
              <VisualizationTreeRenderOverlay />
            </div>
          </SidebarInset>
        </div>

        <MSAProvider>
          <MsaRndWindow isActive={activeFloatingWindow === 'msa'} onFocus={focusMsaWindow} />
        </MSAProvider>
        <TaxaColoringRndWindow
          isActive={activeFloatingWindow === 'taxa-coloring'}
          onFocus={focusTaxaColoringWindow}
        />

        <MoviePlayerBar />
        <NodeContextMenu />
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default App;

export function VisualizationTreeRenderOverlay({ visible: visibleOverride } = {}) {
  const storeVisible = useAppStore((state) => state.renderInProgress);
  const visible = typeof visibleOverride === 'boolean' ? visibleOverride : storeVisible;

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/45 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 rounded-md border border-border/70 bg-card/95 px-4 py-3 text-card-foreground shadow-lg">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Loading tree view</span>
          <span className="text-xs text-muted-foreground">Preparing the visible layout</span>
        </div>
      </div>
    </div>
  );
}

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
