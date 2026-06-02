import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { TOUR_TARGETS, tourSelector } from './tourTargets.js';

const WORKSPACE_TOUR_STEPS = [
  {
    id: 'sidebar',
    target: TOUR_TARGETS.sidebar,
    attachOn: 'right',
    title: 'Workspace tools',
    text: 'Use the sidebar to change datasets, adjust tree layout and style, open analysis panels, and control focus effects.',
  },
  {
    id: 'canvas',
    target: TOUR_TARGETS.canvas,
    attachOn: 'bottom',
    title: 'Tree canvas',
    text: 'The main canvas renders the active tree movie. Drag to pan, zoom with the mouse wheel or trackpad, and use comparison mode when you need two trees side by side.',
  },
  {
    id: 'canvas-controls',
    target: TOUR_TARGETS.canvasControls,
    attachOn: 'left',
    title: 'Viewport controls',
    text: 'These buttons fit, zoom, and reset the tree view without changing the underlying dataset.',
  },
  {
    id: 'transport-controls',
    target: TOUR_TARGETS.transportControls,
    attachOn: 'top',
    title: 'Transport controls',
    text: 'Step between input trees and generated frames, play or pause the movie, and enable comparison view from this control group.',
  },
  {
    id: 'timeline',
    target: TOUR_TARGETS.timeline,
    attachOn: 'top',
    title: 'Movie timeline',
    text: 'Input tree markers and generated transition frames appear here. Hover or select segments to inspect topology changes.',
  },
  {
    id: 'export-controls',
    target: TOUR_TARGETS.exportControls,
    attachOn: 'left',
    title: 'Export controls',
    text: 'Save the current tree view as a PNG or record playback as a WebM once the tree canvas is ready.',
  },
];

export function startWorkspaceTour() {
  if (typeof document === 'undefined') return;

  const availableSteps = WORKSPACE_TOUR_STEPS.filter((step) =>
    document.querySelector(tourSelector(step.target))
  );

  if (availableSteps.length === 0) return;

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    keyboardNavigation: true,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true,
      },
      classes: 'phylo-workspace-tour',
      scrollTo: {
        behavior: 'smooth',
        block: 'center',
      },
    },
  });

  availableSteps.forEach((step, index) => {
    const isLastStep = index === availableSteps.length - 1;
    tour.addStep({
      id: step.id,
      title: step.title,
      text: step.text,
      attachTo: {
        element: () => document.querySelector(tourSelector(step.target)),
        on: step.attachOn,
      },
      buttons: [
        {
          text: 'Close',
          action: () => tour.cancel(),
          secondary: true,
        },
        {
          text: isLastStep ? 'Done' : 'Next',
          action: () => (isLastStep ? tour.complete() : tour.next()),
        },
      ],
    });
  });

  tour.start();
}
