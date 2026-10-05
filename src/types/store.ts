// types/store.ts - Type definitions for the Zustand store
import type {
  PhyloMovieData,
  TemporalEvent,
  TimelineFrame,
  TimelinePair,
  TreeNode,
  SubtreeHighlightTracking,
} from '../domain/backend/phyloMovieTypes';

export type NavigationDirection = 'forward' | 'backward' | 'jump';
export type CameraMode = 'orthographic' | 'orbit';
export type AnimationStage = 'COLLAPSE' | 'EXPAND' | 'REORDER' | null;
export type LayoutProjectionMode = 'radial' | 'hyperbolic' | 'walrus-3d';
export interface TimelineCursorFrameOptions {
  occurrence?: 'semantic' | 'last';
}

export interface MsaRegionRange {
  start: number;
  end: number;
}

export interface TreeControllerRuntime {
  calculateLayout?: () => unknown;
  renderAllElements?: () => void;
  resetInterpolationCaches?: () => void;
  setCameraMode?: (mode: CameraMode) => void;
  startAnimationPlayback?: () => Promise<void> | void;
  stopAnimation?: () => void;
  [key: string]: unknown;
}

export interface TimelineRuntime {
  segments: Array<{ isInputTreeSegment: boolean; [key: string]: unknown }>;
  steps: unknown[];
  totalDuration: number;
  frameAt: (movieTimeMs: number) => unknown;
  cursorAt: (movieTimeMs: number) => TimelineCursorState | null;
  cursorForFrame: (
    frameIndex: number,
    options?: TimelineCursorFrameOptions
  ) => TimelineCursorState | null;
}

export interface TimelineViewRuntime {
  zoomIn: (pct?: number) => void;
  zoomOut: (pct?: number) => void;
  fit: () => void;
  [key: string]: unknown;
}

export interface ColorManagerRuntime {
  [key: string]: unknown;
}

export interface TreeContext {
  treeIndex: number;
  tree: TreeNode | null;
  metadata: unknown;
  pairId: string | null;
  isOriginal: boolean;
  isInputTree: boolean;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuNode {
  name: string;
  length: number;
  split_indices: readonly number[];
  splitKey?: string;
  treeIndex?: number;
  treeSide?: string;
  depth: number;
  height: number;
  path?: string[];
  children: ContextMenuNode[];
}

export interface TimelineCursorState {
  frameIndex: number;
  sourceFrameIndex: number | null;
  sourceInputTreeIndex: number | null;
  targetInputTreeIndex: number | null;
  movieTimeMs: number;
  segmentIndex: number | null;
  occurrenceRole: string | null;
  holdKind: string | null;
  motionSourceFrameIndex?: number | null;
  motionTargetFrameIndex?: number | null;
}

export interface PlaybackSeekOptions {
  movieTimeMs?: number | null;
}

export interface TaxaGrouping {
  mode?: string;
  separators?: unknown;
  strategyType?: string | null;
  segmentIndex?: number;
  useRegex?: boolean;
  regexPattern?: string | null;
  csvTaxaMap?: Record<string, string> | null;
  groupColorMap?: Record<string, string> | null;
  taxaColorMap?: Record<string, string> | null;
  csvGroups?: unknown;
  groups?: unknown;
  csvColumn?: string | null;
  csvData?: unknown;
  csvFileName?: string | null;
}

/**
 * Uniform read access to a movie's trees, whichever encoding carries them. See
 * src/domain/backend/treeSource.js - the JSON payload holds a plain array, the
 * PMB1 container holds typed-array blocks, and consumers read through this
 * rather than indexing either.
 */
interface TreeSource {
  treeCount: number;
  hydrateAt: (index: number) => TreeNode;
  payloadAt: (index: number) => unknown;
  isCompactAt: (index: number) => boolean;
}

export interface AppStoreState {
  // From treeDataset.slice
  treeList: Array<TreeNode | undefined>;
  treeSource: TreeSource | null;
  timelineFrames: TimelineFrame[];
  leafNamesByIndex: string[];
  fileName: string | null;
  datasetProvenance: PhyloMovieData['dataset_provenance'] | null;
  datasetVersion: number;
  pairMetrics: PhyloMovieData['pair_metrics'] | null;
  pairs: TimelinePair[];
  pairChanges: { byPairId: Map<string, unknown>; maxRf: number };
  subtreeHighlightTracking: SubtreeHighlightTracking;
  temporalEvents: TemporalEvent[];
  ensureInputTreesHydrated: () => Array<TreeNode | null>;

  // From datasetLifecycle.slice

  // From playbackSlice
  playing: boolean;
  timelineCursor: TimelineCursorState | null;
  animationStartTime: number | null;
  animationSpeed: number;
  frameIndex: number;
  renderInProgress: boolean;

