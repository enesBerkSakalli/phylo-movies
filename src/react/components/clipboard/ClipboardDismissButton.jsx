/**
 * ClipboardDismissButton - Button to dismiss the clipboard tree overlay
 */
import { useAppStore } from '../../../js/core/store.js';
import { X } from 'lucide-react';

export function ClipboardDismissButton() {
  const clipboardTreeIndex = useAppStore((s) => s.clipboardTreeIndex);
  const clearClipboard = useAppStore((s) => s.clearClipboard);

  if (clipboardTreeIndex === null) return null;

  return (
    <button
      onClick={clearClipboard}
      className="clipboard-dismiss-button"
      title="Dismiss clipboard tree"
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 500
      }}
    >
      <span>Tree #{clipboardTreeIndex + 1}</span>
      <X size={14} />
    </button>
  );
}
