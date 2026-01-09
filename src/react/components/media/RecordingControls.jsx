import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CircleDot, StopCircle } from 'lucide-react';
import { CanvasRecorder } from '../../../js/services/media/canvasRecorder.js';
import { notifications } from '../../../js/services/ui/notifications.js';

export function RecordingControls() {
  const recorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const ensureRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new CanvasRecorder({
        autoSave: true,
        notifications,
        framerate: 60,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      });
    }
    return recorderRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && isRecording) {
        recorderRef.current.stop().catch(console.error);
      }
    };
  }, [isRecording]);

  const handleStartRecording = useCallback(async () => {
    const recorder = ensureRecorder();
    try {
      setIsRecording(true);
      notifications.show('Preparing to start recording…', 'info', 2000);
      await recorder.start();
      notifications.show('Recording started. Capturing frames…', 'success', 3000);
    } catch (error) {
      setIsRecording(false);
      console.error('[MoviePlayerBar] Failed to start recording:', error);
      notifications.show('Failed to start recording. Please check permissions.', 'error');
    }
  }, [ensureRecorder]);

  const handleStopRecording = useCallback(async () => {
    const recorder = ensureRecorder();
    try {
      notifications.show('Finishing recording…', 'info', 2000);
      await recorder.stop();
    } catch (error) {
      console.error('[MoviePlayerBar] Failed to stop recording:', error);
      notifications.show('Failed to stop recording.', 'error');
    } finally {
      setIsRecording(false);
    }
  }, [ensureRecorder]);

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
        onClick={handleStartRecording}
        aria-label="Start recording"
      >
        <CircleDot className="size-4" />
      </Button>
      <Button
        id="stop-record"
        variant="ghost"
        size="icon"
        title="Stop screen recording"
        disabled={!isRecording}
        onClick={handleStopRecording}
        aria-label="Stop recording"
      >
        <StopCircle className="size-4" />
      </Button>
    </>
  );
}
