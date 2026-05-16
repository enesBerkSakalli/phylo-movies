import React from 'react';
import {
  selectCameraMode,
  selectToggleCameraMode,
  selectTreeControllers,
  useAppStore
} from '../../state/phyloStore/store.js';
import { PerspectiveSection } from './Appearance.jsx';

export function ViewModeSection() {
  const treeControllers = useAppStore(selectTreeControllers);
  const cameraMode = useAppStore(selectCameraMode);
  const toggleCameraMode = useAppStore(selectToggleCameraMode);

  return (
    <PerspectiveSection
      cameraMode={cameraMode}
      toggleCameraMode={toggleCameraMode}
      treeControllers={treeControllers}
    />
  );
}

export default ViewModeSection;
