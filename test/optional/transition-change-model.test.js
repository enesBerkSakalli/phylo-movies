import { expect } from 'chai';
import { buildTransitionChangeModel, createLifecycleClocks } from '../../src/treeVisualisation/deckgl/interpolation/TransitionChangeModel.js';
import { TreeInterpolator } from '../../src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js';
import { getNodeKey } from '../../src/treeVisualisation/utils/KeyGenerator.js';
import { ANIMATION_STAGES } from '../../src/treeVisualisation/deckgl/interpolation/stages/animationStageDetector.js';

function link(id, sourceRadius, targetRadius, angle = 0) {
  return {
    id,
    splitKey: id,
    split_indices: [Number(id.replace(/\D/g, '')) || 1],
    radialLength: Math.max(0, targetRadius - sourceRadius),
    opacity: 1,
    polarData: {
      source: { angle, radius: sourceRadius },
      target: { angle, radius: targetRadius }
    },
    path: new Float32Array([
      sourceRadius * Math.cos(angle), sourceRadius * Math.sin(angle), 0,
      targetRadius * Math.cos(angle), targetRadius * Math.sin(angle), 0
    ])
  };
}

function node(id, radius, angle = 0, splitIndices = [Number(id.replace(/\D/g, '')) || 1]) {
  return {
    id,
    splitKey: id,
    angle,
    polarPosition: radius,
    radius,
    position: [
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      0
    ],
    split_indices: splitIndices
  };
}

function extension(id, sourceRadius, targetRadius, angle = 0, splitIndices = [Number(id.replace(/\D/g, '')) || 1]) {
  return {
    id,
    split_indices: splitIndices,
    opacity: 1,
    sourcePosition: [
      sourceRadius * Math.cos(angle),
      sourceRadius * Math.sin(angle),
      0
    ],
    targetPosition: [
      targetRadius * Math.cos(angle),
      targetRadius * Math.sin(angle),
      0
    ],
    polarData: {
      source: { angle, radius: sourceRadius },
      target: { angle, radius: targetRadius }
    },
    path: new Float32Array([
      sourceRadius * Math.cos(angle), sourceRadius * Math.sin(angle), 0,
      targetRadius * Math.cos(angle), targetRadius * Math.sin(angle), 0
    ])
  };
}

function label(id, radius, angle = 0, splitIndices = [Number(id.replace(/\D/g, '')) || 1]) {
  return {
    id,
    split_indices: splitIndices,
    opacity: 1,
    position: [
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      0
    ],
    polarPosition: radius,
    distance: radius,
    angle,
    rotation: -angle,
    textAnchor: 'start',
    text: id
  };
}

function frame(links, nodes = [], extensions = [], labels = []) {
  return { nodes, labels, extensions, links };
}

function lastPathRadius(path) {
  const x = path[path.length - 3];
  const y = path[path.length - 2];
  return Math.hypot(x, y);
}

function firstPathRadius(path) {
  const x = path[0];
  const y = path[1];
  return Math.hypot(x, y);
}

function pointAngle(point) {
  return Math.atan2(point[1], point[0]);
}

function maxDistanceFromFirstPoint(path) {
  const origin = [path[0], path[1], path[2] ?? 0];
  let maxDistance = 0;
  for (let i = 0; i < path.length; i += 3) {
    const dx = path[i] - origin[0];
    const dy = path[i + 1] - origin[1];
    const dz = (path[i + 2] ?? 0) - origin[2];
    maxDistance = Math.max(maxDistance, Math.hypot(dx, dy, dz));
  }
  return maxDistance;
}

describe('TransitionChangeModel', () => {
  it('classifies entering, exiting, zeroing, reviving, and length-changing links', () => {
    const from = frame([
      link('stable-1', 10, 20),
      link('exit-2', 10, 30),
      link('zero-3', 10, 25),
      link('revive-4', 10, 10),
      link('length-5', 10, 22)
    ]);
    const to = frame([
      link('stable-1', 10, 20),
      link('enter-6', 10, 28),
      link('zero-3', 10, 10),
      link('revive-4', 10, 24),
      link('length-5', 10, 35)
    ]);

    const model = buildTransitionChangeModel(from, to);

    expect(model.getLinkLifecycle('stable-1')).to.equal('unchanged');
    expect(model.getLinkLifecycle('enter-6')).to.equal('entering');
    expect(model.getLinkLifecycle('exit-2')).to.equal('exiting');
    expect(model.getLinkLifecycle('zero-3')).to.equal('zeroing');
    expect(model.getLinkLifecycle('revive-4')).to.equal('reviving');
    expect(model.getLinkLifecycle('length-5')).to.equal('lengthChanging');
    expect(model.hasLifecycleChanges).to.equal(true);
  });
});

