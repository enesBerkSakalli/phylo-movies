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
export type LinkGeometryMode = 'radial-elbow' | 'straight';

export interface FloatingWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
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

export interface MovieTimelineManagerRuntime {
  destroy?: () => void;
  getCursorAtTimelineProgress?: (timelineProgress: number) => TimelineCursorState | null;
  getCursorForFrame?: (
    frameIndex: number,
    options?: { occurrence?: number | null }
  ) => TimelineCursorState | null;
  getSegment?: (segmentIndex: number) => unknown;
  getSegmentCount?: () => number;
  getTimelineProgressForLinearTreeProgress?: (progress: number, treeCount: number) => number | null;
  getTransitionFrameForTimelineProgress?: (timelineProgress: number) => unknown;
  resolveFrameAtIndex?: (
    frameIndex: number,
    options?: { occurrence?: number | null }
  ) => unknown | null;
  resolveFrameAtTimelineProgress?: (timelineProgress: number) => unknown | null;
  hasTransitionSegments?: () => boolean;
  mount?: (container: HTMLElement) => void;
  scrubController?: { isScrubbing?: boolean };
  timelineData?: { totalDuration?: number };
  unmount?: () => void;
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
  split_indices: number[];
  splitKey?: string;
  treeIndex?: number;
  treeSide?: string;
  depth: number;
  height: number;
  path?: string[];
  children: ContextMenuNode[];
}

export interface PlaybackPlayhead {
  animationProgress: number;
  timelineProgress: number | null;
}

export interface PlaybackCursorState extends PlaybackPlayhead {
  frameIndex: number;
  holdKind?: string | null;
}

export interface TimelineCursorState {
  frameIndex: number;
  inputTreeIndex: number | null;
  sourceFrameIndex: number | null;
  targetFrameIndex: number | null;
  msaWindowIndex: number | null;
  pairId: string | null;
  pairOrdinal: number | null;
  sourceInputTreeIndex: number | null;
  targetInputTreeIndex: number | null;
  movieTimeMs: number;
  timelineProgress: number;
  segmentIndex: number | null;
  segmentProgress: number | null;
  occurrenceIndex: number | null;
  occurrenceInFrameIndex: number | null;
  occurrenceRole: string | null;
  holdKind: string | null;
}

export interface TimelineStateUpdate {
  frameIndex?: number;
  playhead?: PlaybackPlayheadUpdate;
  timelineCursor?: TimelineCursorState | null;
  timelineProgress?: number | null;
  [key: string]: unknown;
}

export type PlaybackPlayheadUpdate = Partial<PlaybackCursorState>;

export interface PlaybackSeekOptions {
  timelineProgress?: number | null;
}

export interface AppStoreState {
  // From treeDataset.slice
  treeList: TreeNode[];
  timelineFrames: TimelineFrame[];
  leafNamesByIndex: string[];
  fileName: string | null;
  datasetProvenance: PhyloMovieData['dataset_provenance'] | null;
  datasetVersion: number;
  pairMetrics: PhyloMovieData['pair_metrics'] | null;
  pairs: TimelinePair[];
  subtreeHighlightTracking: SubtreeHighlightTracking;
  temporalEvents: TemporalEvent[];

  // From datasetLifecycle.slice

  // From playbackSlice
  playing: boolean;
  playhead: PlaybackPlayhead;
  timelineCursor: TimelineCursorState | null;
  animationStartTime: number | null;
  animationSpeed: number;
  transitionDuration: number;
  pauseDuration: number;
  frameIndex: number;
  navigationDirection: 'forward' | 'backward' | 'jump';
  currentSegmentIndex: number;
  totalSegments: number;
  treeInSegment: number;
  treesInSegment: number;
  renderInProgress: boolean;

  // From treeControllersRuntime.slice
  treeControllers: TreeControllerRuntime[];

  // From timelineRuntime.slice
  movieTimelineManager: MovieTimelineManagerRuntime | null;

  // From treeTimeline.slice
  barOptionValue: string;
  hoveredSegmentIndex: number | null;
  hoveredSegmentData: unknown;
  hoveredSegmentPosition: unknown;
  selectedTimelineSegmentIndex: number | null;
  isTooltipHovered: boolean;

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

  // From treeViewport.slice
  cameraMode: 'orthographic' | 'orbit';

  // From taxonomyColoringPanel.slice
  taxaColoringOpen: boolean;
  taxaColoringWindow: FloatingWindowRect;

  // From taxonomyColoring.slice
  monophyleticColoringEnabled: boolean;
  taxaGrouping: Record<string, unknown>;
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
  msaWindow: FloatingWindowRect;

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
  manuallyMarkedNodes: unknown[];

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
  adjustAnimationStartTime: (deltaMs: number) => void;
  setNavigationDirection: (direction: NavigationDirection) => void;
  goToPosition: (
    position: number,
    direction?: NavigationDirection,
    options?: PlaybackSeekOptions
  ) => void;
  forward: () => void;
  backward: () => void;
  goToNextInputTree: () => void;
  goToPreviousInputTree: () => void;
  updateTimelineState: (timelineState: TimelineStateUpdate) => void;
  setScrubPosition: (progress: number) => void;
  setTimelineProgress: (progress: number, treeIndex: number) => void;
  setPlayhead: (playhead: PlaybackPlayheadUpdate, frameIndex?: number) => void;
  setRenderInProgress: (inProgress: boolean) => void;
  resetPlayback: () => void;

  setTreeControllers: (controllers: TreeControllerRuntime[]) => void;
  startAnimationPlayback: () => Promise<void>;
  resetInterpolationCaches: () => void;
  stopAnimationPlayback: () => void;
  resetControllers: () => void;

  setHoveredSegment: (
    segmentIndex: number | null,
    segmentData?: unknown,
    position?: unknown
  ) => void;
  setTooltipHovered: (isHovered: boolean) => void;
  setSelectedTimelineSegment: (segmentIndex: number | null) => void;
  setBarOption: (option: string) => void;
  zoomInTimeline: () => void;
  zoomOutTimeline: () => void;
  fitTimeline: () => void;
  scrollToStartTimeline: () => void;
  scrollToEndTimeline: () => void;

  setFontSize: (size: string | number) => void;
  setStrokeWidth: (width: number) => void;
  setNodeSize: (size: number) => void;
  setLabelsVisible: (visible: boolean) => void;
  setBranchAnnotationLabelKey: (valueKey: string) => void;

  setBranchTransformation: (transform: string) => void;
  setLinkGeometryMode: (mode: 'radial-elbow' | 'straight') => void;
  setLayoutAngleDegrees: (degrees: number) => void;
  setLayoutRotationDegrees: (degrees: number) => void;

  toggleCameraMode: () => CameraMode;

  setTaxaColoringOpen: (isOpen: boolean) => void;
  setTaxaColoringWindow: (partial: Partial<FloatingWindowRect>) => void;
  setTaxaGrouping: (grouping: Record<string, unknown>) => void;
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
  setMsaWindow: (partial: Partial<FloatingWindowRect>) => void;
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
  setManuallyMarkedNodes: (nodeIds: unknown[]) => void;

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
