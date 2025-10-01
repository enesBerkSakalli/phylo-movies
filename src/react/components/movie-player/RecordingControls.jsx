import React from 'react';
import { Button } from '@/components/ui/button';
import { CircleDot, StopCircle } from 'lucide-react';

export function RecordingControls({ isRecording, onStart, onStop }) {
  return (
    <>
      <div className="vertical-divider"></div>

      <Button
        id="start-record"
        className="record-button-danger"
        variant="ghost"
        size="icon"
        title="Start screen recording"
        disabled={isRecording}
        onClick={onStart}
        aria-label="Start recording"
      >
        <CircleDot className="size-5" />
      </Button>
      <Button
        id="stop-record"
        variant="ghost"
        size="icon"
        title="Stop screen recording"
        disabled={!isRecording}
        onClick={onStop}
        aria-label="Stop recording"
      >
        <StopCircle className="size-5" />
      </Button>
    </>
  );
}
