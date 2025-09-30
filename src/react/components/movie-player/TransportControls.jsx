import React from 'react';

export function TransportControls({
  playing,
  onPlayClick,
  onBackward,
  onBackwardStep,
  onForward,
  onForwardStep,
  canStepBackward,
  canStepForward,
}) {
  return (
    <>
      <md-icon-button
        className="transport-button"
        id="backwardStepButton"
        title="Go to previous tree"
        aria-label="Previous tree"
        disabled={!canStepBackward}
        onClick={onBackwardStep}
      >
        <md-icon>first_page</md-icon>
      </md-icon-button>

      <md-icon-button
        className="transport-button"
        id="backward-button"
        title="Go to previous frame"
        aria-label="Previous frame"
        onClick={onBackward}
      >
        <md-icon>chevron_left</md-icon>
      </md-icon-button>

      <md-icon-button
        toggle=""
        className="transport-button"
        id="play-button"
        title="Play/Pause animation"
        aria-label="Play/Pause animation"
        onClick={onPlayClick}
        {...(playing ? { selected: '' } : {})}
      >
        <md-icon>play_arrow</md-icon>
        <md-icon slot="selected">pause</md-icon>
      </md-icon-button>

      <md-icon-button
        className="transport-button"
        id="forward-button"
        title="Go to next frame"
        aria-label="Next frame"
        onClick={onForward}
      >
        <md-icon>chevron_right</md-icon>
      </md-icon-button>

      <md-icon-button
        className="transport-button"
        id="forwardStepButton"
        title="Go to next tree"
        aria-label="Next tree"
        disabled={!canStepForward}
        onClick={onForwardStep}
      >
        <md-icon>last_page</md-icon>
      </md-icon-button>
    </>
  );
}
