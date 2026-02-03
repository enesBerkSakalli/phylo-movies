import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ButtonsMSA } from './components/nav/ButtonsMSA.jsx';
import { Appearance } from './components/appearance/Appearance.jsx';
import { VisualElements } from './components/appearance/controls/VisualElements/VisualElements.jsx';
import { TreeStructureGroup } from './components/appearance/layout/TreeStructureGroup.jsx';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { TreeStatsPanel } from './components/TreeStatsPanel/TreeStatsPanel.tsx';
import { TaxaGroupsLegend } from './components/TreeStatsPanel/Shared/TaxaLegend';
import AnalyticsDashboard from './components/TreeStatsPanel/AnalyticsDashboard.tsx';
import { DeckGLCanvas } from './components/deckgl/DeckGLCanvas.jsx';
import { MsaRndWindow } from './components/msa/MsaRndWindow.jsx';
import { MSAProvider } from './components/msa/MSAContext';
import { TaxaColoringRndWindow } from './components/taxa-coloring/TaxaColoringRndWindow.jsx';
import { ClipboardDismissButton } from './components/clipboard/ClipboardDismissButton.jsx';
import { NodeContextMenu } from './components/NodeContextMenu.jsx';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HUD } from './components/HUD/HUD.jsx';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

import { Film, ArrowLeftFromLine } from 'lucide-react';
import { useAppStore } from '../js/core/store.js';
import { getPhyloMovieData } from '../js/services/data/dataManager.js';
import { useTreeController } from '../hooks/useTreeController.js';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectFileName = (s) => s.fileName || 'Loading...';
const selectHasMsa = (s) => s.hasMsa;
const selectInitialize = (s) => s.initialize;
const selectReset = (s) => s.reset;

export function App() {

  const fileName = useAppStore(selectFileName);
  const hasMsa = useAppStore(selectHasMsa);
  const initializeStore = useAppStore(selectInitialize);
  const resetStore = useAppStore(selectReset);

  // Initialize Tree Controller and Rendering Logic
  useTreeController();

  const navigate = useNavigate();
  const [error, setError] = React.useState(null);
  const handleReturnHome = React.useCallback(() => {
    navigate('/home');
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parsedData = await getPhyloMovieData();
        if (cancelled) return;

        if (!parsedData) {
          console.warn('[App bootstrap] No data found, redirecting to home...');
          navigate('/home');
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
                <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="md:h-12">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                      <Film className="size-5" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden overflow-hidden">
                      <span className="font-semibold truncate">Phylo-Movies</span>
                      <span className="text-2xs text-muted-foreground truncate">
                        {error ? `Error: ${error}` : fileName}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {/* Main Navigation Group */}
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Back to upload page"
                    onClick={handleReturnHome}
                  >
                    <ArrowLeftFromLine className="size-4" />
                    <span>Return to Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <ButtonsMSA />
                <TreeStructureGroup />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Analytics & Insights Group */}
            <SidebarGroup>
              <SidebarGroupLabel>Analysis & Metrics</SidebarGroupLabel>
              <SidebarMenu>
                <AnalyticsDashboard />
                <TaxaGroupsLegend />
                <TreeStatsPanel />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Visualization Controls Group */}
            <SidebarGroup>
              <SidebarGroupLabel>Visualization</SidebarGroupLabel>
              <SidebarMenu>
                <VisualElements />
                <Appearance />
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <MSAProvider>
          <MsaRndWindow />
        </MSAProvider>
        <TaxaColoringRndWindow />


        <SidebarInset className="overflow-hidden">
          <SidebarTrigger className="absolute top-2 left-2 z-[1200]" />
          <div className="full-size-container" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <DeckGLCanvas />
            <ClipboardDismissButton />
            <HUD />
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
