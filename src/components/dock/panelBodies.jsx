import React from 'react';

// Views that load on first open (the tree and settings are eager).
export const InspectorBody = React.lazy(() =>
  import('../TransitionInspectorPanel.jsx').then((module) => ({
    default: module.TransitionInspectorPanel,
  }))
);
export const MovedSubtreesBody = React.lazy(
  () => import('../TreeStatsPanel/AnalyticsDashboard.tsx')
);
export const AlignmentBody = React.lazy(() => import('../msa/MsaPanel.jsx'));
export const TaxaColoringBody = React.lazy(() => import('../taxa-coloring/TaxaColoringPanel.jsx'));
