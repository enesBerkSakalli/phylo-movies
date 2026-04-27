/**
 * ClipboardDismissButton - Button to dismiss the clipboard tree overlay
 */
import { useAppStore } from '@/state/phyloStore/store.js';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const selectClipboardTreeIndex = (s) => s.clipboardTreeIndex;
const selectClearClipboard = (s) => s.clearClipboard;

export function ClipboardDismissButton() {
  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);
  const clearClipboard = useAppStore(selectClearClipboard);

  if (clipboardTreeIndex === null) return null;

  return (
    <Button
      onClick={clearClipboard}
      variant="outline"
      className="clipboard-dismiss-button h-auto gap-2 border-border/60 bg-background/85 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm hover:bg-accent"
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
