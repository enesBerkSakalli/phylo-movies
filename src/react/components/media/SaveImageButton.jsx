import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download } from 'lucide-react';
import { useAppStore } from '../../../js/core/store.js';

export function SaveImageButton() {
  const treeControllers = useAppStore((s) => s.treeControllers);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
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

      let canvas = treeController.deckManager?.canvas;

        // Fallback: try to find canvas in DOM if not in manager
      if (!canvas) {
        console.warn("DeckManager canvas reference missing, attempting DOM lookup via ID...");
        const container = document.getElementById('webgl-container');
        if (container) {
          canvas = container.querySelector('canvas');
        } else {
             console.warn("Container #webgl-container NOT FOUND in DOM.");
        }
      }

      // Last resort: find ANY canvas on the page (usually there is only one main one)
      if (!canvas) {
        console.warn("Canvas not found in container, searching document...");
        canvas = document.querySelector('canvas');
      }

      if (!canvas) {
        console.error("Deck.gl canvas not found for saving PNG. Checked DeckManager and DOM.");
        return;
      }

      const fileName = `phylo-movie-export-${currentTreeIndex + 1}.png`;

      // Use toBlob for better performance (more efficient than toDataURL)
      canvas.toBlob((blob) => {
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          id="save-button"
          variant="ghost"
          size="icon"
          disabled={isSaving}
          onClick={handleSaveImage}
          aria-label="Save PNG"
        >
          <Download className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Save current tree visualization as PNG</TooltipContent>
    </Tooltip>
  );
}