describe('TreeInterpolator lifecycle-aware links', () => {
  it('keeps lifecycle branch growth and collapse within visible bounds', () => {
    const from = frame([
      link('exit-1', 10, 30),
      link('zero-2', 10, 30),
      link('stable-3', 10, 30)
    ]);
    const to = frame([
      link('enter-4', 10, 30),
      link('zero-2', 10, 10),
      link('stable-3', 20, 40)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.25, {
      transitionChangeModel
    });

    const byId = new Map(result.links.map((item) => [item.id, item]));
    expect(byId.get('enter-4').lifecycle).to.equal('entering');
    expect(byId.get('exit-1').lifecycle).to.equal('exiting');
    expect(byId.get('zero-2').lifecycle).to.equal('zeroing');
    expect(byId.get('stable-3').lifecycle).to.equal('unchanged');

    expect(byId.get('enter-4').opacity).to.equal(1);
    expect(byId.get('exit-1').opacity).to.equal(1);
    expect(lastPathRadius(byId.get('enter-4').path)).to.be.lessThan(30);
    expect(lastPathRadius(byId.get('exit-1').path)).to.be.lessThan(30);
    expect(lastPathRadius(byId.get('zero-2').path)).to.be.lessThan(30);
  });

  it('fades structural link enter and exit only when explicitly requested', () => {
    const from = frame([
      link('exit-1', 10, 30)
    ]);
    const to = frame([
      link('enter-2', 10, 30)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.25, {
      transitionChangeModel,
      enterTimeFactor: 0.25,
      exitTimeFactor: 0.25
    });

    const byId = new Map(result.links.map((item) => [item.id, item]));
    expect(byId.get('enter-2').opacity).to.equal(0.25);
    expect(byId.get('exit-1').opacity).to.equal(0.75);
  });

  it('keeps lifecycle link anchors on the frame-time geometry', () => {
    const from = frame([
      link('zero-1', 10, 30)
    ]);
    const to = frame([
      link('zero-1', 20, 20)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.25, {
      transitionChangeModel
    });

    const zeroing = result.links[0];
    expect(zeroing.lifecycle).to.equal('zeroing');
    expect(firstPathRadius(zeroing.path)).to.be.closeTo(12.5, 0.001);
  });

  it('grows a retained zero-length branch continuously from its full target length', () => {
    const from = frame([
      link('revive-1', 10, 10)
    ]);
    const to = frame([
      link('revive-1', 10, 30)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.25, {
      transitionChangeModel
    });

    const reviving = result.links[0];
    expect(reviving.lifecycle).to.equal('reviving');
    expect(firstPathRadius(reviving.path)).to.be.closeTo(10, 0.001);
    expect(lastPathRadius(reviving.path)).to.be.closeTo(15, 0.001);
  });

  it('keeps retained zero-length branch growth on the frame target angle', () => {
    const from = frame([
      link('revive-1', 10, 10, Math.PI / 2)
    ]);
    const to = frame([
      link('revive-1', 10, 30, Math.PI)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const reviving = result.links[0];
    const targetPoint = [
      reviving.path[reviving.path.length - 3],
      reviving.path[reviving.path.length - 2],
      reviving.path[reviving.path.length - 1]
    ];

    expect(reviving.lifecycle).to.equal('reviving');
    expect(lastPathRadius(reviving.path)).to.be.closeTo(20, 0.001);
    expect(pointAngle(targetPoint)).to.be.closeTo(Math.PI * 0.75, 0.001);
  });

  it('shrinks a retained branch continuously toward its zero-length target', () => {
    const from = frame([
      link('zero-1', 10, 30)
    ]);
    const to = frame([
      link('zero-1', 10, 10)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.25, {
      transitionChangeModel
    });

    const zeroing = result.links[0];
    expect(zeroing.lifecycle).to.equal('zeroing');
    expect(firstPathRadius(zeroing.path)).to.be.closeTo(10, 0.001);
    expect(lastPathRadius(zeroing.path)).to.be.closeTo(25, 0.001);
  });

  it('keeps unchanged child links attached to a rendered parent while the parent branch zeroes', () => {
    const parentFrom = {
      ...link('zero-parent-2', 10, 30),
      sourceId: 'node-root-1',
      targetId: 'node-parent-2'
    };
    const parentTo = {
      ...link('zero-parent-2', 20, 20),
      sourceId: 'node-root-1',
      targetId: 'node-parent-2'
    };
    const childFrom = {
      ...link('stable-child-3', 30, 40),
      sourceId: 'node-parent-2',
      targetId: 'node-child-3'
    };
    const childTo = {
      ...link('stable-child-3', 20, 30),
      sourceId: 'node-parent-2',
      targetId: 'node-child-3'
    };
    const from = frame([parentFrom, childFrom], [
      node('node-root-1', 10),
      node('node-parent-2', 30),
      node('node-child-3', 40)
    ]);
    const to = frame([parentTo, childTo], [
      node('node-root-1', 20),
      node('node-parent-2', 20),
      node('node-child-3', 30)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const result = new TreeInterpolator().interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const parentLink = result.links.find((item) => item.id === 'zero-parent-2');
    const childLink = result.links.find((item) => item.id === 'stable-child-3');
    const childNode = result.nodes.find((item) => item.id === 'node-child-3');

    expect(childLink.lifecycle).to.equal('unchanged');
    expect(firstPathRadius(childLink.path)).to.be.closeTo(lastPathRadius(parentLink.path), 0.001);
    expect(lastPathRadius(childLink.path)).to.be.closeTo(35, 0.001);
    expect(Math.hypot(childNode.position[0], childNode.position[1])).to.be.closeTo(35, 0.001);
  });

  it('keeps unchanged labels and extensions on their own angle during a parent branch lifecycle', () => {
    const parentId = getNodeKey({ split_indices: [2] });
    const parentFrom = {
      ...link('zero-parent-2', 10, 30, 0),
      sourceId: getNodeKey({ split_indices: [1] }),
      targetId: parentId
    };
    const parentTo = {
      ...link('zero-parent-2', 20, 20, Math.PI / 2),
      sourceId: getNodeKey({ split_indices: [1] }),
      targetId: parentId
    };
    const from = frame(
      [parentFrom],
      [
        node(getNodeKey({ split_indices: [1] }), 10, 0, [1]),
        node(parentId, 30, 0, [2])
      ],
      [extension('ext-parent-2', 30, 55, 0, [2])],
      [label('label-parent-2', 55, 0, [2])]
    );
    const to = frame(
      [parentTo],
      [
        node(getNodeKey({ split_indices: [1] }), 20, 0, [1]),
        node(parentId, 20, Math.PI / 2, [2])
      ],
      [extension('ext-parent-2', 20, 55, 0, [2])],
      [label('label-parent-2', 55, 0, [2])]
    );
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const result = new TreeInterpolator().interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    expect(result.labels[0].angle).to.be.closeTo(0, 0.001);
    expect(pointAngle(result.extensions[0].targetPosition)).to.be.closeTo(0, 0.001);
  });

  it('anchors entering links to moving parent nodes', () => {
    const entering = {
      ...link('enter-3', 20, 30),
      sourceId: 'node-parent-1',
      targetId: 'node-enter-3'
    };
    const from = frame([], [
      node('node-parent-1', 10)
    ]);
    const to = frame([entering], [
      node('node-parent-1', 20),
      node('node-enter-3', 30)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    expect(result.links[0].lifecycle).to.equal('entering');
    expect(firstPathRadius(result.links[0].path)).to.be.closeTo(15, 0.001);
  });

  it('scales entering branch length with expand timing while parent movement uses frame timing', () => {
    const entering = {
      ...link('enter-3', 20, 30),
      sourceId: 'node-parent-1',
      targetId: 'node-enter-3'
    };
    const from = frame([], [
      node('node-parent-1', 10)
    ]);
    const to = frame([entering], [
      node('node-parent-1', 20),
      node('node-enter-3', 30)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);
    const rawTimeFactor = 0.25;
    const frameTimeFactor = 1 - Math.pow(1 - rawTimeFactor, 3);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, frameTimeFactor, {
      transitionChangeModel,
      rawTimeFactor
    });

    const sourceRadius = 10 + ((20 - 10) * frameTimeFactor);
    const expandT = createLifecycleClocks(rawTimeFactor).expandT;
    const expectedTargetRadius = sourceRadius + ((30 - sourceRadius) * expandT);

    expect(firstPathRadius(result.links[0].path)).to.be.closeTo(sourceRadius, 0.001);
    expect(lastPathRadius(result.links[0].path)).to.be.closeTo(expectedTargetRadius, 0.001);
  });

  it('scales exiting branch length with collapse timing while parent movement uses frame timing', () => {
    const exiting = {
      ...link('exit-3', 20, 30),
      sourceId: 'node-parent-1',
      targetId: 'node-exit-3'
    };
    const from = frame([exiting], [
      node('node-parent-1', 10),
      node('node-exit-3', 30)
    ]);
    const to = frame([], [
      node('node-parent-1', 20)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);
    const rawTimeFactor = 0.5;
    const frameTimeFactor = 1 - Math.pow(1 - rawTimeFactor, 3);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, frameTimeFactor, {
      transitionChangeModel,
      rawTimeFactor
    });

    const sourceRadius = 10 + ((20 - 10) * frameTimeFactor);
    const collapseT = createLifecycleClocks(rawTimeFactor).collapseT;
    const expectedTargetRadius = sourceRadius + ((30 - sourceRadius) * (1 - collapseT));

    expect(firstPathRadius(result.links[0].path)).to.be.closeTo(sourceRadius, 0.001);
    expect(lastPathRadius(result.links[0].path)).to.be.closeTo(expectedTargetRadius, 0.001);
  });

  it('keeps retained node angles frozen while an exiting branch collapses', () => {
    const exiting = {
      ...link('exit-3', 20, 30, 0),
      sourceId: 'node-parent-1',
      targetId: 'node-exit-3'
    };
    const from = frame([exiting], [
      node('node-parent-1', 20, 0),
      node('node-exit-3', 30, 0)
    ]);
    const to = frame([], [
      node('node-parent-1', 20, Math.PI / 2)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);
    const rawTimeFactor = 0.2;
    const frameTimeFactor = 1 - Math.pow(1 - rawTimeFactor, 3);

    const result = new TreeInterpolator().interpolateTreeData(from, to, frameTimeFactor, {
      stage: ANIMATION_STAGES.COLLAPSE,
      transitionChangeModel,
      rawTimeFactor
    });

    const clocks = createLifecycleClocks(rawTimeFactor);
    const parentNode = result.nodes.find((item) => item.id === 'node-parent-1');
    const exitingLink = result.links.find((item) => item.id === 'exit-3');

    expect(clocks.moveT).to.equal(0);
    expect(clocks.collapseT).to.be.greaterThan(0);
    expect(pointAngle(parentNode.position)).to.be.closeTo(0, 0.001);
    expect(pointAngle(exitingLink.sourcePosition)).to.be.closeTo(0, 0.001);
  });

  it('does not create an arc ring when lifecycle branch length is zero', () => {
    const entering = {
      ...link('enter-3', 20, 30, Math.PI / 2),
      sourceId: 'node-parent-1',
      targetId: 'node-enter-3'
    };
    const from = frame([], [
      node('node-parent-1', 10, 0)
    ]);
    const to = frame([entering], [
      node('node-parent-1', 20, 0),
      node('node-enter-3', 30, Math.PI / 2)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);
    const rawTimeFactor = 0.25;
    const frameTimeFactor = 1 - Math.pow(1 - rawTimeFactor, 3);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, frameTimeFactor, {
      transitionChangeModel,
      rawTimeFactor
    });

    const expandT = createLifecycleClocks(rawTimeFactor).expandT;
    expect(expandT).to.equal(0);
    expect(maxDistanceFromFirstPoint(result.links[0].path)).to.be.lessThan(0.001);
    expect(result.links[0].targetPosition[0]).to.be.closeTo(result.links[0].sourcePosition[0], 0.001);
    expect(result.links[0].targetPosition[1]).to.be.closeTo(result.links[0].sourcePosition[1], 0.001);
    expect(result.links[0].polarData.target.radius).to.be.closeTo(result.links[0].polarData.source.radius, 0.001);
    expect(result.links[0].radialLength).to.be.closeTo(0, 0.001);
  });

  it('keeps zero-length lifecycle target nodes on their frame angle', () => {
    const entering = {
      ...link('enter-3', 20, 30, Math.PI / 2),
      sourceId: 'node-parent-1',
      targetId: 'node-enter-3'
    };
    const from = frame([], [
      node('node-parent-1', 10, 0)
    ]);
    const to = frame([entering], [
      node('node-parent-1', 20, 0),
      node('node-enter-3', 30, Math.PI / 2)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);
    const rawTimeFactor = 0.25;
    const frameTimeFactor = 1 - Math.pow(1 - rawTimeFactor, 3);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, frameTimeFactor, {
      transitionChangeModel,
      rawTimeFactor
    });

    const enteringNode = result.nodes.find((item) => item.id === 'node-enter-3');
    expect(pointAngle(enteringNode.position)).to.be.closeTo(Math.PI / 2, 0.001);
  });

  it('keeps nested entering child branch sources attached to the growing parent branch', () => {
    const parentLink = {
      ...link('enter-parent-2', 20, 30),
      sourceId: 'node-root-1',
      targetId: 'node-parent-2'
    };
    const childLink = {
      ...link('enter-child-3', 30, 40),
      sourceId: 'node-parent-2',
      targetId: 'node-child-3'
    };
    const from = frame([], [
      node('node-root-1', 10)
    ]);
    const to = frame([parentLink, childLink], [
      node('node-root-1', 20),
      node('node-parent-2', 30),
      node('node-child-3', 40)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const byId = new Map(result.links.map((item) => [item.id, item]));
    const parentTargetRadius = lastPathRadius(byId.get('enter-parent-2').path);

    expect(parentTargetRadius).to.be.lessThan(30);
    expect(firstPathRadius(byId.get('enter-child-3').path)).to.be.closeTo(parentTargetRadius, 0.001);
  });

  it('keeps nested exiting child branch sources attached to the collapsing parent branch', () => {
    const parentLink = {
      ...link('exit-parent-2', 10, 30),
      sourceId: 'node-root-1',
      targetId: 'node-parent-2'
    };
    const childLink = {
      ...link('exit-child-3', 30, 40),
      sourceId: 'node-parent-2',
      targetId: 'node-child-3'
    };
    const from = frame([parentLink, childLink], [
      node('node-root-1', 10),
      node('node-parent-2', 30),
      node('node-child-3', 40)
    ]);
    const to = frame([], [
      node('node-root-1', 20)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const byId = new Map(result.links.map((item) => [item.id, item]));
    const parentTargetRadius = lastPathRadius(byId.get('exit-parent-2').path);

    expect(parentTargetRadius).to.be.lessThan(30);
    expect(firstPathRadius(byId.get('exit-child-3').path)).to.be.closeTo(parentTargetRadius, 0.001);
  });

  it('keeps retained child branch sources attached when the parent branch zeroes', () => {
    const parentFrom = {
      ...link('zero-parent-2', 10, 30),
      sourceId: 'node-root-1',
      targetId: 'node-parent-2'
    };
    const parentTo = {
      ...link('zero-parent-2', 20, 20),
      sourceId: 'node-root-1',
      targetId: 'node-parent-2'
    };
    const childFrom = {
      ...link('stable-child-3', 30, 40),
      sourceId: 'node-parent-2',
      targetId: 'node-child-3'
    };
    const childTo = {
      ...link('stable-child-3', 20, 30),
      sourceId: 'node-parent-2',
      targetId: 'node-child-3'
    };
    const from = frame([parentFrom, childFrom], [
      node('node-root-1', 10),
      node('node-parent-2', 30),
      node('node-child-3', 40)
    ]);
    const to = frame([parentTo, childTo], [
      node('node-root-1', 20),
      node('node-parent-2', 20),
      node('node-child-3', 30)
    ]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const byId = new Map(result.links.map((item) => [item.id, item]));
    const parentTargetRadius = lastPathRadius(byId.get('zero-parent-2').path);

    expect(byId.get('zero-parent-2').lifecycle).to.equal('zeroing');
    expect(byId.get('stable-child-3').lifecycle).to.equal('unchanged');
    expect(parentTargetRadius).to.be.lessThan(25);
    expect(firstPathRadius(byId.get('stable-child-3').path)).to.be.closeTo(parentTargetRadius, 0.001);
    expect(lastPathRadius(byId.get('stable-child-3').path)).to.be.closeTo(35, 0.001);
  });

  it('keeps leaf extension sources attached to carried leaf nodes', () => {
    const rootId = getNodeKey({ split_indices: [1] });
    const parentId = getNodeKey({ split_indices: [2] });
    const leafId = getNodeKey({ split_indices: [3] });
    const parentFrom = {
      ...link('zero-parent-2', 10, 30),
      sourceId: rootId,
      targetId: parentId
    };
    const parentTo = {
      ...link('zero-parent-2', 20, 20),
      sourceId: rootId,
      targetId: parentId
    };
    const childFrom = {
      ...link('stable-child-3', 30, 40),
      sourceId: parentId,
      targetId: leafId
    };
    const childTo = {
      ...link('stable-child-3', 20, 30),
      sourceId: parentId,
      targetId: leafId
    };
    const from = frame(
      [parentFrom, childFrom],
      [
        node(rootId, 10, 0, [1]),
        node(parentId, 30, 0, [2]),
        node(leafId, 40, 0, [3])
      ],
      [extension('ext-3', 40, 55, 0, [3])]
    );
    const to = frame(
      [parentTo, childTo],
      [
        node(rootId, 20, 0, [1]),
        node(parentId, 20, 0, [2]),
        node(leafId, 30, 0, [3])
      ],
      [extension('ext-3', 30, 55, 0, [3])]
    );
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const leaf = result.nodes.find((item) => item.id === leafId);
    const childLink = result.links.find((item) => item.id === 'stable-child-3');
    const leafRadius = Math.hypot(leaf.position[0], leaf.position[1]);

    expect(leafRadius).to.be.closeTo(lastPathRadius(childLink.path), 0.001);
    expect(firstPathRadius(result.extensions[0].path)).to.be.closeTo(leafRadius, 0.001);
  });

  it('keeps leaf labels and extension targets on the carried leaf angle', () => {
    const fromAngle = 0;
    const parentToAngle = Math.PI / 2;
    const leafToAngle = 0;
    const rootId = getNodeKey({ split_indices: [1] });
    const parentId = getNodeKey({ split_indices: [2] });
    const leafId = getNodeKey({ split_indices: [3] });
    const parentFrom = {
      ...link('zero-parent-2', 10, 30, fromAngle),
      sourceId: rootId,
      targetId: parentId
    };
    const parentTo = {
      ...link('zero-parent-2', 20, 20, parentToAngle),
      sourceId: rootId,
      targetId: parentId
    };
    const childFrom = {
      ...link('stable-child-3', 30, 40, fromAngle),
      sourceId: parentId,
      targetId: leafId
    };
    const childTo = {
      ...link('stable-child-3', 20, 30, leafToAngle),
      sourceId: parentId,
      targetId: leafId
    };
    const from = frame(
      [parentFrom, childFrom],
      [
        node(rootId, 10, fromAngle, [1]),
        node(parentId, 30, fromAngle, [2]),
        node(leafId, 40, fromAngle, [3])
      ],
      [extension('ext-3', 40, 55, fromAngle, [3])],
      [label('label-3', 55, fromAngle, [3])]
    );
    const to = frame(
      [parentTo, childTo],
      [
        node(rootId, 20, parentToAngle, [1]),
        node(parentId, 20, parentToAngle, [2]),
        node(leafId, 30, leafToAngle, [3])
      ],
      [extension('ext-3', 30, 55, leafToAngle, [3])],
      [label('label-3', 55, leafToAngle, [3])]
    );
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    const leaf = result.nodes.find((item) => item.id === leafId);
    const leafAngle = pointAngle(leaf.position);
    const extensionTarget = result.extensions[0].targetPosition;

    expect(result.labels[0].angle).to.be.closeTo(leafAngle, 0.001);
    expect(pointAngle(extensionTarget)).to.be.closeTo(leafAngle, 0.001);
  });

  it('keeps structural entering node opacity at base opacity', () => {
    const enteringNode = node('node-enter-1', 30);
    const from = frame([], []);
    const to = frame([], [enteringNode]);
    const transitionChangeModel = buildTransitionChangeModel(from, to);

    const interpolator = new TreeInterpolator();
    const result = interpolator.interpolateTreeData(from, to, 0.5, {
      transitionChangeModel
    });

    expect(result.nodes[0].isEntering).to.equal(true);
    expect(result.nodes[0].opacity).to.equal(1);
  });
});
