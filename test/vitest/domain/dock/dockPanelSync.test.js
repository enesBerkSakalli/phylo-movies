import { describe, expect, it, vi } from 'vitest';
import {
  syncPanelsFromStore,
  syncStoreFromClosedPanel,
} from '../../../../src/components/dock/dockPanelSync.js';

const closed = {
  isMsaViewerOpen: false,
  taxaColoringOpen: false,
  selectedTimelineSegmentIndex: null,
};

describe('dock and store stay in step', () => {
  it('opens and closes panels when the store flags change', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    syncPanelsFromStore({ ...closed, isMsaViewerOpen: true }, closed, actions);
    expect(actions.openPanel).toHaveBeenCalledWith('alignment');
    syncPanelsFromStore(closed, { ...closed, selectedTimelineSegmentIndex: 4 }, actions);
    expect(actions.closePanel).toHaveBeenCalledWith('inspector');
  });

  it('brings a hidden inspector forward when a different segment is selected', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    syncPanelsFromStore({ ...closed, selectedTimelineSegmentIndex: 0 }, closed, actions);
    syncPanelsFromStore(
      { ...closed, selectedTimelineSegmentIndex: 7 },
      { ...closed, selectedTimelineSegmentIndex: 0 },
      actions
    );
    expect(actions.openPanel).toHaveBeenCalledTimes(2);
    expect(actions.openPanel).toHaveBeenLastCalledWith('inspector');
  });

  it('leaves the dock alone when nothing the panel shows has changed', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    const open = { ...closed, selectedTimelineSegmentIndex: 7, isMsaViewerOpen: true };
    syncPanelsFromStore({ ...open }, { ...open }, actions);
    expect(actions.openPanel).not.toHaveBeenCalled();
    expect(actions.closePanel).not.toHaveBeenCalled();
  });

  it('clears the matching store flag when the user closes a panel tab', () => {
    const state = {
      ...closed,
      selectedTimelineSegmentIndex: 3,
      taxaColoringOpen: true,
      isMsaViewerOpen: true,
      setSelectedTimelineSegment: vi.fn(),
      setTaxaColoringOpen: vi.fn(),
      closeMsaViewer: vi.fn(),
    };
    syncStoreFromClosedPanel('inspector', state);
    syncStoreFromClosedPanel('taxa-coloring', state);
    syncStoreFromClosedPanel('alignment', state);
    syncStoreFromClosedPanel('settings', state);
    expect(state.setSelectedTimelineSegment).toHaveBeenCalledWith(null);
    expect(state.setTaxaColoringOpen).toHaveBeenCalledWith(false);
    expect(state.closeMsaViewer).toHaveBeenCalledTimes(1);
  });

  it('does not write the store when the flag is already clear', () => {
    const state = { ...closed, closeMsaViewer: vi.fn() };
    syncStoreFromClosedPanel('alignment', state);
    expect(state.closeMsaViewer).not.toHaveBeenCalled();
  });
});
