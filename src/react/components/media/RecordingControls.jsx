import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleDot, StopCircle } from 'lucide-react';
import { CanvasRecorder } from '@/js/services/media/canvasRecorder';
import { toast } from 'sonner';

export function RecordingControls({ disabled = false }) {
  const recorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const ensureRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new CanvasRecorder({
        autoSave: true,
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
      toast.info('Preparing to start recording…', { duration: 2000 });
      await recorder.start();
      toast.success('Recording started. Capturing frames…', { duration: 3000 });
    } catch (error) {
      setIsRecording(false);
      console.error('[MoviePlayerBar] Failed to start recording:', error);
      toast.error('Failed to start recording. Please check permissions.');
    }
  }, [ensureRecorder]);

  const handleStopRecording = useCallback(async () => {
    const recorder = ensureRecorder();
    try {
      toast.info('Finishing recording…', { duration: 2000 });
      await recorder.stop();
      toast.success('Recording saved successfully.');
    } catch (error) {
      console.error('[MoviePlayerBar] Failed to stop recording:', error);
      toast.error('Failed to stop recording.');
    } finally {
      setIsRecording(false);
    }
  }, [ensureRecorder]);

  return (
    <>
      <div className="vertical-divider"></div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            id="start-record"
            className="record-button-danger"
            variant="ghost"
            size="icon"
            disabled={disabled || isRecording}
            onClick={handleStartRecording}
            aria-label="Start recording"
          >
            <CircleDot className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Start screen recording</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            id="stop-record"
            variant="ghost"
            size="icon"
            disabled={disabled || !isRecording}
            onClick={handleStopRecording}
            aria-label="Stop recording"
          >
            <StopCircle className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Stop screen recording</TooltipContent>
      </Tooltip>
    </>
  );
}
