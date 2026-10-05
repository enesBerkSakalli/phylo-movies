// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openPanel = vi.hoisted(() => vi.fn());
vi.mock('shepherd.js', () => ({ default: { Tour: class {} } }));
vi.mock('shepherd.js/dist/css/shepherd.css', () => ({}));
vi.mock('../../../../src/components/dock/dockRuntime.js', () => ({ openPanel }));

import {
  WORKSPACE_TOUR_STEPS,
  availableWorkspaceTourSteps,
} from '../../../../src/features/tours/workspaceTour.js';

const mount = (id) => {
  const el = document.createElement('div');
  el.dataset.tourId = id;
  document.body.append(el);
};

describe('workspace tour steps', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    openPanel.mockReset();
  });

  it('keeps the settings step when the settings panel mounts after it is reopened', async () => {
    ['workspace-canvas', 'workspace-timeline'].forEach(mount);
    // dockview renders panel content on a later commit, not synchronously with addPanel.
    openPanel.mockImplementation((id) => {
      if (id === 'settings') {
        requestAnimationFrame(() => requestAnimationFrame(() => mount('workspace-sidebar')));
      }
    });
    const steps = await availableWorkspaceTourSteps();
    expect(openPanel).toHaveBeenCalledWith('settings');
    expect(steps.map((step) => step.id)).toContain('sidebar');
  });

  it('activates the panel that hosts each step before showing it', () => {
    const panelOf = Object.fromEntries(WORKSPACE_TOUR_STEPS.map((s) => [s.id, s.panel]));
    expect(panelOf).toMatchObject({
      sidebar: 'settings',
      canvas: 'tree',
      'canvas-controls': 'tree',
      'export-controls': 'tree',
    });
  });
});
