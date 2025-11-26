import React, { useEffect, useMemo, useRef } from 'react';
import { Deck, OrthographicView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { PathLayer } from '@deck.gl/layers';
import { useAppStore } from '../../../js/core/store.js';

function buildCurves(sourceToDest, sourcePos, destPos) {
  const curves = [];
  if (!sourceToDest) return curves;

  Object.entries(sourceToDest).forEach(([srcKey, destKeys]) => {
    const from = sourcePos?.[srcKey];
    if (!from) return;
    destKeys.forEach((dstKey) => {
      const to = destPos?.[dstKey];
      if (!to) return;
      curves.push({ from, to });
    });
  });
  return curves;
}

function buildBezierPath(from, to, samples = 24) {
  const p0 = [from.x, -from.y, 0];
  const p3 = [to.x, -to.y, 0];
  const midX = (from.x + to.x) / 2;
  const offset = Math.max(Math.abs(to.x - from.x) * 0.15, 30);
  const p1 = [midX - offset, -from.y, 0];
  const p2 = [midX + offset, -to.y, 0];

  const path = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    path.push([x, y, 0]);
  }
  return path;
}

export function MoverCurvesOverlay() {
  const containerRef = useRef(null);
  const deckRef = useRef(null);
  const viewsConnected = useAppStore((s) => s.viewsConnected);
  const sourceToDest = useAppStore((s) => s.viewLinkMapping.sourceToDest);
  const sourcePos = useAppStore((s) => s.screenPositionsLeft);
  const destPos = useAppStore((s) => s.screenPositionsRight);

  const curves = useMemo(() => {
    if (!viewsConnected) return [];
    return buildCurves(sourceToDest, sourcePos, destPos);
  }, [viewsConnected, sourceToDest, sourcePos, destPos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    });
    container.appendChild(canvas);

    const view = new OrthographicView({ id: 'mover-view' });
    const deck = new Deck({
      canvas,
      views: [view],
      controller: false,
      onError: (e) => console.warn('[MoverCurvesOverlay] deck error', e),
    });
    deckRef.current = deck;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      deck.setProps({
        width: rect.width,
        height: rect.height,
        viewState: {
          id: 'mover-view',
          target: [rect.width / 2, -rect.height / 2, 0],
          zoom: 0
        }
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      deck.finalize();
      deckRef.current = null;
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const layer = new PathLayer({
      id: 'mover-curves',
      data: curves.map((c, idx) => ({ id: idx, path: buildBezierPath(c.from, c.to) })),
      getPath: d => d.path,
      getColor: [59, 130, 246, 200],
      getWidth: 2,
      widthUnits: 'pixels',
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      opacity: 0.9
    });
    deck.setProps({
      layers: (viewsConnected && curves.length) ? [layer] : [],
      viewState: rect ? {
        id: 'mover-view',
        target: [rect.width / 2, -rect.height / 2, 0],
        zoom: 0
      } : undefined
    });
  }, [curves, viewsConnected]);

  const debugText = viewsConnected
    ? `movers: ${curves.length} | src keys: ${Object.keys(sourcePos || {}).length} | dst keys: ${Object.keys(destPos || {}).length}`
    : 'views disconnected';

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.4)',
          color: '#fff',
          fontSize: 11,
          borderRadius: 4,
          pointerEvents: 'none'
        }}
      >
        {debugText}
      </div>
    </div>
  );
}

export default MoverCurvesOverlay;
