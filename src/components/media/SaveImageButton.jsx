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
import {
  createCanvasPngBlob,
  createPngFileName,
  getActiveTreeCanvas,
} from '../../services/media/canvasPngExport.js';

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

      const { canvas, treeController } = getActiveTreeCanvas(treeControllers);

      if (!canvas) {
        console.error('[SaveImageButton] Deck.gl canvas is missing from the active controller.', {
          hasDeckContext: !!treeController?.deckContext,
        });
        toast.error('PNG export could not find the visualization canvas.', {
          description: 'Reload the dataset if the tree view is blank, then try again.',
        });
        return;
      }

      const fileName = createPngFileName(frameIndex);
      const blob = await createCanvasPngBlob(canvas);

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
