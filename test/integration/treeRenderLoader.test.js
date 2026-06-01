// @vitest-environment jsdom

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('VisualizationTreeRenderOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows an accessible loader while the tree is being prepared for display', async () => {
    const { VisualizationTreeRenderOverlay } = await import('../../src/App.jsx');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(VisualizationTreeRenderOverlay, { visible: true }));
    });

    const status = document.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(status?.textContent).toContain('Loading tree view');

    await act(async () => {
      root.unmount();
    });
  }, 30000);
});
