import React, { useEffect, useRef } from 'react';
import { ButtonsFileOps } from './components/nav/ButtonsFileOps.jsx';
import { ButtonsMSA } from './components/nav/ButtonsMSA.jsx';
import { Appearance } from './components/nav/appearance/Appearance.jsx';
import { VisualElements } from './components/nav/appearance/VisualElements.jsx';
import { TreeStructureGroup } from './components/nav/appearance/TreeStructureGroup.jsx';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Film, SlidersHorizontal, Monitor, Sun, Moon, FolderOpen, Dna, GitBranch } from 'lucide-react';
import { useAppStore } from '../js/core/store.js';
import { getPhyloMovieData } from '../js/services/dataManager.js';
import Gui from '../js/controllers/gui.js';
import { DeckGLTreeAnimationController } from '../js/treeVisualisation/DeckGLTreeAnimationController.js';
import { debounce } from '../js/utils/debounce.js';
import { initializeTheme } from '../js/core/theme.js';

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

        // Debounced resize handler
        const debouncedResize = debounce(async () => {
          guiInstance.resize();
          await guiInstance.update();
        }, 200);
        resizeRef.current = debouncedResize;
        window.addEventListener('resize', debouncedResize);

        guiInstance.initializeMovie();
      } catch (err) {
        console.error('[App bootstrap] Failed to initialize GUI:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (resizeRef.current) {
        window.removeEventListener('resize', resizeRef.current);
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
        <div className="full-size-container" style={{ flex: 1, minHeight: 0 }}>
          {comparisonMode ? (
            <div style={{ display: 'flex', width: '100%', height: '100%' }}>
              <div id="webgl-container-left" style={{ width: '50%', height: '100%' }}></div>
              <div id="webgl-container-right" style={{ width: '50%', height: '100%' }}></div>
            </div>
          ) : (
            <div id="webgl-container" style={{ width: '100%', height: '100%' }}></div>
          )}
        </div>
        <MoviePlayerBar />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
