import { useAppStore } from '../../../core/store.js';

/**
 * Handle play/pause button click.
 * - Reads `playing` from store
 * - Calls GUI play/stop accordingly
 * - Updates the play button UI via provided callback
 *
 * @param {object} gui - GUI controller with play/stop methods
 * @param {function} updatePlayButton - Callback to update play button UI
 */
export async function handlePlayButtonClick(gui, updatePlayButton) {
  console.log('[EventHandler] Start button clicked');
  const { playing } = useAppStore.getState();

  if (playing) {
    gui.stop();
  } else {
    await gui.play();
  }

  if (typeof updatePlayButton === 'function') {
    updatePlayButton(playing);
  }
}

