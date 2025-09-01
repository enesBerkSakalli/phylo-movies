import { useAppStore } from '../../../core/store.js';

export async function handleTrailThicknessChange(event) {
  const value = parseFloat(event?.target?.value);
  const label = document.getElementById('trail-thickness-value');
  if (label) label.textContent = String(value);

  const { setTrailThickness, treeController } = useAppStore.getState();
  setTrailThickness(value);
  await treeController.renderAllElements();
}

