// @vitest-environment jsdom

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../src/components/ui/collapsible.tsx';
import { simulateClick } from '../../../helpers/domEvents.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function SidebarDisclosure({ label }) {
  return React.createElement(
    Collapsible,
    null,
    React.createElement(CollapsibleTrigger, null, label),
    React.createElement(CollapsibleContent, null, `${label} settings`)
  );
}

describe('sidebar disclosure behavior', () => {
  let root;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    root = null;
    document.body.innerHTML = '';
  });

  it('opens and closes each section without changing neighboring sections', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(SidebarDisclosure, { label: 'Branch Lengths' }),
          React.createElement(SidebarDisclosure, { label: 'Tree Layout' })
        )
      );
    });

    const [branchLengths, treeLayout] = container.querySelectorAll('button');

    expect(branchLengths.getAttribute('aria-expanded')).toBe('false');
    expect(treeLayout.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      simulateClick(branchLengths);
      simulateClick(treeLayout);
    });

    expect(branchLengths.getAttribute('aria-expanded')).toBe('true');
    expect(treeLayout.getAttribute('aria-expanded')).toBe('true');

    await act(async () => {
      simulateClick(branchLengths);
    });

    expect(branchLengths.getAttribute('aria-expanded')).toBe('false');
    expect(treeLayout.getAttribute('aria-expanded')).toBe('true');
  });
});
