// @vitest-environment jsdom

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const navigateMock = vi.fn();
const processMovieDataMock = vi.fn();
const finalizeMovieDataMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../src/pages/WorkspaceInitialization/services/movieProcessing.js', () => ({
  processMovieData: (...args) => processMovieDataMock(...args),
  finalizeMovieData: (...args) => finalizeMovieDataMock(...args),
  showElectronLoading: vi.fn(),
  hideElectronLoading: vi.fn(),
  updateElectronProgress: vi.fn(),
}));

vi.mock('../../src/pages/WorkspaceInitialization/exampleDatasets.js', () => ({
  getExampleById: vi.fn(),
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function renderHookHarness() {
  const { useWorkspaceInitializationForm } =
    await import('../../src/pages/WorkspaceInitialization/useWorkspaceInitializationForm.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let hookValue;

  function Harness() {
    hookValue = useWorkspaceInitializationForm();
    return null;
  }

  await act(async () => {
    root.render(React.createElement(Harness));
  });

  await vi.waitFor(() => {
    expect(hookValue?.backendStatus.state).toBe('ready');
  });

  return { root, hookValue };
}

describe('workspace initialization cancellation ownership', () => {
  beforeEach(() => {
    processMovieDataMock.mockReset();
    finalizeMovieDataMock.mockReset();
    navigateMock.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ready: true, status: 'ready', capabilities: [] }),
      }))
    );
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('aborts an in-flight submission and ignores its stale completion after unmount', async () => {
    const pendingProcessing = deferred();
    processMovieDataMock.mockReturnValue(pendingProcessing.promise);
    finalizeMovieDataMock.mockResolvedValue(undefined);

    const { root, hookValue } = await renderHookHarness();
    let submitPromise;

    await act(async () => {
      submitPromise = hookValue.handleSubmit({
        treesFile: new File(['(a);'], 'tree.nwk'),
        msaFile: null,
        windowSize: 10,
        stepSize: 1,
      });
      await Promise.resolve();
    });

    const options = processMovieDataMock.mock.calls[0]?.[2];
    expect(options?.signal).toBeInstanceOf(AbortSignal);

    await act(async () => {
      root.unmount();
    });

    expect(options.signal.aborted).toBe(true);

    pendingProcessing.resolve({ interpolated_trees: [] });
    await submitPromise;

    expect(finalizeMovieDataMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
