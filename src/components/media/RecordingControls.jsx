import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { CircleDot, Loader2, StopCircle } from 'lucide-react';
import { CanvasRecorder } from '../../services/media/canvasRecorder';
import { toast } from 'sonner';

export function RecordingControls({ disabled = false }) {
  const recorderRef = useRef(null);
  const recordingStateRef = useRef('idle');
  const [recordingState, setRecordingState] = useState('idle');
  const isStarting = recordingState === 'starting';
  const isRecording = recordingState === 'recording';
  const isStopping = recordingState === 'stopping';

  const ensureRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new CanvasRecorder({
        autoSave: true,
        framerate: 60,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });
    }
    return recorderRef.current;
  }, []);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recordingStateRef.current !== 'idle') {
        recorderRef.current.stop().catch((error) => {
          console.error('[RecordingControls] Cleanup failed while stopping recorder:', error);
        });
      }
    };
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (recordingState !== 'idle') return;
    const recorder = ensureRecorder();
    try {
      setRecordingState('starting');
      toast.info('Preparing to start recording...', { duration: 2000 });
      await recorder.start();
      setRecordingState('recording');
      toast.success('Recording started. Capturing frames...', { duration: 3000 });
    } catch (error) {
      setRecordingState('idle');
      console.error('[RecordingControls] Failed to start canvas recording:', error);
      toast.error('Recording could not start.', {
        description:
          error?.message ||
          'Check browser screen-recording permissions and make sure the tree canvas is visible.',
      });
    }
  }, [ensureRecorder, recordingState]);

  const handleStopRecording = useCallback(async () => {
    if (recordingState !== 'recording') return;
    const recorder = ensureRecorder();
    try {
      setRecordingState('stopping');
      toast.info('Finishing recording...', { duration: 2000 });
      await recorder.stop();
      toast.success('Recording saved successfully.');
    } catch (error) {
      console.error('[RecordingControls] Failed to finish canvas recording:', error);
      toast.error('Recording could not be saved.', {
        description: error?.message || 'The browser stopped the MediaRecorder unexpectedly.',
      });
    } finally {
      setRecordingState('idle');
    }
  }, [ensureRecorder, recordingState]);

  return (
    <>
      <AppTooltip content={isStarting ? 'Starting recording...' : 'Start screen recording'}>
        <Button
          id="start-record"
          className="record-button-danger"
          variant="ghost"
          size="icon"
          disabled={disabled || recordingState !== 'idle'}
          onClick={handleStartRecording}
          aria-label={isStarting ? 'Starting recording' : 'Start recording'}
          aria-busy={isStarting}
        >
          {isStarting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CircleDot className="size-4" aria-hidden />
          )}
        </Button>
      </AppTooltip>

      <AppTooltip content={isStopping ? 'Saving recording...' : 'Stop screen recording'}>
        <Button
          id="stop-record"
          variant="ghost"
          size="icon"
          disabled={disabled || !isRecording}
          onClick={handleStopRecording}
          aria-label={isStopping ? 'Saving recording' : 'Stop recording'}
          aria-busy={isStopping}
        >
          {isStopping ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <StopCircle className="size-4" aria-hidden />
          )}
        </Button>
      </AppTooltip>
    </>
  );
}
