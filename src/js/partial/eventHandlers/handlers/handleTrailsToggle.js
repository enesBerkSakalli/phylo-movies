import { useAppStore } from '../../../core/store.js';

export async function handleTrailsToggle() {
  const toggle = document.getElementById('trails-toggle');
  const enabled = !!toggle?.selected;

  const lenSlider = document.getElementById('trail-length');
  const opSlider = document.getElementById('trail-opacity');
  const thickSlider = document.getElementById('trail-thickness');
  if (lenSlider) lenSlider.disabled = !enabled;
  if (opSlider) opSlider.disabled = !enabled;
  if (thickSlider) thickSlider.disabled = !enabled;

  const { setTrailsEnabled, treeController } = useAppStore.getState();
  setTrailsEnabled(enabled);
  await treeController.renderAllElements();
}

