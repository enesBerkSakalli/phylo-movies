import React, { useCallback, useState } from 'react';
import { HUD } from '../HUD/HUD.jsx';
import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { RecordingControls } from './RecordingControls.jsx';
import { SaveImageButton } from './SaveImageButton.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
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
    </>
  );
}
