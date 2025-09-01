import { useAppStore } from '../../../core/store.js';

export async function handleActiveChangeEdgesToggle() {
  const switchElement = document.getElementById('active-change-edges-toggle');
  if (switchElement) {
    const enabled = switchElement.selected;
    // reduced logging: avoid console noise on frequent toggles
    const { setActiveChangeEdgesEnabled, treeController } = useAppStore.getState();
    setActiveChangeEdgesEnabled(enabled);

    // Trigger re-render to apply changes
    await treeController.renderAllElements();
  }
}
