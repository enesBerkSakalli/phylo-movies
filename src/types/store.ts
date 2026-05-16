// types/store.ts - Type definitions for the Zustand store
import type { PhyloMovieData, SplitChangeTimelineEntry } from '../domain/backend/phyloMovieTypes';

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
  currentTreeIndex: number;
}

export interface AppStoreState {
  // From treeDataset.slice
  treeList: any[];
  treeMetadata: any[];
  leafNamesByIndex: string[];
  fullTreeIndices: number[];
  pairInterpolationRanges: Array<[number, number]>;
  treeIndexByPair: Record<string, number[]>;
  fileName: string | null;
  datasetVersion: number;
  transitionResolver: any;
  distanceRfd: number[];
  distanceWeightedRfd: number[];
  scaleList: Array<{ index?: number; value?: number }>;
  maxScale: number;
  pairSolutions: any;
  pivotEdgeTracking: any[];
  subtreeTracking: any[];
  splitChangeTimeline: SplitChangeTimelineEntry[];

  // From datasetLifecycle.slice

  // From playbackSlice
  playing: boolean;
  playhead: PlaybackPlayhead;
  animationStartTime: number | null;
  animationSpeed: number;
  transitionDuration: number;
  pauseDuration: number;
  currentTreeIndex: number;
  navigationDirection: 'forward' | 'backward' | 'jump';
  currentSegmentIndex: number;
  totalSegments: number;
  treeInSegment: number;
  treesInSegment: number;
  renderInProgress: boolean;

  // From treeControllersRuntime.slice
  treeControllers: any[];

  // From timelineRuntime.slice
  movieTimelineManager: any;

  // From treeTimeline.slice
  barOptionValue: string;
  hoveredSegmentIndex: number | null;
  hoveredSegmentData: any;
  hoveredSegmentPosition: any;
  selectedTimelineSegmentIndex: number | null;
  isTooltipHovered: boolean;

  // From treeAppearance.slice
  fontSize: string;
  strokeWidth: number;
  nodeSize: number;
  styleConfig: any;
  labelsVisible: boolean;

  // From treeLayout.slice
  branchTransformation: string;
  linkGeometryMode: 'radial-elbow' | 'straight';
  layoutAngleDegrees: number;
  layoutRotationDegrees: number;

  // From treeViewport.slice
  cameraMode: 'orthographic' | 'orbit';

  // From taxonomyColoringPanel.slice
  taxaColoringOpen: boolean;
  taxaColoringWindow: any;

  // From taxonomyColoring.slice
  monophyleticColoringEnabled: boolean;
  taxaGrouping: any;
  taxaColorVersion: number;

  // From treeHighlightOpacity.slice
  markedSubtreeOpacity: number;

  // From msaSync.slice
  hasMsa: boolean;
  msaSequences: Record<string, string> | null;
  msaWindowSize: number;
  msaStepSize: number;
  msaColumnCount: number;
  msaRegion: any;
  msaPreviousRegion: any;
  msaRowOrder: any;
  isMsaViewerOpen: boolean;
  syncMSAEnabled: boolean;
  msaWindow: any;

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
  markedSubtreeScope: string;
  manuallyMarkedNodes: any[];

  // From treeHighlightState.slice
  pivotEdgesEnabled: boolean;
  pivotEdgeColor: string;
  markedSubtreesEnabled: boolean;
  markedColor: string;
  dimmingEnabled: boolean;
  dimmingOpacity: number;
  subtreeDimmingEnabled: boolean;
  subtreeDimmingOpacity: number;
  upcomingChangesEnabled: boolean;
  upcomingChangeEdges: any[];
  completedChangeEdges: any[];
  changePulseEnabled: boolean;
  pivotEdgeDashingEnabled: boolean;
  highlightColorMode: string;

  // From treeRuntimeSync.slice
  colorManager: any;
  colorVersion: number;
  currentAnimationStage: 'COLLAPSE' | 'EXPAND' | 'REORDER' | null;
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
  getTreeContext: (index: number) => {
    treeIndex: number;
    tree: any;
    metadata: any;
    pairKey: string | null;
    isOriginal: boolean;
    isFullTree: boolean;
  } | null;

  play: () => void;
  stop: () => void;
  setAnimationSpeed: (newSpeed: number) => void;
  adjustAnimationStartTime: (deltaMs: number) => void;
  setNavigationDirection: (direction: 'forward' | 'backward' | 'jump') => void;
  goToPosition: (position: number, direction?: 'forward' | 'backward' | 'jump') => void;
  forward: () => void;
  backward: () => void;
  goToNextAnchor: () => void;
  goToPreviousAnchor: () => void;
  updateTimelineState: (timelineState: any) => void;
  setScrubPosition: (progress: number) => void;
  setTimelineProgress: (progress: number, treeIndex: number) => void;
  setPlayhead: (playhead: Partial<PlaybackPlayhead>) => void;
  setRenderInProgress: (inProgress: boolean) => void;
  resetPlayback: () => void;

