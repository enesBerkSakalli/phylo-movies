import { useAppStore } from '../../../core/store.js';

export async function handleFontSizeChange(event) {
  const { setFontSize, treeController } = useAppStore.getState();
  setFontSize(event.target.value);
  document.getElementById('font-size-value').textContent = event.target.value + 'em';
  // No explicit label style update needed; LayerStyles subscribes to fontSize
  // changes and triggers a re-render via its onStyleChange callback.
}
