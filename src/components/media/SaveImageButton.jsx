import React, { useState } from 'react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { Download } from 'lucide-react';
import { selectCurrentTreeIndex, selectTreeControllers, useAppStore } from '../../state/phyloStore/store.js';


// ==========================================================================
// STORE SELECTORS
// ==========================================================================
export function SaveImageButton({ disabled = false }) {
  const treeControllers = useAppStore(selectTreeControllers);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveImage = async () => {
    setIsSaving(true);
    try {
      // If no controller exists, we can't save
      if (!treeControllers.length) {
        console.error("No tree controller available for saving PNG.");
        return;
      }

      const treeController = treeControllers[treeControllers.length - 1]; // Save the right-most view

      const canvas = treeController.deckContext?.canvas;

      if (!canvas) {
        console.error("Deck.gl canvas not found for saving PNG. DeckGLContext has not exposed a canvas.");
        return;
      }

      const fileName = `phylo-movie-export-${currentTreeIndex + 1}.png`;

      // Create a proxy 2D canvas to fix WebGL color drift issues
      // Direct toBlob() on WebGL canvas causes color shifts due to premultiplied alpha
      // and color space handling differences between WebGL and PNG encoding
      const proxyCanvas = document.createElement('canvas');
      proxyCanvas.width = canvas.width;
      proxyCanvas.height = canvas.height;
      const ctx = proxyCanvas.getContext('2d');

      // Draw solid white background (handles alpha compositing correctly)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, proxyCanvas.width, proxyCanvas.height);

      // Composite WebGL canvas onto 2D canvas (this normalizes color space)
      ctx.drawImage(canvas, 0, 0);

      // Export from the proxy canvas for accurate colors
      proxyCanvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create image blob");
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
      }, 'image/png');
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppTooltip content="Save current tree visualization as PNG">
      <Button
        id="save-button"
        variant="ghost"
        size="icon"
        disabled={disabled || isSaving}
        onClick={handleSaveImage}
        aria-label="Save PNG"
      >
        <Download className="size-4" />
      </Button>
    </AppTooltip>
  );
}
