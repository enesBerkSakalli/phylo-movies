import React, { useState } from 'react';
import { ClipboardCopy, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
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

function getClipboardItemConstructor() {
  if (typeof window === 'undefined') return null;
  return typeof window.ClipboardItem === 'function' ? window.ClipboardItem : null;
}

async function writePngBlobToClipboard(blob) {
  const ClipboardItemConstructor = getClipboardItemConstructor();

  if (
    !ClipboardItemConstructor ||
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== 'function'
  ) {
    throw new Error('PNG image clipboard writes are not supported in this browser.');
  }

  await navigator.clipboard.write([
    new ClipboardItemConstructor({
      'image/png': blob,
    }),
  ]);
}

function getClipboardErrorDescription(error) {
  if (error?.name === 'NotAllowedError') {
    return 'Allow clipboard access for this page, then try again.';
  }

  return error?.message || 'Use Save PNG if this browser blocks image clipboard writes.';
}

export function CopyImageButton({ disabled = false }) {
  const treeControllers = useAppStore(selectTreeControllers);
  const frameIndex = useAppStore(selectFrameIndex);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyImage = async () => {
    setIsCopying(true);
    try {
      if (!treeControllers.length) {
        console.error('[CopyImageButton] No tree controller is available for PNG copy.');
        toast.error('PNG copy is not ready yet.', {
          description: 'Wait until the tree finishes rendering, then try again.',
        });
        return;
      }

      const { canvas, treeController } = getActiveTreeCanvas(treeControllers);

      if (!canvas) {
        console.error('[CopyImageButton] Deck.gl canvas is missing from the active controller.', {
          hasDeckContext: !!treeController?.deckContext,
        });
        toast.error('PNG copy could not find the visualization canvas.', {
          description: 'Reload the dataset if the tree view is blank, then try again.',
        });
        return;
      }

      const fileName = createPngFileName(frameIndex);
      const blob = await createCanvasPngBlob(canvas);
      await writePngBlobToClipboard(blob);

      toast.success('PNG copied to clipboard.', {
        description: fileName,
      });
    } catch (error) {
      console.error('[CopyImageButton] PNG copy failed:', error);
      toast.error('PNG copy failed.', {
        description: getClipboardErrorDescription(error),
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <AppTooltip content={isCopying ? 'Copying PNG...' : 'Copy current tree visualization as PNG'}>
      <Button
        id="copy-png-button"
        variant="ghost"
        size="icon"
        disabled={disabled || isCopying}
        onClick={handleCopyImage}
        aria-label={isCopying ? 'Copying PNG' : 'Copy PNG to clipboard'}
        aria-busy={isCopying}
      >
        {isCopying ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ClipboardCopy className="size-4" aria-hidden />
        )}
      </Button>
    </AppTooltip>
  );
}
