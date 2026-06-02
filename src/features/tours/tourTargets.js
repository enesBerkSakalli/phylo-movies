export const TOUR_TARGETS = {
  sidebar: 'workspace-sidebar',
  canvas: 'workspace-canvas',
  canvasControls: 'workspace-canvas-controls',
  exportControls: 'workspace-export-controls',
  transportControls: 'workspace-transport-controls',
  timeline: 'workspace-timeline',
};

export function tourSelector(targetId) {
  return `[data-tour-id="${targetId}"]`;
}
