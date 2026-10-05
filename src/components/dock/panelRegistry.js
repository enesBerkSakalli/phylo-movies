import { ArrowRightLeft, Dna, GitBranch, Network, Palette, SlidersHorizontal } from 'lucide-react';

export const TREE_PANEL_ID = 'tree';
export const SETTINGS_PANEL_ID = 'settings';

/**
 * Every panel the dock can show, keyed by the id dockview writes into saved layouts.
 *
 * - `permanent`: the app rather than a view of it; never closeable, re-added if missing.
 * - `alwaysRender`: kept mounted while another tab of its group is in front (the deck.gl canvas
 *   must not lose its WebGL context; the settings form must not lose its state).
 * - `defaultOpen`: added on a first visit, when there is no saved layout.
 * - `place`: where the panel docks when opened, relative to the tree.
 * - `floating`: opens as a window over the dock at this maximum size.
 */
export const PANEL_REGISTRY = Object.freeze({
  tree: { title: 'Tree', icon: Network, permanent: true, alwaysRender: true },
  settings: {
    title: 'Settings',
    icon: SlidersHorizontal,
    alwaysRender: true,
    defaultOpen: true,
    place: { direction: 'left', width: 280 },
  },
  inspector: {
    title: 'Transition Inspector',
    icon: ArrowRightLeft,
    place: { direction: 'right', width: 340 },
  },
  'moved-subtrees': {
    title: 'Moved Subtrees',
    icon: GitBranch,
    place: { direction: 'right', width: 420 },
  },
  alignment: {
    title: 'Alignment',
    icon: Dna,
    place: { direction: 'below', heightShare: 0.4 },
  },
  'taxa-coloring': {
    title: 'Taxa colouring',
    icon: Palette,
    floating: { width: 720, height: 560 },
  },
});

export function getPanelEntry(id) {
  return Object.hasOwn(PANEL_REGISTRY, id) ? PANEL_REGISTRY[id] : undefined;
}
