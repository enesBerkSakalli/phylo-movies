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
    syncPanelsFromStore(closed, { ...closed, isMsaViewerOpen: true }, actions);
    expect(actions.closePanel).toHaveBeenCalledWith('alignment');
  });

  it('does not open or close the inspector when a segment is selected or cleared', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    syncPanelsFromStore({ ...closed, selectedTimelineSegmentIndex: 4 }, closed, actions);
    syncPanelsFromStore(
      { ...closed, selectedTimelineSegmentIndex: 7 },
      { ...closed, selectedTimelineSegmentIndex: 4 },
      actions
    );
    syncPanelsFromStore(closed, { ...closed, selectedTimelineSegmentIndex: 7 }, actions);
    expect(actions.openPanel).not.toHaveBeenCalled();
    expect(actions.closePanel).not.toHaveBeenCalled();
  });

  it('leaves the dock alone when nothing the panel shows has changed', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    const open = { ...closed, isMsaViewerOpen: true };
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
    syncStoreFromClosedPanel('taxa-coloring', state);
    syncStoreFromClosedPanel('alignment', state);
    syncStoreFromClosedPanel('settings', state);
    expect(state.setTaxaColoringOpen).toHaveBeenCalledWith(false);
    expect(state.closeMsaViewer).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected segment when the inspector tab is closed', () => {
    const state = {
      ...closed,
      selectedTimelineSegmentIndex: 3,
      setSelectedTimelineSegment: vi.fn(),
    };
    syncStoreFromClosedPanel('inspector', state);
    expect(state.setSelectedTimelineSegment).not.toHaveBeenCalled();
  });

  it('does not write the store when the flag is already clear', () => {
    const state = { ...closed, closeMsaViewer: vi.fn() };
    syncStoreFromClosedPanel('alignment', state);
    expect(state.closeMsaViewer).not.toHaveBeenCalled();
  });
});
