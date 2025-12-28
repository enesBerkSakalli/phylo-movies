import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { useAppStore } from '../../../js/core/store.js';

export function DeckGLCanvas() {
  const controller = useAppStore((s) => s.treeControllers?.[0]);
  const deckRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [viewState, setViewState] = useState(null);
  const [viewConfigVersion, setViewConfigVersion] = useState(0);
  const [controllerConfig, setControllerConfig] = useState(null);

  // Attach React layer updater so controller pushes layers into DeckGL
  useEffect(() => {
    if (!controller) return;
    controller.setReactLayerUpdater(setLayers);

    const dm = controller.deckManager;
    const initial = dm?.getViewState?.();
    if (initial) {
      setViewState({ ...initial });
    }

    // Initialize controller config from DeckManager
    const initialConfig = dm?.getControllerConfig?.();
    if (initialConfig) {
      setControllerConfig(initialConfig);
    }

    // Register callback for controller config changes (for drag handling)
    dm?.onControllerConfigChange?.(setControllerConfig);

    const listener = (vs) => {
      setViewState({ ...vs });
      setViewConfigVersion((v) => v + 1);
    };
    dm?.addViewStateListener?.(listener);

    return () => {
      dm?.removeViewStateListener?.(listener);
      dm?.onControllerConfigChange?.(null);
    };
  }, [controller]);

  // Attach the Deck instance created by <DeckGL> back to the controller
  useEffect(() => {
    if (!controller) return;
    const deckInstance = deckRef.current?.deck || deckRef.current;
    if (deckInstance) {
      controller.attachReactDeck(deckInstance);
    }
  }, [controller]);

  const views = useMemo(() => {
    if (!controller?.deckManager) return [];
    return [controller.deckManager.getActiveView()];
  }, [controller, viewConfigVersion]);

  if (!controller) {
    return <div id="webgl-container" style={{ width: '100%', height: '100%' }} />;
  }

  const dm = controller.deckManager;

  const handleViewStateChange = ({ viewState: nextViewState, viewId }) => {
    dm?._handleViewStateChange?.(nextViewState, viewId);
    const updated = dm?.getViewState?.();
    if (updated) {
      setViewState({ ...updated });
    } else if (nextViewState) {
      setViewState({ ...nextViewState });
    }
  };

  const getCursor = ({ isDragging, isHovering }) => dm?.getCursor?.(isDragging, isHovering) || 'default';

  return (
    <div id="webgl-container" style={{ width: '100%', height: '100%' }}>
      <DeckGL
        ref={deckRef}
        layers={layers}
        views={views}
        viewState={viewState || undefined}
        controller={controllerConfig || dm?.getControllerConfig?.()}
        getCursor={getCursor}
        onViewStateChange={handleViewStateChange}
        onClick={(info, event) => dm?._handleClick?.(info, event)}
        onHover={(info, event) => dm?._handleHover?.(info, event)}
        onDragStart={(info, event) => dm?._handleDragStart?.(info, event)}
        onDrag={(info, event) => dm?._handleDrag?.(info, event)}
        onDragEnd={(info, event) => dm?._handleDragEnd?.(info, event)}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default DeckGLCanvas;
