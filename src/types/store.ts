// types/store.ts - Type definitions for the Zustand store

export interface AppStoreState {
  // From phylogeneticDataSlice
  movieData: any; // TODO: define proper type
  treeList: any[]; // TODO: define proper type
  fileName: string | null;
  transitionResolver: any; // TODO: define proper type
  distanceRfd: number[];
  distanceWeightedRfd: number[];
  scaleValues: number[];
  pairSolutions: any; // TODO: define proper type
  pivotEdgeTracking: any[]; // TODO: define proper type
  subtreeTracking: any[]; // TODO: define proper type

  // From playbackSlice
  playing: boolean;
  animationProgress: number;
  currentTreeIndex: number;
  animationSpeed: number;
  navigationDirection: 'forward' | 'backward';

  // From controllersSlice
  treeControllers: any[]; // TODO: define proper type

  // From timelineSlice
  timelineProgress: number;
  movieTimelineManager: any; // TODO: define proper type

  // From treeAppearanceSlice
  fontSize: string;
  strokeWidth: number;
  nodeSize: number;
  branchTransformation: string;
  layoutAngleDegrees: number;
  layoutRotationDegrees: number;

  // From msaViewerSlice
  hasMsa: boolean;
  msaRegion: any; // TODO: define proper type
  msaPreviousRegion: any; // TODO: define proper type
  msaRowOrder: any[]; // TODO: define proper type
  msaWindowSize: number;
  msaStepSize: number;
  msaColumnCount: number;
  syncMSAEnabled: boolean;
  isMsaViewerOpen: boolean;
  msaWindow: any; // TODO: define proper type

  // From comparisonViewSlice
  comparisonMode: boolean;
  viewsConnected: boolean;
  leftTreeOffsetX: number;
  leftTreeOffsetY: number;

  // From visualisationChangeStateSlice
  pivotEdgesEnabled: boolean;
  pivotEdgeColor: string;
  markedSubtreesEnabled: boolean;
  markedSubtreeMode: string;
  markedSubtreeOpacity: number;
  highlightColorMode: string;
  manuallyMarkedNodes: any[]; // TODO: define proper type

  // From visualEffectsSlice
  dimmingEnabled: boolean;
  dimmingOpacity: number;
  subtreeDimmingEnabled: boolean;
  subtreeDimmingOpacity: number;
  linkConnectionOpacity: number;
  connectorStrokeWidth: number;
  pulseEnabled: boolean;
  dashingEnabled: boolean;
  upcomingChangesEnabled: boolean;

  // From clipboardSlice
  clipboardTreeIndex: number | null;

  // From contextMenuSlice
  contextMenuOpen: boolean;
  contextMenuPosition: any; // TODO: define proper type
  contextMenuNode: any; // TODO: define proper type

  // Actions - these are functions
  initialize: (data: any) => void;
  reset: () => void;
  startAnimationPlayback: () => Promise<void>;
  stopAnimationPlayback: () => void;
  goToPosition: (position: number) => void;
  goToNextAnchor: () => void;
  goToPreviousAnchor: () => void;
  forward: () => void;
  backward: () => void;
  setAnimationSpeed: (speed: number) => void;
  setBarOption: (option: string) => void;
  barOptionValue: string;
  scrollToStartTimeline: () => void;
  scrollToEndTimeline: () => void;
  zoomOutTimeline: () => void;
  zoomInTimeline: () => void;
  fitTimeline: () => void;
  setTimelineProgress: (progress: number, treeIndex: number, timeFactor: number) => void;
  updateTimelineState: (updates: any) => void;
  setClipboardTreeIndex: (index: number | null) => void;
  clearClipboard: () => void;
  setFontSize: (size: string) => void;
  setStrokeWidth: (width: number) => void;
  setNodeSize: (size: number) => void;
  setBranchTransformation: (transformation: string) => void;
  setLayoutAngleDegrees: (degrees: number) => void;
  setLayoutRotationDegrees: (degrees: number) => void;
  setMsaRegion: (region: any) => void;
  clearMsaRegion: () => void;
  setMsaRowOrder: (order: any[]) => void;
  clearMsaRowOrder: () => void;
  openMsaViewer: () => void;
  closeMsaViewer: () => void;
  setMsaWindow: (window: any) => void;
  toggleComparisonMode: () => void;
  setViewsConnected: (connected: boolean) => void;
  setMonophyleticColoring: (enabled: boolean) => void;
  setPivotEdgesEnabled: (enabled: boolean) => void;
  setPivotEdgeColor: (color: string) => void;
  setMarkedColor: (color: string) => void;
  setMarkedSubtreesEnabled: (enabled: boolean) => void;
  setMarkedSubtreeMode: (mode: string) => void;
  setMarkedSubtreeOpacity: (opacity: number) => void;
  setHighlightColorMode: (mode: string) => void;
  setManuallyMarkedNodes: (nodes: any[]) => void;
  setTaxaColoringOpen: (open: boolean) => void;
  setTaxaColoringWindow: (window: any) => void;
  updateTaxaColors: (colors: any) => void;
  setTaxaGrouping: (grouping: any) => void;
  setDimmingEnabled: (enabled: boolean) => void;
  setDimmingOpacity: (opacity: number) => void;
  setSubtreeDimmingEnabled: (enabled: boolean) => void;
  setSubtreeDimmingOpacity: (opacity: number) => void;
  setLinkConnectionOpacity: (opacity: number) => void;
  setConnectorStrokeWidth: (width: number) => void;
  setPulseEnabled: (enabled: boolean) => void;
  setDashingEnabled: (enabled: boolean) => void;
  setUpcomingChangesEnabled: (enabled: boolean) => void;
  setLabelsVisible: (visible: boolean) => void;
  labelsVisible: boolean;
  hideNodeContextMenu: () => void;
  setHoveredSegment: (index: number | null, data: any, position: any) => void;
  setTooltipHovered: (hovered: boolean) => void;
  hoveredSegmentIndex: number | null;
  hoveredSegmentData: any;
  hoveredSegmentPosition: any;
  setCameraMode: (mode: string) => void;
  cameraMode: string;
  toggleCameraMode: () => void;
  markedColor: string;
  taxaColoringOpen: boolean;
  taxaColoringWindow: any;
  taxaGrouping: any;
  taxaColorVersion: number;
  resetMsaData: () => void;
  resetColors: () => void;
  resetPlayback: () => void;
  resetControllers: () => void;
  resetComparison: () => void;
  updateColorManagerForCurrentIndex: () => void;
}