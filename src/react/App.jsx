import React, { useEffect, useRef } from 'react';
import { ButtonsFileOps } from './components/nav/ButtonsFileOps.jsx';
import { ButtonsMSA } from './components/nav/ButtonsMSA.jsx';
import { Appearance } from './components/appearance/Appearance.jsx';
import { VisualElements } from './components/appearance/controls/VisualElements/VisualElements.jsx';
import { TreeStructureGroup } from './components/appearance/layout/TreeStructureGroup.jsx';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { TopScaleBar } from './components/TopScaleBar';
import { MsaRndWindow } from './components/msa/MsaRndWindow.jsx';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarInset, SidebarMenu, SidebarMenuItem,  SidebarSeparator } from '@/components/ui/sidebar';

import { Film, SlidersHorizontal, FolderOpen, Dna, GitBranch } from 'lucide-react';
import { useAppStore } from '../js/core/store.js';
import { getPhyloMovieData } from '../js/services/data/dataManager.js';
import Gui from '../js/controllers/gui.js';
import { DeckGLTreeAnimationController } from '../js/treeVisualisation/DeckGLTreeAnimationController.js';

export function App() {
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const gui = useAppStore((s) => s.gui);
  const fileName = useAppStore((s) => s.fileName || 'Loading...');
  const hasMsa = useAppStore((s) => s.hasMsa);

  useEffect(() => {
    if (gui) {
      gui.updateMain();
    }
  }, [comparisonMode, gui]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parsedData = await getPhyloMovieData();
        if (cancelled) return;

        // Instantiate GUI (initializes store internally)
        const TreeController = DeckGLTreeAnimationController;

        const guiInstance = new Gui(parsedData, { TreeController });

        // Store GUI reference
        useAppStore.getState().setGui(guiInstance);

        // MovieTimelineManager is now initialized automatically by the store
      } catch (err) {
        console.error('[App bootstrap] Failed to initialize GUI:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-has-msa', hasMsa ? 'true' : 'false');
    } catch {}
  }, [hasMsa]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3">
            <Film className="size-6 text-primary" />
            <div className="flex-1 min-w-0">
              <h1 className="m-0 text-base font-medium text-foreground truncate">Phylo-Movies</h1>
              <p className="m-0 text-xs text-muted-foreground truncate">
                File: <span id="compactFileName">{fileName}</span>
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarGroup>
                <SidebarGroupLabel>
                  <FolderOpen className="size-4 text-primary" />
                  File Operations
                </SidebarGroupLabel>
                <ButtonsFileOps />
              </SidebarGroup>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarSeparator />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarGroup>
                <SidebarGroupLabel>
                  <Dna className="size-4 text-primary" />
                  MSA Viewer
                </SidebarGroupLabel>
                <ButtonsMSA />
              </SidebarGroup>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarSeparator />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarGroup>
                <SidebarGroupLabel>
                  <GitBranch className="size-4 text-primary" />
                  Tree Structure
                </SidebarGroupLabel>
                <TreeStructureGroup />
              </SidebarGroup>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarSeparator />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarGroup>
                <SidebarGroupLabel>
                  <SlidersHorizontal className="size-4 text-primary" />
                  Visual Elements
                </SidebarGroupLabel>
                <VisualElements />
              </SidebarGroup>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarSeparator />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarGroup>
                <SidebarGroupLabel>
                  <SlidersHorizontal className="size-4 text-primary" />
                  Settings
                </SidebarGroupLabel>
                <Appearance />
              </SidebarGroup>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <MsaRndWindow />

      <SidebarInset>
        <div className="full-size-container" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <div id="webgl-container" style={{ width: '100%', height: '100%' }}></div>
        </div>
        <MoviePlayerBar />
        <div id="top-scale-bar-container">
          <TopScaleBar />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
