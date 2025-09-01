import { useAppStore } from '../../../core/store.js';

export async function handleBranchLengthOptions(event) {
  const { setBranchTransformation, treeController, treeList, currentTreeIndex } = useAppStore.getState();
  const newTransform = event.target.value;
  setBranchTransformation(newTransform);
  treeController.updateLayout(treeList[currentTreeIndex]);
  await treeController.renderAllElements();
}
