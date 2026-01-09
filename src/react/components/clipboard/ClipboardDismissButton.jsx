/**
 * ClipboardDismissButton - Button to dismiss the clipboard tree overlay
 */
import { useAppStore } from '../../../js/core/store.js';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClipboardDismissButton() {
  const clipboardTreeIndex = useAppStore((s) => s.clipboardTreeIndex);
  const clearClipboard = useAppStore((s) => s.clearClipboard);

  if (clipboardTreeIndex === null) return null;

  return (
    <Button
      onClick={clearClipboard}
      className="clipboard-dismiss-button gap-2 bg-black/70 hover:bg-black/80 text-white border-white/30 h-auto py-1.5 px-3 text-xs font-medium"
      title="Dismiss clipboard tree"
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
      }}
    >
      <span>Tree #{clipboardTreeIndex + 1}</span>
      <X size={14} />
    </Button>
  );
}
