// @vitest-environment jsdom
// A dataset opens with its original branch lengths, and the note under the select describes the
// scale that is selected rather than always the animation one.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Branch Lengths', () => {
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    document.body.innerHTML = '';
  });

  async function render() {
    const [{ TreeStructure }, { useAppStore }] = await Promise.all([
      import('../../../../src/components/appearance/layout/TreeStructure.jsx'),
      import('../../../../src/state/phyloStore/store.js'),
    ]);
    useAppStore.getState().reset();
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => root.render(React.createElement(TreeStructure)));
    return { host, store: useAppStore };
  }

  it('opens on Original, and says nothing about animation scale', async () => {
    const { host, store } = await render();

    expect(store.getState().branchTransformation).toBe('none');
    expect(host.querySelector('#branch-lengths').textContent).toBe(
      'Original: input branch lengths'
    );
    expect(host.textContent).not.toMatch(/Animation scale normalizes/);
  });

  it('describes the scale that is selected', async () => {
    const { host, store } = await render();
    const note = () => host.querySelector('p')?.textContent;

    await act(async () => store.getState().setBranchTransformation('normalized-sqrt'));
    expect(note()).toMatch(/^Animation scale normalizes each tree/);

    await act(async () => store.getState().setBranchTransformation('log'));
    expect(note()).toMatch(/^Readable scale applies one transform to every tree/);
    expect(note()).toMatch(/not an absolute evolutionary scale/);

    await act(async () => store.getState().setBranchTransformation('ignore'));
    expect(note()).toBeUndefined();
  });
});
