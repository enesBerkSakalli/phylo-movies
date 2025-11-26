import React, { useEffect, useRef } from 'react';
import { ButtonsFileOps } from './components/nav/ButtonsFileOps.jsx';
import { ButtonsMSA } from './components/nav/ButtonsMSA.jsx';
import { Appearance } from './components/nav/appearance/Appearance.jsx';
import { VisualElements } from './components/nav/appearance/VisualElements.jsx';
import { TreeStructureGroup } from './components/nav/appearance/TreeStructureGroup.jsx';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { TopScaleBar } from './components/TopScaleBar.jsx';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Film, SlidersHorizontal, Monitor, Sun, Moon, FolderOpen, Dna, GitBranch } from 'lucide-react';
import { useAppStore } from '../js/core/store.js';
import { getPhyloMovieData } from '../js/services/dataManager.js';
import Gui from '../js/controllers/gui.js';
import { DeckGLTreeAnimationController } from '../js/treeVisualisation/DeckGLTreeAnimationController.js';
import { debounce } from '../js/utils/debounce.js';
import { initializeTheme } from '../js/core/theme.js';
import { MoverCurvesOverlay } from './components/overlays/MoverCurvesOverlay.jsx';

export function App() {
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const gui = useAppStore((s) => s.gui);
  const fileName = useAppStore((s) => s.fileName || 'Loading...');
  const hasMsa = useAppStore((s) => s.hasMsa);
  const resizeRef = useRef(null);

  useEffect(() => {
    if (gui) {
      gui.updateMain();
    }
  }, [comparisonMode, gui]);

  useEffect(() => {
    initializeTheme();
  }, []);

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

        // Debounced resize handler with guards
        const debouncedResize = debounce(async () => {
          if (cancelled || !guiInstance) return;
          try {
            guiInstance.resize();
            await guiInstance.update();
          } catch (e) {
            console.warn('[App bootstrap] resize/update failed:', e);
          }
        }, 200);

        // Initial sync
        debouncedResize();

        resizeRef.current = () => {
          cancelled = true;
          window.removeEventListener('resize', debouncedResize);
        };
        window.addEventListener('resize', debouncedResize);

        guiInstance.initializeMovie();
      } catch (err) {
        console.error('[App bootstrap] Failed to initialize GUI:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (resizeRef.current) {
        resizeRef.current();
      }
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
            <Button id="theme-toggle" variant="ghost" size="icon" aria-label="Toggle theme" title="Toggle theme">
              <Sun className="size-5 icon-sun" />
              <Moon className="size-5 icon-moon" />
              <Monitor className="size-5 icon-monitor" />
            </Button>
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
                  <Monitor className="size-4 text-primary" />
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

      <SidebarInset>
        <div className="full-size-container" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <div id="webgl-container" style={{ width: '100%', height: '100%' }}></div>
          {comparisonMode && <MoverCurvesOverlay />}
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
