import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { useAppStore } from '../../../js/core/store.js';
import { getThemeBackgroundColor } from '../../../js/services/ui/colorUtils.js';

export function DeckGLCanvas() {
  const animationController = useAppStore((state) => state.treeControllers?.[0]);
  const deckRef = useRef(null);
  const layersRef = useRef([]); // Use Ref for layers to avoid high-frequency React re-renders
  const [viewState, setViewState] = useState(null);
  const [viewConfigVersion, setViewConfigVersion] = useState(0);
  const [controllerConfig, setControllerConfig] = useState(null);
  const [clearColor, setClearColor] = useState([1, 1, 1, 1]); // Default white, normalized 0-1

  // Synchronize background color with theme
  useEffect(() => {
    const updateColor = () => setClearColor(getThemeBackgroundColor());

    updateColor();

    // Observe class changes on html element (shadcn/next-themes strategy)
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => observer.disconnect();
  }, []);

  // Synchronize layers from controller to DeckGL via Ref
  useEffect(() => {
    if (!animationController) return;

    const deckManager = animationController.deckManager;
    if (!deckManager) return;

    // Synchronize initial view state
    const initialViewState = deckManager.getViewState?.();
    if (initialViewState) {
      setViewState({ ...initialViewState });
    }

    // Synchronize initial controller config
    const initialControllerConfig = deckManager.getControllerConfig?.();
    if (initialControllerConfig) {
      setControllerConfig(initialControllerConfig);
    }
    deckManager.onControllerConfigChange?.(setControllerConfig);

    // View state listener for camera updates
    const viewStateListener = (newViewState) => {
      setViewState({ ...newViewState });
      setViewConfigVersion((version) => version + 1);
    };
    deckManager.addViewStateListener?.(viewStateListener);

    // Animation Layer listener (updates Ref, doesn't trigger re-render)
    const animationLayerListener = (updatedLayers) => {
      layersRef.current = updatedLayers;
    };
    deckManager.addLayerListener?.(animationLayerListener);

    return () => {
      deckManager.removeViewStateListener?.(viewStateListener);
      deckManager.removeLayerListener?.(animationLayerListener);
      deckManager.onControllerConfigChange?.(null);
    };
  }, [animationController]);

  // Attach the Deck instance created by <DeckGL> back to the controller
  useEffect(() => {
    if (!animationController) return;
    const deckInstance = deckRef.current?.deck || deckRef.current;
    if (deckInstance) {
      animationController.attachReactDeck(deckInstance);
    }
  }, [animationController]);

  const views = useMemo(() => {
    if (!animationController?.deckManager) return [];
    return [animationController.deckManager.getActiveView()];
  }, [animationController, viewConfigVersion]);

  if (!animationController) {
    return <div id="webgl-container" style={{ width: '100%', height: '100%' }} />;
  }

  const deckManager = animationController.deckManager;

  const handleViewStateChange = ({ viewState: nextViewState, viewId }) => {
    deckManager?._handleViewStateChange?.(nextViewState, viewId);
    const updatedViewState = deckManager?.getViewState?.();
    if (updatedViewState) {
      setViewState({ ...updatedViewState });
    } else if (nextViewState) {
      setViewState({ ...nextViewState });
    }
  };

  const getCursor = ({ isDragging, isHovering }) =>
    deckManager?.getCursor?.(isDragging, isHovering) || 'default';

  return (
    <div id="webgl-container" style={{ width: '100%', height: '100%' }}>
      <DeckGL
        ref={deckRef}
        layers={layersRef.current}
        views={views}
        parameters={{
          clearColor,
          depthTest: true,
          depthFunc: 515 // LEQUAL
        }}
        glOptions={{
          preserveDrawingBuffer: true,
          alpha: false
        }}
        viewState={viewState || undefined}
        controller={controllerConfig || deckManager?.getControllerConfig?.()}
        getCursor={getCursor}
        onViewStateChange={handleViewStateChange}
        onBeforeRender={({ gl }) => {
          gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }}
        onClick={(info, event) => deckManager?._handleClick?.(info, event)}
        onHover={(info, event) => deckManager?._handleHover?.(info, event)}
        onDragStart={(info, event) => deckManager?._handleDragStart?.(info, event)}
        onDrag={(info, event) => deckManager?._handleDrag?.(info, event)}
        onDragEnd={(info, event) => deckManager?._handleDragEnd?.(info, event)}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default DeckGLCanvas;
