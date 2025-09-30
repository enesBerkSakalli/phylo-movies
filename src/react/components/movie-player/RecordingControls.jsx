import React from 'react';

export function RecordingControls({ isRecording, onStart, onStop }) {
  return (
    <>
      <div className="vertical-divider"></div>

      <md-icon-button
        id="start-record"
        className="record-button-danger"
        title="Start screen recording"
        disabled={isRecording}
        onClick={onStart}
      >
        <md-icon>fiber_manual_record</md-icon>
      </md-icon-button>
      <md-icon-button
        id="stop-record"
        title="Stop screen recording"
        disabled={!isRecording}
        onClick={onStop}
      >
        <md-icon>stop_circle</md-icon>
      </md-icon-button>
    </>
  );
}
