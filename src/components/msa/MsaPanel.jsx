import React from 'react';
import { useMSA } from './useMSA.js';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';
import { MSAProvider } from './MSAContext.jsx';

function AlignmentSummary() {
  const { processedData } = useMSA();
  const summary = processedData
    ? `${processedData.rows} sequences · ${processedData.cols} columns · ${processedData.type.toUpperCase()}`
    : 'No alignment loaded';
  return (
    <p
      id="msa-window-description"
      className="shrink-0 truncate border-b border-border px-2 py-1 text-2xs text-muted-foreground"
    >
      {summary}
    </p>
  );
}

export default function MsaPanel() {
  return (
    <MSAProvider>
      <div
        className="msa-panel flex h-full flex-col overflow-y-auto bg-card"
        role="region"
        aria-label="Sequence alignment"
        aria-describedby="msa-window-description"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
          ) {
            event.stopPropagation();
          }
        }}
      >
        <AlignmentSummary />
        <MSAControls />
        <MSAViewer />
      </div>
    </MSAProvider>
  );
}