  // From treeControllerRuntime.slice
  treeController: TreeControllerRuntime | null;

  // From timelineRuntime.slice
  timeline: TimelineRuntime | null;
  timelineView: TimelineViewRuntime | null;
  isScrubbing: boolean;

  // From treeTimeline.slice
  hoveredSegment: { index: number; x: number } | null;
  selectedTimelineSegmentIndex: number | null;

  // From treeAppearance.slice
  fontSize: string;
  strokeWidth: number;
  nodeSize: number;
  styleConfig: Record<string, unknown>;
  labelsVisible: boolean;
  branchAnnotationLabelKey: string;

  // From treeLayout.slice
  branchTransformation: string;
  linkGeometryMode: 'radial-elbow' | 'straight';
  layoutAngleDegrees: number;
  layoutRotationDegrees: number;
  layoutProjectionMode: LayoutProjectionMode;
  hyperbolicProjectionStrength: number;

  // From treeViewport.slice
  cameraMode: 'orthographic' | 'orbit';

  // From taxonomyColoringPanel.slice
  taxaColoringOpen: boolean;

  // From taxonomyColoring.slice
  monophyleticColoringEnabled: boolean;
  taxaGrouping: TaxaGrouping | null;
  taxaColorVersion: number;

  // From treeHighlightOpacity.slice
  subtreeHighlightOpacity: number;

  // From msaSync.slice
  msaSequences: Record<string, string> | null;
  msaWindowSize: number;
  msaStepSize: number;
  msaRegion: MsaRegionRange | null;
  msaPreviousRegion: MsaRegionRange | null;
  msaRowOrder: string[] | null;
  isMsaViewerOpen: boolean;
  syncMSAEnabled: boolean;

  // From treeComparison.slice
  comparisonMode: boolean;
  leftTreeOffsetX: number;
  leftTreeOffsetY: number;
  rightTreeOffsetX: number;
  rightTreeOffsetY: number;
  viewsConnected: boolean;
  connectorStrokeWidth: number;
  linkConnectionOpacity: number;

  // From subtreeSelection.slice
  subtreeHighlightScope: string;
  manuallyMarkedNodes: number[];

  // From treeHighlightState.slice
  pivotEdgesEnabled: boolean;
  pivotEdgeColor: string;
  subtreeHighlightsEnabled: boolean;
  subtreeHighlightColor: string;
  dimmingEnabled: boolean;
  dimmingOpacity: number;
  subtreeDimmingEnabled: boolean;
  subtreeDimmingOpacity: number;
  upcomingChangesEnabled: boolean;
  upcomingChangeEdges: unknown[];
  completedChangeEdges: unknown[];
  changePulseEnabled: boolean;
  pivotEdgeDashingEnabled: boolean;
  highlightColorMode: string;

  // From treeRuntimeSync.slice
  colorManager: ColorManagerRuntime | null;
  colorVersion: number;
  currentAnimationStage: AnimationStage;
  changePulsePhase: number;

  // From treeClipboard.slice
  clipboardTreeIndex: number | null;
  clipboardOffsetX: number;
  clipboardOffsetY: number;

  // From treeInteraction.slice
  contextMenuOpen: boolean;
  contextMenuPosition: ContextMenuPosition;
  contextMenuNode: ContextMenuNode | null;

  // Actions
  initialize: (movieData: PhyloMovieData) => void;
  reset: () => void;
  getTreeContext: (index: number) => TreeContext | null;

  play: () => void;
  stop: () => void;
  setAnimationSpeed: (newSpeed: number) => void;
  goToPosition: (
    position: number,
    direction?: NavigationDirection,
    options?: PlaybackSeekOptions
  ) => void;
  forward: () => void;
  backward: () => void;
  goToNextInputTree: () => void;
  goToPreviousInputTree: () => void;
  seek: (movieTimeMs: number) => void;
  frameAt: (movieTimeMs: number) => unknown;
  setRenderInProgress: (inProgress: boolean) => void;
  resetPlayback: () => void;

  setTreeController: (controller: TreeControllerRuntime | null) => void;
  startAnimationPlayback: () => Promise<void>;
  resetInterpolationCaches: () => void;
  stopAnimationPlayback: () => void;
  resetControllers: () => void;

  setHoveredSegment: (hoveredSegment: { index: number; x: number } | null) => void;
  setSelectedTimelineSegment: (segmentIndex: number | null) => void;
  zoomInTimeline: () => void;
  zoomOutTimeline: () => void;
  fitTimeline: () => void;

  setFontSize: (size: string | number) => void;
  setStrokeWidth: (width: number) => void;
  setNodeSize: (size: number) => void;
  setLabelsVisible: (visible: boolean) => void;
  setBranchAnnotationLabelKey: (valueKey: string) => void;

