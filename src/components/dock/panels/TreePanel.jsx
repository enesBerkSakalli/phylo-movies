import React from 'react';
import { DeckGLCanvas } from '../../deckgl/DeckGLCanvas.jsx';
import { TreeCanvasControls } from '../../deckgl/TreeCanvasControls.jsx';
import { VisualizationTreeRenderOverlay } from './TreeRenderOverlay.jsx';

export function TreePanel() {
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden" data-tree-canvas-area>
      <DeckGLCanvas />
      <TreeCanvasControls />
      <VisualizationTreeRenderOverlay />
    </div>
  );
}
