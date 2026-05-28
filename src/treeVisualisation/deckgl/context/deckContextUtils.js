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
  const containerElement = resolveContainerElement(container);
  const containerDimensions = getCssPixelDimensions(containerElement);
  if (containerDimensions) return containerDimensions;

  if (canvas) {
    const canvasDimensions = getCssPixelDimensions(canvas);
    if (canvasDimensions) return canvasDimensions;

    const dpr = getDevicePixelRatio();
    const width = canvas.width ? Math.max(1, Math.round(canvas.width / dpr)) : 800;
    const height = canvas.height ? Math.max(1, Math.round(canvas.height / dpr)) : 600;
    return { width, height };
  }

  return { width: 800, height: 600 };
}

function resolveContainerElement(container) {
  if (container?.getBoundingClientRect) return container;
  return container?.node?.() || null;
}

function getCssPixelDimensions(element) {
  if (!element) return null;

  if (typeof element.getBoundingClientRect === 'function') {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      };
    }
  }

  if (element.clientWidth > 0 && element.clientHeight > 0) {
    return {
      width: Math.max(1, Math.round(element.clientWidth)),
      height: Math.max(1, Math.round(element.clientHeight)),
    };
  }

  return null;
}

function getDevicePixelRatio() {
  const value = typeof window !== 'undefined' ? Number(window.devicePixelRatio) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
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
