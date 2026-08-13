// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The component body reads backendStatus before it is destructured from the
// form hook if the derived-alert block is ordered wrong, which is a temporal
// dead zone throw at render time. Mock the hook and the feature children so the
// test exercises the component body itself, not the whole workspace tree.
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock('../../../../src/pages/WorkspaceInitialization/useWorkspaceInitializationForm.js', () => ({
  useWorkspaceInitializationForm: () => ({
    form: { handleSubmit: vi.fn(), watch: vi.fn(), formState: {}, control: {}, register: vi.fn() },
    submitting: false,
    loadingExample: false,
    loadingExampleId: null,
    operationState: { active: false },
    backendStatus: { state: 'checking', capabilities: [], version: null },
    alert: null,
    handleSubmit: vi.fn(),
    handleLoadExample: vi.fn(),
    handleOpenPrecomputedExample: vi.fn(),
    cancelOperation: vi.fn(),
    reset: vi.fn(),
  }),
}));
vi.mock('../../../../src/pages/WorkspaceInitialization/components/NewProjectTab.jsx', () => ({
  NewProjectTab: () => null,
}));
vi.mock('../../../../src/pages/WorkspaceInitialization/components/ExampleTab.jsx', () => ({
  ExampleTab: () => null,
}));
vi.mock('../../../../src/pages/WorkspaceInitialization/components/ProcessingOverlay.jsx', () => ({
  ProcessingOverlay: () => null,
}));
vi.mock('../../../../src/pages/WorkspaceInitialization/components/RecentRunsPanel.jsx', () => ({
  RecentRunsPanel: () => null,
}));

describe('WorkspaceInitializationPage render', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders without a temporal dead zone throw on backendStatus', async () => {
    const { WorkspaceInitializationPage } =
      await import('../../../../src/pages/WorkspaceInitialization/WorkspaceInitializationPage.jsx');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let caught = null;
    await act(async () => {
      try {
        root.render(React.createElement(WorkspaceInitializationPage, {}));
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeNull();
    await act(async () => root.unmount());
  });
});
