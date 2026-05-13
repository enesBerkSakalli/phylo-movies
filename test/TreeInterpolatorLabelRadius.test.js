import { describe, expect, it } from 'vitest';
import { TreeInterpolator } from '../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js';

describe('TreeInterpolator label radius smoothing', () => {
  it('uses the interpolation time for generic entering and exiting opacity', () => {
    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(
      {
        max_radius: 40,
        nodes: [node('node-exit-1', 30, 0)],
        links: [],
        labels: [],
        extensions: [],
      },
      {
        max_radius: 40,
        nodes: [node('node-enter-2', 30, 0, [2])],
        links: [],
        labels: [],
        extensions: [],
      },
      0.25
    );

    const byId = new Map(result.nodes.map((item) => [item.id, item]));
    expect(byId.get('node-enter-2').opacity).toBeCloseTo(0.25);
    expect(byId.get('node-exit-1').opacity).toBeCloseTo(0.75);
  });

  it('places entering labels on the interpolated label radius', () => {
    const interpolator = new TreeInterpolator();
    const fromData = {
      max_radius: 100,
      nodes: [],
      links: [],
      labels: [],
      extensions: []
    };
    const toData = {
      max_radius: 200,
      nodes: [],
      links: [],
      labels: [{
        id: 'label:a',
        position: [222, 0, 0],
        polarPosition: 222,
        angle: 0,
        rotation: 0,
        text: 'A',
        textAnchor: 'start'
      }],
      extensions: [{
        id: 'extension:a',
        path: [[200, 0, 0], [205, 0, 0]],
        polarData: {
          source: { angle: 0, radius: 200 },
          target: { angle: 0, radius: 205 }
        }
      }]
    };

    const result = interpolator.interpolateTreeData(fromData, toData, 0.5);

    expect(result.max_radius).toBe(150);
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0].polarPosition).toBe(172);
    expect(result.labels[0].position[0]).toBeCloseTo(172);
    expect(result.labels[0].position[1]).toBeCloseTo(0);
    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].polarData.target.radius).toBe(155);
    expect(Array.from(result.extensions[0].path).slice(-3)).toEqual([155, 0, 0]);
  });

  it('keeps extension positions and polar metadata synchronized with the interpolated path', () => {
    const result = new TreeInterpolator().interpolateTreeData(
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [],
        extensions: [extension('ext-1', 40, 50, 0)],
      },
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [],
        extensions: [extension('ext-1', 40, 50, Math.PI / 2)],
      },
      0.5
    );

    const interpolated = result.extensions[0];
    const pathStart = pathPoint(interpolated.path, 0);
    const pathEnd = pathPoint(interpolated.path, interpolated.path.length - 3);

    expect(interpolated.sourcePosition).toEqual(pathStart);
    expect(interpolated.targetPosition).toEqual(pathEnd);
    expect(interpolated.polarData.source.radius).toBeCloseTo(pointRadius(pathStart));
    expect(interpolated.polarData.target.radius).toBeCloseTo(pointRadius(pathEnd));
    expect(interpolated.polarData.source.angle).toBeCloseTo(pointAngle(pathStart));
    expect(interpolated.polarData.target.angle).toBeCloseTo(pointAngle(pathEnd));
  });

  it('derives label text anchor from the final interpolated frame angle', () => {
    const result = new TreeInterpolator().interpolateTreeData(
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [label('label-1', 60, 0)],
        extensions: [],
      },
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [label('label-1', 60, Math.PI / 2)],
        extensions: [],
      },
      0.5
    );

    const interpolated = result.labels[0];

    expect(shouldFlipLabel(interpolated.angle)).toBe(true);
    expect(interpolated.textAnchor).toBe('end');
  });

  it('coordinates custom root angle across label interpolation and velocity normalization', () => {
    const interpolator = new TreeInterpolator();
    interpolator.setRootAngle(Math.PI / 2);

    const result = interpolator.interpolateTreeData(
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [label('label-1', 60, 80 * Math.PI / 180)],
        extensions: [],
      },
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [label('label-1', 60, 100 * Math.PI / 180)],
        extensions: [],
      },
      0.5
    );

    const normalizedAngle = normalizeAngle(result.labels[0].angle);
    expect(Math.abs(normalizedAngle - Math.PI / 2)).toBeGreaterThan(0.5);
  });
});

function extension(id, sourceRadius, targetRadius, angle) {
  const sourcePosition = position(sourceRadius, angle);
  const targetPosition = position(targetRadius, angle);

  return {
    id,
    split_indices: [1],
    sourcePosition,
    targetPosition,
    polarData: {
      source: { angle, radius: sourceRadius },
      target: { angle, radius: targetRadius },
    },
    path: new Float32Array([...sourcePosition, ...targetPosition]),
  };
}

function label(id, radius, angle) {
  return {
    id,
    split_indices: [1],
    position: position(radius, angle),
    polarPosition: radius,
    distance: radius,
    angle,
    rotation: -angle,
    textAnchor: shouldFlipLabel(angle) ? 'end' : 'start',
    text: id,
  };
}

function node(id, radius, angle, splitIndices = [1]) {
  return {
    id,
    split_indices: splitIndices,
    radius,
    polarPosition: radius,
    angle,
    opacity: 1,
    position: position(radius, angle),
  };
}

function position(radius, angle) {
  return [
    radius * Math.cos(angle),
    radius * Math.sin(angle),
    0,
  ];
}

function pathPoint(path, offset) {
  return Array.from(path).slice(offset, offset + 3);
}

function pointRadius(point) {
  return Math.hypot(point[0], point[1]);
}

function pointAngle(point) {
  return Math.atan2(point[1], point[0]);
}

function shouldFlipLabel(angle) {
  const normalized = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
  return normalized > Math.PI / 2 && normalized < Math.PI * 1.5;
}

function normalizeAngle(angle) {
  return ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
}