  setTreeControllers: (controllers: any[]) => void;
  startAnimationPlayback: () => Promise<void>;
  resetInterpolationCaches: () => void;
  stopAnimationPlayback: () => void;
  resetControllers: () => void;

  setHoveredSegment: (segmentIndex: number | null, segmentData?: any, position?: any) => void;
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

  setBranchTransformation: (transform: string) => void;
  setLinkGeometryMode: (mode: 'radial-elbow' | 'straight') => void;
  setLayoutAngleDegrees: (degrees: number) => void;
  setLayoutRotationDegrees: (degrees: number) => void;

  toggleCameraMode: () => 'orthographic' | 'orbit';

  setTaxaColoringOpen: (isOpen: boolean) => void;
  setTaxaColoringWindow: (partial: any) => void;
  setTaxaGrouping: (grouping: any) => void;
  setMonophyleticColoring: (enabled: boolean) => void;
  updateTaxaColors: (newColorMap: any) => void;

  setMarkedSubtreeOpacity: (opacity: number) => void;

  setMsaData: (data: {
    hasMsa: boolean;
    windowSize: number;
    stepSize: number;
    columnCount: number;
    sequences: Record<string, string> | null;
  }) => void;
  resetMsaData: () => void;
  setMsaRegion: (start: number, end: number) => void;
  clearMsaRegion: () => void;
  setMsaPreviousRegion: (start: number, end: number) => void;
  clearMsaPreviousRegion: () => void;
  setMsaRowOrder: (order: any[]) => void;
  clearMsaRowOrder: () => void;
  openMsaViewer: () => void;
  closeMsaViewer: () => void;
  setMsaWindow: (partial: any) => void;
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

  getCurrentPivotEdge: (indexOverride?: number | null) => any[];
  getMarkedSubtreeData: (indexOverride?: number | null) => any;
  getSubtreeHistoryData: (indexOverride?: number | null) => any;
  getCurrentMovingSubtreeData: (indexOverride?: number | null) => any;
  getSourceDestinationEdgeData: (indexOverride?: number | null) => { source: any[]; dest: any[] };
  setMarkedSubtreeScope: (scope: string) => void;
  setManuallyMarkedNodes: (nodeIds: any[]) => void;

  setDimmingEnabled: (enabled: boolean) => void;
  setDimmingOpacity: (opacity: number) => void;
  setSubtreeDimmingEnabled: (enabled: boolean) => void;
  setSubtreeDimmingOpacity: (opacity: number) => void;
  updateChangeColor: (colorType: string, newColor: string) => void;
  setPivotEdgeColor: (color: string) => void;
  setMarkedColor: (color: string) => void;
  setPivotEdgesEnabled: (enabled: boolean) => void;
  setMarkedSubtreesEnabled: (enabled: boolean) => void;
  setUpcomingChangesEnabled: (enabled: boolean) => void;
  updateUpcomingChanges: (index?: number | null) => void;
  setHighlightColorMode: (mode: string) => void;
  setChangePulseEnabled: (enabled: boolean) => void;
  setPivotEdgeDashingEnabled: (enabled: boolean) => void;

  setAnimationStage: (stage: 'COLLAPSE' | 'EXPAND' | 'REORDER' | null) => void;
  getColorManager: () => any;
  calculateHighlightChangePreviews: (index?: number | null) => { upcoming: any[]; completed: any[] };
  initializeColors: () => void;
  resetColors: () => void;
  updateColorManagerPivotEdge: (edge: any) => void;
  updateColorManagerMarkedSubtrees: (subtrees: any[]) => void;
  updateColorManagerHistorySubtrees: (subtrees: any[]) => void;
  updateColorManagerSourceDestinationEdges: (sourceEdges: any[], destEdges: any[]) => void;
  updateColorManagerMovingSubtree: (subtree: any) => void;
  updateColorManagerForIndex: (index?: number | null) => void;
  updateColorManagerForCurrentIndex: () => void;
  getPulseOpacity: () => number;
  startPulseAnimation: () => void;
  stopPulseAnimation: () => void;

  setClipboardTreeIndex: (index: number | null) => void;
  setClipboardOffsetX: (offset: number) => void;
  setClipboardOffsetY: (offset: number) => void;
  clearClipboard: () => void;

  showNodeContextMenu: (node: ContextMenuNode | null, treeData: unknown | null, x: number, y: number) => void;
  hideNodeContextMenu: () => void;
}
