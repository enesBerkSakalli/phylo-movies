import React from 'react';
import { useMSA } from './useMSA.js';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';
import { describeAlignment } from './msaViewportStatus.js';
import { MSAProvider } from './MSAContext.jsx';

// The summary is shown in the viewer's status overlay; this copy describes the region.
function AlignmentSummary() {
  const { processedData } = useMSA();
  return (
    <p id="msa-window-description" className="sr-only">
      {describeAlignment(processedData) ?? 'No alignment loaded'}
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
        <MSAViewer toolbar={<MSAControls />} />
      </div>
    </MSAProvider>
  );
}
