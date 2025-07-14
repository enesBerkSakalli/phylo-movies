/**
 * AlignmentViewer2Component.tsx
 * Integrates AlignmentViewer 2.0 with phylo-movies GUI synchronization
 */

import React, { useRef, useMemo } from "react";
import {
  AlignmentViewer,
  IBarplotExposedProps
} from "alignment-viewer-2";
import useAV2Settings from "alignment-viewer-2/dist/js/components/settings/Settings";
import { Provider } from "react-redux";
import { reduxStore } from "alignment-viewer-2/dist/js/redux/ReduxStore";
import "alignment-viewer-2/dist/standalone/alignmentviewer.css";

// Local imports
import { AlignmentViewer2ComponentProps } from './types';
import { useAlignment, useAlignmentViewerState, useViewportSync, useMSASync } from './hooks';
import { SettingsButton, SearchButton, SettingsPanel } from './components';
import { containerStyles, appContentStyles } from './styles';

// UI Components
import MSAViewerNoData from "./MSAViewerNoData";
import MSAViewerLoading from "./MSAViewerLoading";
import MSAViewerError from "./MSAViewerError";

/**
 * Inner component that contains the main logic
 */
function AlignmentViewer2ComponentInner({
  msaString,
  containerWidth = 1200,
  containerHeight = 500
}: AlignmentViewer2ComponentProps): JSX.Element {

  // Parse alignment
  const { alignment, error, loading } = useAlignment(msaString);

  // Component state
  const { state, updateState, hideSettings, showSettings } = useAlignmentViewerState();
  const { showSettings: showSettingsState, currentPosition, highlightedTaxa } = state;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const alignmentViewerRef = useRef<any>(null);
  const triggerShowSearch = useRef<(() => void) | undefined>(undefined);

  // Settings
  const settingsHook = useAV2Settings({
    requestSettingsClose: hideSettings,
    useUrlAndLocalstorage: true
  });

  const {
    currentlySelectedProperties: settings,
    dropZoneElement,
    element: settingsElement
  } = settingsHook;

  const {
    alignment: settingsAlignment,
    alignmentLoading,
    alignmentType,
    aaColorScheme,
    ntColorScheme,
    positionsToStyle,
    residueColoring,
    zoomLevel,
    sortBy,
    showLogo,
    logoType,
    showAnnotations,
    showMinimap,
    barplots
  } = settings;

  const showConsensus = (settings as any).showConsensus ?? true;
  const showQuery = (settings as any).showQuery ?? true;

  // Computed values
  const activeAlignment = alignment || settingsAlignment;
  const alignmentUUID = useMemo(() => {
    return activeAlignment ? activeAlignment.getUUID() : null;
  }, [activeAlignment]);

  // Viewport synchronization
  const { syncViewportWithWindow, handleViewportChanged } = useViewportSync(activeAlignment, alignmentUUID, zoomLevel);

  // MSA sync event handler
  useMSASync(activeAlignment, currentPosition, syncViewportWithWindow, updateState);

  // Logo and barplots setup
  const logoSvgId = activeAlignment ? `logo-${activeAlignment.getUUID()}` : "logoplot";

  const barplotsProps: IBarplotExposedProps[] = useMemo(() => {
    if (!activeAlignment) return [];

    const barplotData = barplots || [];
    return barplotData.map((bp) => {
      return {
        svgId: `${bp.key}-barplot-${activeAlignment.getUUID()}`,
        dataSeriesSet: [bp],
        heightPx: 75
      };
    });
  }, [activeAlignment, barplots]);

  // AlignmentViewer props
  const alignmentViewerProps = useMemo(() => {
    const baseProps = {
      alignment: activeAlignment,
      alignmentType: alignmentType,
      aaColorScheme: aaColorScheme,
      ntColorScheme: ntColorScheme,
      positionsToStyle: positionsToStyle,
      residueColoring: residueColoring,
      zoomLevel: zoomLevel,
      sortBy: sortBy,
      showLogo: showLogo,
      showAnnotations: showAnnotations,
      showMinimap: showMinimap,
      showConsensus: showConsensus,
      showQuery: showQuery,
      disableSearch: false,
      disableSearchKeyboardShortcut: false,
      triggerShowSearch: triggerShowSearch,
      mainViewportVisibleChanged: handleViewportChanged,
      logoOptions: {
        svgId: logoSvgId,
        logoType: logoType
      },
      barplots: barplotsProps
    };

    if (highlightedTaxa && highlightedTaxa.length > 0) {
      return {
        ...baseProps,
        highlightedSequences: highlightedTaxa
      };
    }

    return baseProps;
  }, [
    activeAlignment,
    alignmentType,
    aaColorScheme,
    ntColorScheme,
    positionsToStyle,
    residueColoring,
    zoomLevel,
    sortBy,
    showLogo,
    showAnnotations,
    showMinimap,
    showConsensus,
    showQuery,
    logoSvgId,
    logoType,
    barplotsProps,
    highlightedTaxa,
    triggerShowSearch,
    handleViewportChanged
  ]);

  // Render guards
  if (alignmentLoading) return <MSAViewerLoading />;
  if (!msaString && !activeAlignment) return <MSAViewerNoData />;
  if (error) return <MSAViewerError
    error={error}
    msaString={msaString}
    dimensions={{
      width: containerWidth,
      height: containerHeight,
      padding: 0,
      headerHeight: 0
    }}
  />;
  if (loading || !activeAlignment) return <MSAViewerLoading />;

  // Render
  return (
    <div
      ref={containerRef}
      style={{
        ...containerStyles,
        width: containerWidth ? `${containerWidth}px` : "100%",
        height: containerHeight ? `${containerHeight}px` : "100%"
      }}
    >
      {dropZoneElement}

      <SettingsPanel
        showSettings={showSettingsState}
        settingsElement={settingsElement}
      />

      {activeAlignment && (
        <div className="app-content" style={appContentStyles}>
          <AlignmentViewer
            {...alignmentViewerProps as any}
            ref={alignmentViewerRef}
          />
        </div>
      )}

      <SettingsButton
        showSettings={showSettingsState}
        onToggleSettings={showSettings}
      />

      <SearchButton triggerShowSearch={triggerShowSearch} />
    </div>
  );
}

/**
 * Provider wrapper component
 */
export default function AlignmentViewer2Component(props: AlignmentViewer2ComponentProps): JSX.Element {
  return (
    <Provider store={reduxStore}>
      <AlignmentViewer2ComponentInner {...props} />
    </Provider>
  );
}