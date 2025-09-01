import { useAppStore } from '../../../core/store.js';
import { notifications } from '../notificationSystem.js';
import { calculateWindow } from '../../../utils/windowUtils.js';
import { getMSAFrameIndex } from '../../../core/IndexMapping.js';

export async function handleMSASyncToggle(event, gui) {
  const enabled = event?.target?.selected ?? true;
  const { setSyncMSAEnabled } = useAppStore.getState();
  setSyncMSAEnabled(enabled);

  if (enabled) {
    try {
      // Trigger an immediate sync now that it's enabled
      gui.syncMSAIfOpen();
      // Update timeline metrics immediately if available
      gui.movieTimelineManager?.updateCurrentPosition();

      // Also set the MSA viewer region directly based on current window
      const { transitionResolver, msaWindowSize, msaStepSize, msaColumnCount } = useAppStore.getState();
      if (transitionResolver && msaColumnCount > 0) {
        const frameIndex = getMSAFrameIndex();
        if (frameIndex >= 0) {
          const { startPosition, endPosition } = calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);
          import('../../../msaViewer/index.js').then(({ setMSARegion }) => {
            setMSARegion(startPosition, endPosition);
          }).catch(() => {});
        }
      }
      notifications.show('MSA sync enabled and updated', 'success');
    } catch (_) {
      notifications.show('MSA sync enabled', 'info');
    }
  } else {
    notifications.show('MSA sync disabled', 'info');
  }
}
