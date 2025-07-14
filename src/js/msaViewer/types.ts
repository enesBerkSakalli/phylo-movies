/**
 * Type definitions for AlignmentViewer2Component
 */

import { Alignment } from "alignment-viewer-2";

export interface AlignmentViewer2ComponentProps {
  msaString: string;
  containerWidth?: number;
  containerHeight?: number;
}

export interface ViewportIndices {
  seqIdxStart: number;
  seqIdxEnd: number;
  posIdxStart: number;
  posIdxEnd: number;
}

export interface AlignmentViewerState {
  showSettings: boolean;
  currentPosition: number;
  highlightedTaxa: string[];
  mainViewportVisibleIdxs?: ViewportIndices;
}

export interface WindowSyncData {
  windowStart: number;
  windowEnd: number;
}

export interface MSASyncEvent extends CustomEvent {
  detail: {
    position?: number;
    windowInfo?: WindowSyncData;
    highlightedTaxa?: string[];
  };
}

export interface SettingsButtonProps {
  showSettings: boolean;
  onToggleSettings: () => void;
}

export interface SearchButtonProps {
  triggerShowSearch: React.RefObject<(() => void) | undefined>;
}

export interface SettingsPanelProps {
  showSettings: boolean;
  settingsElement: React.JSX.Element;
}

export interface AlignmentViewerError {
  message: string;
  originalError?: any;
}

export interface VirtualizationState {
  cellSizePx?: number;
  worldOffsetPx?: number;
  cellCount?: number;
  containerSizePx?: number;
}

export interface AlignmentVirtualizationsState {
  [virtualizationId: string]: VirtualizationState;
}

export interface ReduxStoreState {
  alignmentVirtualizations?: AlignmentVirtualizationsState;
}