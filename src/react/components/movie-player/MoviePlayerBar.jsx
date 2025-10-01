import React, { useCallback, useRef, useState } from 'react';
import { HUD } from '../HUD.jsx';
import { MovieChartSection } from './MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { RecordingControls } from './RecordingControls.jsx';
import { useAppStore } from '../../../js/core/store.js';
import { CanvasRecorder } from '../../../js/services/canvasRecorder.js';
import { notifications } from '../../../js/services/notifications.js';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Menu, ZoomOut, ZoomIn, Scan, ChevronsLeft, ChevronsRight, Gauge } from 'lucide-react';

export function MoviePlayerBar() {
  const playing = useAppStore((s) => s.playing);
  const gui = useAppStore((s) => s.gui);
  const forward = useAppStore((s) => s.forward);
  const backward = useAppStore((s) => s.backward);
  const goToPosition = useAppStore((s) => s.goToPosition);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const treeListLen = useAppStore((s) => s.treeList?.length || 0);
  const setAnimationSpeed = useAppStore((s) => s.setAnimationSpeed);
  const animationSpeed = useAppStore((s) => s.animationSpeed);
  const barOptionValue = useAppStore((s) => s.barOptionValue);
  const setBarOption = useAppStore((s) => s.setBarOption);
  const recorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const canStepBackward = currentTreeIndex > 0;
  const canStepForward = currentTreeIndex < treeListLen - 1;

  const ensureRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new CanvasRecorder({ autoSave: false, notifications });
    }
    return recorderRef.current;
  }, [notifications]);

  const onPlayClick = useCallback(async () => {
    try {
      if (playing) gui?.stop?.();
      else await gui?.play?.();
    } catch {}
  }, [playing, gui]);

  const onJumpClick = useCallback(() => {
    const input = document.getElementById('positionValue');
    if (!input) return;
    const raw = parseInt(input.value, 10);
    if (!Number.isFinite(raw)) return;
    const target = Math.max(1, Math.min(treeListLen, raw)) - 1; // 1-based to 0-based
    goToPosition(target);
  }, [goToPosition, treeListLen]);

  const onBackwardStep = useCallback(() => {
    if (currentTreeIndex > 0) {
      goToPosition(currentTreeIndex - 1);
    }
  }, [currentTreeIndex, goToPosition]);

  const onForwardStep = useCallback(() => {
    if (currentTreeIndex < treeListLen - 1) {
      goToPosition(currentTreeIndex + 1);
    }
  }, [currentTreeIndex, treeListLen, goToPosition]);

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

  const { open, toggleSidebar } = useSidebar();
  const handleNavigationToggle = useCallback(() => {
    try {
      toggleSidebar();
    } catch {}
  }, [toggleSidebar]);

  return (
    <>
      <div className="movie-player-bar" role="region" aria-label="Movie Player Controls">
        <div className="movie-player-container">
          <div className="controls-row" role="group" aria-label="Transport controls and chart controls">
            <div className="left-controls" role="group" aria-label="Transport controls and position">
              <Button
                id="nav-toggle-button"
                variant="ghost"
                size="icon"
                title="Toggle sidebar"
                aria-label="Toggle sidebar"
                aria-controls="app-sidebar"
                aria-expanded={open ? 'true' : 'false'}
                onClick={handleNavigationToggle}
              >
                <Menu className="size-5" />
              </Button>

              <div className="vertical-divider"></div>

              <div className="timeline-zoom-controls" role="group" aria-label="Timeline zoom controls">
                <Button id="zoomOutBtn" variant="ghost" size="icon" title="Zoom out timeline (Ctrl + -)" onClick={() => gui?.zoomOutTimeline?.()}>
                  <ZoomOut className="size-5" />
                </Button>
                <Button id="fitToWindowBtn" variant="ghost" size="icon" title="Fit entire timeline to window (Ctrl + 0)" onClick={() => gui?.fitTimeline?.()}>
                  <Scan className="size-5" />
                </Button>
                <Button id="zoomInBtn" variant="ghost" size="icon" title="Zoom in timeline (Ctrl + +)" onClick={() => gui?.zoomInTimeline?.()}>
                  <ZoomIn className="size-5" />
                </Button>
              </div>

              <div className="timeline-scroll-controls" role="group" aria-label="Timeline scroll controls">
                <Button id="scrollToStartBtn" variant="ghost" size="icon" title="Scroll to start (Home)" onClick={() => gui?.scrollToStartTimeline?.()}>
                  <ChevronsLeft className="size-5" />
                </Button>
                <Button id="scrollToEndBtn" variant="ghost" size="icon" title="Scroll to end (End)" onClick={() => gui?.scrollToEndTimeline?.()}>
                  <ChevronsRight className="size-5" />
                </Button>
              </div>

              <div className="vertical-divider"></div>

              <div className="speed-control" role="group" aria-labelledby="speed-control-label">
                <Gauge className="size-5" />
                <Slider
                  id="animation-speed-range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={[animationSpeed]}
                  onValueChange={(vals) => {
                    const v = Array.isArray(vals) ? vals[0] : 1
                    if (typeof v === 'number' && Number.isFinite(v)) setAnimationSpeed(v)
                  }}
                  aria-label="Animation speed"
                  className="w-40"
                />
              </div>

              <TransportControls
                playing={playing}
                onPlayClick={onPlayClick}
                onBackward={backward}
                onBackwardStep={onBackwardStep}
                onForward={forward}
                onForwardStep={onForwardStep}
                canStepBackward={canStepBackward}
                canStepForward={canStepForward}
              />

              <div className="vertical-divider"></div>

              <div className="jump-to-step-control" role="group" aria-labelledby="position-control-label">
                <input
                  type="number"
                  id="positionValue"
                  name="pos"
                  defaultValue={1}
                  min="1"
                  placeholder="Step"
                  aria-label="Step number to jump to"
                  title="Enter step number to navigate to"
                  className="jump-to-step-field"
                />
                <button id="positionButton" title="Go to entered step" aria-label="Navigate to specified step" className="jump-button" onClick={onJumpClick}>
                  Go
                </button>
              </div>

              <RecordingControls
                isRecording={isRecording}
                onStart={handleStartRecording}
                onStop={handleStopRecording}
              />
            </div>
          </div>

          <div className="timeline-container-full-width">
            <div className="interpolation-timeline-container">
              {/* Timeline container will be created dynamically by MovieTimelineManager */}
            </div>
          </div>

          <MovieChartSection barOptionValue={barOptionValue} onBarOptionChange={setBarOption} />
        </div>
      </div>

      <HUD />
    </>
  );
}
