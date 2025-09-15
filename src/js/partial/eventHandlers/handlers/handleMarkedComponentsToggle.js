import { useAppStore } from '../../../core/store.js';

export async function handleMarkedComponentsToggle() {
  const switchElement = document.getElementById('marked-components-toggle');
  if (switchElement) {
    const enabled = switchElement.selected;
    // reduced logging: avoid console noise on frequent toggles (naming only)
    const { setMarkedComponentsEnabled, treeController } = useAppStore.getState();
    setMarkedComponentsEnabled(enabled);

    // Trigger re-render to apply changes
    await treeController.renderAllElements();
  }
}
