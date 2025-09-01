import { useAppStore } from '../../../core/store.js';

export async function handleTrailOpacityChange(event) {
  const value = parseFloat(event?.target?.value);
  const label = document.getElementById('trail-opacity-value');
  if (label) label.textContent = String(value);

  const { setTrailOpacity, treeController } = useAppStore.getState();
  setTrailOpacity(value);
  await treeController.renderAllElements();
}

