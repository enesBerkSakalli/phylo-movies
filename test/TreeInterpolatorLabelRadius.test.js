import { describe, expect, it, vi } from 'vitest';
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

  it('uses straight direct paths during interpolation when straight link geometry is selected', () => {
    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(
      {
        max_radius: 40,
        nodes: [],
        links: [link('link-1', 10, 20, 0, Math.PI / 2)],
        labels: [],
        extensions: [],
      },
      {
        max_radius: 40,
        nodes: [],
        links: [link('link-1', 10, 20, 0, Math.PI / 2)],
        labels: [],
        extensions: [],
      },
      0.5,
      { linkGeometryMode: 'straight' }
    );

    expect(result.links[0].path).toHaveLength(6);
    expectPathCloseTo(result.links[0].path, [10, 0, 0, 0, 20, 0]);
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
        labels: [label('label-1', 60, Math.PI / 2)],
        extensions: [],
      },
      {
        max_radius: 40,
        nodes: [],
        links: [],
        labels: [label('label-1', 60, Math.PI)],
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

  it('derives link source and target positions from node velocity entries', () => {
    const interpolator = new TreeInterpolator();
    const fromParentAngle = Math.PI / 4;
    const toParentAngle = (3 * Math.PI) / 4;
    const fromChildAngle = Math.PI / 4;
    const toChildAngle = Math.PI / 3;

    const result = interpolator.interpolateTreeData(
      {
        max_radius: 120,
        nodes: [node('parent', 40, fromParentAngle), node('child', 80, fromChildAngle)],
        links: [link('parent-child', 40, 80, fromParentAngle, fromChildAngle, 'parent', 'child')],
        labels: [],
        extensions: [],
      },
      {
        max_radius: 120,
        nodes: [node('parent', 40, toParentAngle), node('child', 80, toChildAngle)],
        links: [link('parent-child', 40, 80, toParentAngle, toChildAngle, 'parent', 'child')],
        labels: [],
        extensions: [],
      },
      0.25
    );

    const parent = result.nodes.find((item) => item.id === 'parent');
    const child = result.nodes.find((item) => item.id === 'child');
    const interpolatedLink = result.links[0];

    expectPointCloseTo(interpolatedLink.sourcePosition, parent.position);
    expectPointCloseTo(interpolatedLink.targetPosition, child.position);
    expectPointCloseTo(pathPoint(interpolatedLink.path, 0), parent.position, 5);
    expectPointCloseTo(
      pathPoint(interpolatedLink.path, interpolatedLink.path.length - 3),
      child.position,
      5
    );
  });

  it('reuses element lookup maps across frames for the same layout data', () => {
    const interpolator = new TreeInterpolator();
    const createMap = vi.spyOn(interpolator.elementMatcher, '_createElementMap');
    const fromData = treeData('from', 0);
    const toData = treeData('to', Math.PI / 4);

    try {
      interpolator.interpolateTreeData(fromData, toData, 0.25);
      interpolator.interpolateTreeData(fromData, toData, 0.5);

      expect(createMap).toHaveBeenCalledTimes(8);
    } finally {
      createMap.mockRestore();
    }
  });
});

function treeData(prefix, angle) {
  return {
    max_radius: 40,
    nodes: [node(`${prefix}:node`, 10, angle)],
    links: [link(`${prefix}:link`, 5, 10, angle, angle)],
    labels: [label(`${prefix}:label`, 12, angle)],
    extensions: [extension(`${prefix}:extension`, 10, 12, angle)],
  };
}

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

function link(id, sourceRadius, targetRadius, sourceAngle, targetAngle, sourceId = null, targetId = null) {
  const sourcePosition = position(sourceRadius, sourceAngle);
  const targetPosition = position(targetRadius, targetAngle);

  return {
    id,
    splitKey: id,
    split_indices: [1],
    sourceId,
    targetId,
    radialLength: Math.max(0, targetRadius - sourceRadius),
    opacity: 1,
    sourcePosition,
    targetPosition,
    polarData: {
      source: { angle: sourceAngle, radius: sourceRadius },
      target: { angle: targetAngle, radius: targetRadius },
    },
    path: new Float32Array([...sourcePosition, ...targetPosition]),
  };
}

function expectPathCloseTo(path, expected) {
  const actual = Array.from(path);
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], 6);
  });
}

function expectPointCloseTo(actual, expected, precision = 6) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], precision);
  });
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
