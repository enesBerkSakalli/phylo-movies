import React, { useCallback, useState, useEffect, useRef } from 'react';
import { HUD } from '../HUD/HUD.jsx';
import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { RecordingControls } from '../media/RecordingControls.jsx';
import { SaveImageButton } from '../media/SaveImageButton.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineSegmentTooltip } from '../timeline/TimelineSegmentTooltip.jsx';
import { useAppStore } from '../../../js/core/store.js';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';

export function MoviePlayerBar() {
  const gui = useAppStore((s) => s.gui);
  const forward = useAppStore((s) => s.forward);
  const backward = useAppStore((s) => s.backward);
  const setAnimationSpeed = useAppStore((s) => s.setAnimationSpeed);
  const animationSpeed = useAppStore((s) => s.animationSpeed);
  const barOptionValue = useAppStore((s) => s.barOptionValue);
  const setBarOption = useAppStore((s) => s.setBarOption);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);

  // Timeline tooltip state
  const hoveredSegmentIndex = useAppStore((s) => s.hoveredSegmentIndex);
  const hoveredSegmentData = useAppStore((s) => s.hoveredSegmentData);
  const movieData = useAppStore((s) => s.movieData);
  const movieTimelineManager = useAppStore((s) => s.movieTimelineManager);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  // Get segments from timeline manager
  const segments = movieTimelineManager?.segments || [];

  // Track mouse position for tooltip
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    if (hoveredSegmentIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [hoveredSegmentIndex]);  // Get leaf names function for tooltip
  const getLeafNames = useCallback((indices) => {
    const sortedLeaves = movieData?.sorted_leaves;
    if (!sortedLeaves || !Array.isArray(sortedLeaves)) return [];

    const leafNames = [];
    for (const idx of indices) {
      if (Number.isInteger(idx) && idx >= 0 && idx < sortedLeaves.length) {
        leafNames.push(sortedLeaves[idx]);
      }
    }
    return leafNames;
  }, [movieData?.sorted_leaves]);

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

              {toolbarExpanded && (
                <>
                  <TimelineScrollControls />

                  <div className="vertical-divider"></div>

                  <PlaybackSpeedControl
                    value={animationSpeed}
                    setValue={setAnimationSpeed}
                  />

                  <div className="vertical-divider"></div>
                </>
              )}

              <TransportControls
                onBackward={backward}
                onForward={forward}
              />

              {toolbarExpanded && (
                <>
                  <div className="vertical-divider"></div>

                  <RecordingControls />

                  <div className="vertical-divider"></div>

                  <SaveImageButton />
                </>
              )}

              <div className="vertical-divider"></div>

              <Button
                variant="ghost"
                size="icon"
                title={toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}
                aria-label={toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}
                aria-expanded={toolbarExpanded}
                onClick={() => setToolbarExpanded(!toolbarExpanded)}
                className="toolbar-toggle-btn"
              >
                {toolbarExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
              </Button>
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

      {/* Timeline segment tooltip - positioned above cursor */}
      {hoveredSegmentIndex !== null && hoveredSegmentData && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y - 12}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10000,
            pointerEvents: 'none',
            minWidth: '400px',
            maxWidth: '500px'
          }}
          className="animate-in fade-in-0 zoom-in-95 duration-200"
        >
          <div className="rounded-lg border bg-card p-3 shadow-lg">
            <TimelineSegmentTooltip
              segment={hoveredSegmentData}
              segmentIndex={hoveredSegmentIndex}
              totalSegments={segments.length}
              getLeafNames={getLeafNames}
            />
          </div>
        </div>
      )}
    </>
  );
}