  setBranchTransformation: (transform: string) => void;
  setLinkGeometryMode: (mode: 'radial-elbow' | 'straight') => void;
  setLayoutAngleDegrees: (degrees: number) => void;
  setLayoutRotationDegrees: (degrees: number) => void;
  setLayoutProjectionMode: (mode: LayoutProjectionMode) => void;
  setHyperbolicProjectionStrength: (strength: number) => void;

  toggleCameraMode: () => CameraMode;
  setCameraMode: (mode: CameraMode) => CameraMode;

  setTaxaColoringOpen: (isOpen: boolean) => void;
  setTaxaGrouping: (grouping: TaxaGrouping | null) => void;
  setMonophyleticColoring: (enabled: boolean) => void;

  setSubtreeHighlightOpacity: (opacity: number) => void;

  setMsaData: (data: {
    windowSize: number;
    stepSize: number;
    sequences: Record<string, string> | null;
  }) => void;
  resetMsaData: () => void;
  setMsaRegion: (start: number, end: number) => void;
  clearMsaRegion: () => void;
  setMsaPreviousRegion: (start: number, end: number) => void;
  clearMsaPreviousRegion: () => void;
  setMsaRowOrder: (order: string[]) => void;
  clearMsaRowOrder: () => void;
  openMsaViewer: () => void;
  closeMsaViewer: () => void;
  setSyncMSAEnabled: (enabled: boolean) => void;

  toggleComparisonMode: () => void;
  setLeftTreeOffsetX: (offset: number) => void;
  setLeftTreeOffsetY: (offset: number) => void;
  setRightTreeOffsetX: (offset: number) => void;
  setRightTreeOffsetY: (offset: number) => void;
  setViewsConnected: (enabled: boolean) => void;
  setConnectorStrokeWidth: (width: number) => void;
  setLinkConnectionOpacity: (opacity: number) => void;
  resetComparison: () => void;

  getCurrentPivotEdge: (indexOverride?: number | null) => unknown[];
  getSubtreeHighlightData: (indexOverride?: number | null) => unknown[];
  getSubtreeHistoryData: (indexOverride?: number | null) => unknown[];
  getActiveMoverSubtreeData: (indexOverride?: number | null) => unknown[];
  getSourceDestinationEdgeData: (indexOverride?: number | null) => {
    source: unknown[];
    dest: unknown[];
  };
  setSubtreeHighlightScope: (scope: string) => void;
  setManuallyMarkedNodes: (nodeIds: number[]) => void;

  setDimmingEnabled: (enabled: boolean) => void;
  setDimmingOpacity: (opacity: number) => void;
  setSubtreeDimmingEnabled: (enabled: boolean) => void;
  setSubtreeDimmingOpacity: (opacity: number) => void;
  updateChangeColor: (colorType: string, newColor: string) => void;
  setPivotEdgeColor: (color: string) => void;
  setSubtreeHighlightColor: (color: string) => void;
  setPivotEdgesEnabled: (enabled: boolean) => void;
  setSubtreeHighlightsEnabled: (enabled: boolean) => void;
  setUpcomingChangesEnabled: (enabled: boolean) => void;
  updateUpcomingChanges: (index?: number | null) => void;
  setHighlightColorMode: (mode: string) => void;
  setChangePulseEnabled: (enabled: boolean) => void;
  setPivotEdgeDashingEnabled: (enabled: boolean) => void;

  setAnimationStage: (stage: AnimationStage) => void;
  getColorManager: () => ColorManagerRuntime | null;
  calculateHighlightChangePreviews: (index?: number | null) => {
    upcoming: unknown[];
    completed: unknown[];
  };
  initializeColors: () => void;
  resetColors: () => void;
  updateColorManagerPivotEdge: (edge: unknown) => void;
  updateColorManagerHighlightedSubtrees: (subtrees: unknown[]) => void;
  updateColorManagerHistorySubtrees: (subtrees: unknown[]) => void;
  updateColorManagerSourceDestinationEdges: (sourceEdges: unknown[], destEdges: unknown[]) => void;
  updateColorManagerActiveMoverSubtrees: (subtree: unknown) => void;
  updateColorManagerForIndex: (index?: number | null) => void;
  updateColorManagerForCurrentIndex: () => void;
  getPulseOpacity: () => number;
  startPulseAnimation: () => void;
  stopPulseAnimation: () => void;

  setClipboardTreeIndex: (index: number | null) => void;
  setClipboardOffsetX: (offset: number) => void;
  setClipboardOffsetY: (offset: number) => void;
  clearClipboard: () => void;

  showNodeContextMenu: (node: ContextMenuNode | null, position: ContextMenuPosition) => void;
  hideNodeContextMenu: () => void;
}
