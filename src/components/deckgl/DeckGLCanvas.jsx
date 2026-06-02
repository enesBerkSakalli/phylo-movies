import React, { useEffect, useRef } from 'react';
import { selectPrimaryTreeController, useAppStore } from '../../state/phyloStore/store.js';

const DeckGLCanvas = React.memo(function DeckGLCanvas() {
  const animationController = useAppStore(selectPrimaryTreeController);
  const containerRef = useRef(null);

  useEffect(() => {
    if (animationController && containerRef.current) {
      animationController.mount(containerRef.current);
    }

    // Cleanup function to detach controller when component unmounts
    return () => {
      if (animationController) {
        animationController.unmount();
      }
    };
  }, [animationController]);

  // Return placeholder when controller is not ready - AFTER all hooks
  if (!animationController) {
    return (
      <div
        id="webgl-container"
        data-tour-id="workspace-canvas"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <div
      id="webgl-container"
      ref={containerRef}
      data-tour-id="workspace-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
});

export { DeckGLCanvas };
export default DeckGLCanvas;
