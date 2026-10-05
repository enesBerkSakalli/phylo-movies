import {
  resolveCursorTreeIndex,
  resolveHighlightTreeIndex,
} from '../domain/indexing/treeIndexSemantics.js';
import { clamp01 } from '../domain/math/mathUtils.js';

export class TransitionFrame {
  static from(frame = {}, options = {}) {
    return new TransitionFrame({
      ...frame,
      renderProgress: options.renderProgress ?? frame.renderProgress,
      holdKind: options.holdKind ?? frame.holdKind,
      stage: options.stage ?? frame.stage,
      transitionChangeModel: options.transitionChangeModel ?? frame.transitionChangeModel,
    });
  }

  constructor({
    sourceTree = null,
    targetTree = null,
    sourceTreeIndex = 0,
    targetTreeIndex = sourceTreeIndex,
    transitionProgress = 0,
    renderProgress = transitionProgress,
    holdKind = null,
    stage = null,
    transitionChangeModel = null,
  } = {}) {
    // Semantic progress drives topology/lifecycle clocks. Render progress is
    // allowed to be eased, but must not replace semantic transitionProgress.
    this.sourceTree = sourceTree;
    this.sourceTreeIndex = normalizeIndex(sourceTreeIndex, 0);
    this.targetTreeIndex = normalizeIndex(targetTreeIndex, this.sourceTreeIndex);
    this.targetTree =
      targetTree ?? (this.targetTreeIndex === this.sourceTreeIndex ? sourceTree : null);
    this.transitionProgress = clamp01(transitionProgress);
    this.renderProgress = clamp01(renderProgress);
    this.holdKind = holdKind;
    this.stage = stage;
    this.transitionChangeModel = transitionChangeModel;
  }

  get isStatic() {
    return this.sourceTreeIndex === this.targetTreeIndex;
  }

  get cursorTreeIndex() {
    return resolveCursorTreeIndex(
      this.sourceTreeIndex,
      this.targetTreeIndex,
      this.transitionProgress
    );
  }

  get highlightTreeIndex() {
    return resolveHighlightTreeIndex(
      this.sourceTreeIndex,
      this.targetTreeIndex,
      this.transitionProgress
    );
  }

  withRenderState({
    renderProgress = this.renderProgress,
    stage = this.stage,
    transitionChangeModel = this.transitionChangeModel,
  } = {}) {
    return new TransitionFrame({
      sourceTree: this.sourceTree,
      targetTree: this.targetTree,
      sourceTreeIndex: this.sourceTreeIndex,
      targetTreeIndex: this.targetTreeIndex,
      transitionProgress: this.transitionProgress,
      renderProgress,
      holdKind: this.holdKind,
      stage,
      transitionChangeModel,
    });
  }

  toRenderOptions(extra = {}) {
    return {
      fromTreeIndex: this.sourceTreeIndex,
      toTreeIndex: this.targetTreeIndex,
      stage: this.stage,
      transitionChangeModel: this.transitionChangeModel,
      // Interpolators need the uneased transition clock for branch
      // lifecycle thresholds while renderProgress can move geometry.
      rawTimeFactor: this.transitionProgress,
      ...extra,
    };
  }
}

function normalizeIndex(value, defaultIndex) {
  return Number.isInteger(value) ? value : defaultIndex;
}
