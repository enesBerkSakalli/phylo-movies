import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { ToolsSidebar } from './components/sidebar/ToolsSidebar.jsx';
import { DeckGLCanvas } from './components/deckgl/DeckGLCanvas.jsx';
import { TreeViewportControls } from './components/deckgl/TreeViewportControls.jsx';
import { CanvasCaptureControls } from './components/deckgl/CanvasCaptureControls.jsx';
import { MsaRndWindow } from './components/msa/MsaRndWindow.jsx';
import { MSAProvider } from './components/msa/MSAContext';
import { TaxaColoringRndWindow } from './components/taxa-coloring/TaxaColoringRndWindow.jsx';
import { ClipboardDismissButton } from './components/HUD/clipboard/ClipboardDismissButton.jsx';
import { NodeContextMenu } from './components/NodeContextMenu.jsx';
import { TransitionInspectorPanel } from './components/TransitionInspectorPanel.jsx';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { HUD } from './components/HUD/HUD.jsx';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from './components/ui/sidebar';

import {
  selectFileName,
  selectHasMsa,
  selectInitialize,
  selectReset,
  useAppStore
} from './state/phyloStore/store.js';
import { getPhyloMovieData } from './services/data/dataManager.js';
import { useTreeController } from './hooks/useTreeController.js';

export function App() {

  const fileName = useAppStore(selectFileName) || 'Loading...';
  const hasMsa = useAppStore(selectHasMsa);
  const initializeStore = useAppStore(selectInitialize);
  const resetStore = useAppStore(selectReset);
  const [sprAnalyticsOpen, setSprAnalyticsOpen] = React.useState(false);
  const [activeFloatingWindow, setActiveFloatingWindow] = React.useState(null);

  // Initialize Tree Controller and Rendering Logic
  useTreeController();

  const navigate = useNavigate();
  const [error, setError] = React.useState(null);
  const focusMsaWindow = React.useCallback(() => setActiveFloatingWindow('msa'), []);
  const focusTaxaColoringWindow = React.useCallback(() => setActiveFloatingWindow('taxa-coloring'), []);
  const focusSprAnalyticsWindow = React.useCallback(() => setActiveFloatingWindow('spr-analytics'), []);
  const openSprAnalyticsWindow = React.useCallback(() => {
    setSprAnalyticsOpen(true);
    setActiveFloatingWindow('spr-analytics');
  }, []);
  const closeSprAnalyticsWindow = React.useCallback(() => {
    setSprAnalyticsOpen(false);
    setActiveFloatingWindow((activeWindow) => activeWindow === 'spr-analytics' ? null : activeWindow);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parsedData = await getPhyloMovieData();
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

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-has-msa', hasMsa ? 'true' : 'false');
    } catch { }
  }, [hasMsa]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <ToolsSidebar
          fileName={fileName}
          error={error}
          sprAnalyticsOpen={sprAnalyticsOpen}
          isSprAnalyticsActive={activeFloatingWindow === 'spr-analytics'}
          onOpenSprAnalytics={openSprAnalyticsWindow}
          onCloseSprAnalytics={closeSprAnalyticsWindow}
          onFocusSprAnalytics={focusSprAnalyticsWindow}
        />

        <MSAProvider>
          <MsaRndWindow
            isActive={activeFloatingWindow === 'msa'}
            onFocus={focusMsaWindow}
          />
        </MSAProvider>
        <TaxaColoringRndWindow
          isActive={activeFloatingWindow === 'taxa-coloring'}
          onFocus={focusTaxaColoringWindow}
        />


        <SidebarInset className="overflow-hidden">
          <SidebarTrigger className="absolute top-2 left-2 z-[1200]" />
          <div className="full-size-container" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <DeckGLCanvas />
            <TreeViewportControls />
            <CanvasCaptureControls />
            <ClipboardDismissButton />
            <HUD />
            <TransitionInspectorPanel />
          </div>
          <MoviePlayerBar />
        </SidebarInset>
        <NodeContextMenu />
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default App;
