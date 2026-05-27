export function createDeckCanvas(container) {
  if (!container) {
    throw new Error('DeckGLContext: container element is required to initialize deck.gl');
  }

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);
  return canvas;
}

export function removeChildren(element) {
  if (!element) return;
  if (typeof element.replaceChildren === 'function') {
    element.replaceChildren();
    return;
  }
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function getCanvasDimensions(canvas, container) {
  if (canvas) {
    const width = canvas.clientWidth || canvas.width || 800;
    const height = canvas.clientHeight || canvas.height || 600;
    return { width, height };
  }

  const node = container?.node?.();
  if (node) {
    const rect = node.getBoundingClientRect();
    return { width: rect.width || 800, height: rect.height || 600 };
  }

  return { width: 800, height: 600 };
}

export function getDefaultControllerConfig() {
  return {
    doubleClickZoom: false,
    touchZoom: true,
    touchRotate: true,
    scrollZoom: true,
    dragPan: true,
    dragRotate: true,
    keyboard: true,
  };
}

export function getDeckCursor(isDragging, isHovering) {
  if (isDragging) return 'grabbing';
  if (isHovering) return 'pointer';
  return 'default';
}

export function isTreeNodeLayer(layerId) {
  return layerId === 'phylo-nodes' || layerId?.startsWith('phylo-nodes-');
}
