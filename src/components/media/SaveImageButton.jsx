import React, { useState } from 'react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { Download, Loader2 } from 'lucide-react';
import {
  selectFrameIndex,
  selectTreeControllers,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { toast } from 'sonner';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
export function SaveImageButton({ disabled = false }) {
  const treeControllers = useAppStore(selectTreeControllers);
  const frameIndex = useAppStore(selectFrameIndex);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveImage = async () => {
    setIsSaving(true);
    try {
      // If no controller exists, we can't save
      if (!treeControllers.length) {
        console.error('[SaveImageButton] No tree controller is available for PNG export.');
        toast.error('PNG export is not ready yet.', {
          description: 'Wait until the tree finishes rendering, then try again.',
        });
        return;
      }

      const treeController = treeControllers[treeControllers.length - 1]; // Save the right-most view

      const canvas = treeController.deckContext?.canvas;

      if (!canvas) {
        console.error('[SaveImageButton] Deck.gl canvas is missing from the active controller.', {
          hasDeckContext: !!treeController.deckContext,
        });
        toast.error('PNG export could not find the visualization canvas.', {
          description: 'Reload the dataset if the tree view is blank, then try again.',
        });
        return;
      }

      const fileName = `phylo-movie-export-${frameIndex + 1}.png`;

      // Create a proxy 2D canvas to fix WebGL color drift issues
      // Direct toBlob() on WebGL canvas causes color shifts due to premultiplied alpha
      // and color space handling differences between WebGL and PNG encoding
      const proxyCanvas = document.createElement('canvas');
      proxyCanvas.width = canvas.width;
      proxyCanvas.height = canvas.height;
      const ctx = proxyCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Browser could not create a 2D canvas for PNG export.');
      }

      // Draw solid white background (handles alpha compositing correctly)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, proxyCanvas.width, proxyCanvas.height);

      // Composite WebGL canvas onto 2D canvas (this normalizes color space)
      ctx.drawImage(canvas, 0, 0);

      // Export from the proxy canvas for accurate colors
      const blob = await new Promise((resolve) => {
        proxyCanvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        console.error('[SaveImageButton] Browser returned an empty PNG blob.');
        toast.error('PNG export failed.', {
          description: 'The browser could not encode the current WebGL canvas.',
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL to free memory
      URL.revokeObjectURL(url);
      toast.success('PNG saved.', {
        description: fileName,
      });
    } catch (error) {
      console.error('[SaveImageButton] PNG export failed:', error);
      toast.error('PNG export failed.', {
        description: error?.message || 'Check the browser console for technical details.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppTooltip content={isSaving ? 'Saving PNG...' : 'Save current tree visualization as PNG'}>
      <Button
        id="save-button"
        variant="ghost"
        size="icon"
        disabled={disabled || isSaving}
        onClick={handleSaveImage}
        aria-label={isSaving ? 'Saving PNG' : 'Save PNG'}
        aria-busy={isSaving}
      >
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
      </Button>
    </AppTooltip>
  );
}
