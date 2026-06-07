export function getActiveTreeCanvas(treeControllers = []) {
  const controllers = Array.isArray(treeControllers) ? treeControllers : [];
  if (!controllers.length) {
    return { canvas: null, reason: 'missing-controller' };
  }

  const treeController = controllers[controllers.length - 1];
  const canvas = treeController?.deckContext?.canvas ?? null;

  if (!canvas) {
    return { canvas: null, reason: 'missing-canvas', treeController };
  }

  return { canvas, reason: null, treeController };
}

export function createPngFileName(frameIndex) {
  return `phylo-movie-export-${frameIndex + 1}.png`;
}

export async function createCanvasPngBlob(canvas) {
  const proxyCanvas = document.createElement('canvas');
  proxyCanvas.width = canvas.width;
  proxyCanvas.height = canvas.height;

  const ctx = proxyCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser could not create a 2D canvas for PNG export.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, proxyCanvas.width, proxyCanvas.height);
  ctx.drawImage(canvas, 0, 0);

  const blob = await new Promise((resolve) => {
    proxyCanvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('Browser returned an empty PNG blob.');
  }

  return blob;
}
