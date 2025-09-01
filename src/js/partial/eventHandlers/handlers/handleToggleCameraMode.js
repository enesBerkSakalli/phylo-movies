import { useAppStore } from '../../../core/store.js';

export async function handleToggleCameraMode() {
  const { toggleCameraMode, treeController } = useAppStore.getState();
  const newMode = toggleCameraMode();

  // Update button text
  const buttonText = document.getElementById('camera-mode-text');
  if (buttonText) {
    buttonText.textContent = newMode === 'orthographic' ? '2D View' : '3D View';
  }

  // Apply camera mode to tree controller
  treeController.setCameraMode(newMode);
}

