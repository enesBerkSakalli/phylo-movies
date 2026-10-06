// @vitest-environment jsdom
// Every control in Settings has a name of its own, sliders say their value, the five groups are
// named groups, and the disabled alignment actions say why.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TOOLS_SIDEBAR_GROUP_LABELS } from '../../../../src/components/sidebar/ToolsSidebar.contract.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../../src/components/dock/dockRuntime.js', () => ({
  openPanel: vi.fn(),
  useIsPanelOpen: () => false,
}));
vi.mock('../../../../src/components/dock/panelRegistry.js', () => ({
  SETTINGS_PANEL_ID: 'settings',
}));

// jsdom has no layout; the sidebar only needs these to exist.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});

const byId = (ids) =>
  ids
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent.trim())
    .join(' ');
// What a screen reader announces for a form control: not its value, not its content.
const nameOf = (el) =>
  el.getAttribute('aria-labelledby')
    ? byId(el.getAttribute('aria-labelledby'))
    : (el.getAttribute('aria-label') ??
      [...(el.labels ?? [])].map((label) => label.textContent.trim()).join(' '));

describe('Settings controls', () => {
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    document.body.innerHTML = '';
  });

  async function renderSettings() {
    const [{ ToolsSidebar }, { SidebarProvider }, { TooltipProvider }, { useAppStore }] =
      await Promise.all([
        import('../../../../src/components/sidebar/ToolsSidebar.jsx'),
        import('../../../../src/components/ui/sidebar'),
        import('../../../../src/components/ui/tooltip'),
        import('../../../../src/state/phyloStore/store.js'),
      ]);
    // The conditional controls: highlight options, dim strength, hyperbolic focus strength.
    act(() => {
      const state = useAppStore.getState();
      state.setSubtreeHighlightsEnabled(true);
      state.setDimmingEnabled(true);
      state.setLayoutProjectionMode('hyperbolic');
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () =>
      root.render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            TooltipProvider,
            null,
            React.createElement(
              SidebarProvider,
              null,
              React.createElement(ToolsSidebar, { fileName: 'demo.nwk', datasetProvenance: {} })
            )
          )
        )
      )
    );
    // Open every disclosure, including the ones that appear inside another.
    for (let pass = 0; pass < 3; pass += 1) {
      for (const trigger of host.querySelectorAll(
        'button[aria-expanded="false"]:not([role="combobox"])'
      )) {
        await act(async () => trigger.click());
      }
    }
    return host;
  }

  it('names every switch, slider, select and colour input, each once', async () => {
    const host = await renderSettings();
    const controls = [
      ...host.querySelectorAll('[role="switch"], [role="slider"], [role="combobox"]'),
      ...host.querySelectorAll('input[type="color"]'),
    ];

    expect(controls.length).toBeGreaterThan(20);
    const unnamed = controls.filter((el) => !nameOf(el)).map((el) => el.id || el.outerHTML);
    expect(unnamed).toEqual([]);

    const names = controls.map(nameOf);
    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
  });

  it('gives every slider the value text it shows', async () => {
    const host = await renderSettings();
    const sliders = [...host.querySelectorAll('[role="slider"]')];

    expect(sliders.length).toBe(10);
    expect(sliders.filter((el) => !el.getAttribute('aria-valuetext'))).toEqual([]);
    const text = (name) =>
      sliders.find((el) => nameOf(el).startsWith(name)).getAttribute('aria-valuetext');
    expect(text('Connector Opacity')).toBe('60%');
    expect(text('Connector Width')).toBe('1px');
    expect(text('Label Size')).toBe('1.8×');
    expect(text('Tree Spread')).toBe('360°');
  });

  it('names each of the five groups after its label', async () => {
    const host = await renderSettings();
    const groups = [...host.querySelectorAll('[role="group"][aria-labelledby]')].map((el) =>
      nameOf(el)
    );

    expect(groups).toEqual(TOOLS_SIDEBAR_GROUP_LABELS);
  });

  it('keeps the alignment actions focusable and tied to the reason they do nothing', async () => {
    const host = await renderSettings();
    const open = [...host.querySelectorAll('button')].find((el) =>
      el.textContent.includes('Open Alignment')
    );
    const follow = host.querySelector('#enable-msa-sync-btn');
    const reason = document.getElementById(open.getAttribute('aria-describedby'));

    expect(open.disabled).toBe(false);
    expect(open.getAttribute('aria-disabled')).toBe('true');
    expect(reason.textContent).toMatch(/^This dataset does not include an alignment/);
    expect(follow.getAttribute('aria-describedby')).toBe(reason.id);
  });
});
