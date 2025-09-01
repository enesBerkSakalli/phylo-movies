import { useAppStore } from '../../../core/store.js';

export async function handleDimmingToggle() {
  const { setDimmingEnabled, treeController } = useAppStore.getState();
  const switchElement = document.getElementById('dim-non-descendants-toggle');

  if (switchElement) {
    // The .selected property is an alias for .checked. Let's try it.
    const value = switchElement.selected;
    // reduced logging: avoid console noise on frequent toggles
    setDimmingEnabled(value);
  } else {
    console.error("[EventHandler] Could not find #dim-non-descendants-toggle");
  }

  // Trigger re-render to apply dimming changes
  await treeController.renderAllElements();
}
