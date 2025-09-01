import { useAppStore } from '../../../core/store.js';

export async function handleMonophyleticColoring() {
  const { setMonophyleticColoring, treeController } = useAppStore.getState();
  const switchElement = document.getElementById('monophyletic-coloring');
  const enabled = switchElement ? switchElement.selected : false;
  setMonophyleticColoring(enabled);
  await treeController.renderAllElements();
}
