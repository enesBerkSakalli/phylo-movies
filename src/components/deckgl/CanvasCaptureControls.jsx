import React from 'react';
import { RecordingControls } from '../media/RecordingControls.jsx';
import { SaveImageButton } from '../media/SaveImageButton.jsx';
import { selectMovieData, useAppStore } from '../../state/phyloStore/store.js';

export function CanvasCaptureControls() {
  const movieData = useAppStore(selectMovieData);
  const disabled = !movieData;

  return (
    <div
      className="absolute right-3 top-14 z-50 flex items-center gap-1 rounded-md border border-border/60 bg-background/85 p-1 shadow-lg backdrop-blur-sm pointer-events-auto"
      role="group"
      aria-label="Canvas capture controls"
    >
      <RecordingControls disabled={disabled} />
      <SaveImageButton disabled={disabled} />
    </div>
  );
}

export default CanvasCaptureControls;
