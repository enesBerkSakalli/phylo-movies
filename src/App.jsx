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
import { HUD } from './components/HUD/HUD.jsx';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';

import {
  selectFileName,
  selectInitialize,
  selectReset,
  selectSetTaxaColoringOpen,
  useAppStore,
} from './state/phyloStore/store.js';
import { phyloData } from './services/data/dataService.js';
import { useTreeController } from './hooks/useTreeController.js';

export function App() {
  const fileName = useAppStore(selectFileName) || 'Loading...';
  const initializeStore = useAppStore(selectInitialize);
  const resetStore = useAppStore(selectReset);
  const setTaxaColoringOpen = useAppStore(selectSetTaxaColoringOpen);
  const [sprAnalyticsOpen, setSprAnalyticsOpen] = React.useState(false);
  const [activeFloatingWindow, setActiveFloatingWindow] = React.useState(null);

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
      } catch (err) {
        console.error('[App bootstrap] Failed to initialize data:', err);
        setError(err.message || 'Failed to load data');
      }
    })();

    return () => {
      cancelled = true;
      resetStore();
    };
  }, [initializeStore, resetStore, navigate]);

  return (
    <TooltipProvider>
      <SidebarProvider className="flex-col">
        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          <ToolsSidebar
            fileName={fileName}
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
