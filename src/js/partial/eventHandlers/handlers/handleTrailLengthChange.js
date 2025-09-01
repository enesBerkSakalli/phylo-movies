import { useAppStore } from '../../../core/store.js';

export async function handleTrailLengthChange(event) {
  const value = parseInt(event?.target?.value, 10) || 12;
  const label = document.getElementById('trail-length-value');
  if (label) label.textContent = String(value);

  const { setTrailLength, treeController } = useAppStore.getState();
  setTrailLength(value);
  await treeController.renderAllElements();
}

