import { useAppStore } from '../../../core/store.js';

export async function handleStrokeWidthChange(event) {
  const { setStrokeWidth, treeController } = useAppStore.getState();
  setStrokeWidth(event.target.value);
  document.getElementById('stroke-width-value').textContent = event.target.value;
  await treeController.renderAllElements();
}
