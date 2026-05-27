import {
  resolveComparisonActiveTreeIndex,
  resolveCursorTreeIndex,
  resolveHighlightTreeIndex,
} from '../../domain/indexing/treeIndexSemantics.js';

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const normalizeOptionalProgress = (value) => (Number.isFinite(value) ? clamp01(value) : null);

export class TransitionFrame {
  static from(frame = {}, options = {}) {
    const sourceTreeIndex = normalizeIndex(frame.sourceTreeIndex, 0);
    const targetTreeIndex = normalizeIndex(frame.targetTreeIndex, sourceTreeIndex);
    const transitionProgress = clamp01(frame.transitionProgress);

    return new TransitionFrame({
      sourceTree: frame.sourceTree ?? null,
      targetTree: frame.targetTree ?? frame.sourceTree ?? null,
      sourceTreeIndex,
      targetTreeIndex,
      transitionProgress,
      renderProgress: options.renderProgress ?? frame.renderProgress ?? transitionProgress,
      timelineProgress: options.timelineProgress ?? frame.timelineProgress,
      holdKind: options.holdKind ?? frame.holdKind ?? null,
      stage: options.stage ?? frame.stage ?? null,
      transitionChangeModel: options.transitionChangeModel ?? frame.transitionChangeModel ?? null,
    });
  }

  constructor({
    sourceTree = null,
    targetTree = null,
    sourceTreeIndex = 0,
    targetTreeIndex = sourceTreeIndex,
    transitionProgress = 0,
    renderProgress = transitionProgress,
    timelineProgress = null,
    holdKind = null,
    stage = null,
    transitionChangeModel = null,
  } = {}) {
    // Semantic progress drives topology/lifecycle clocks. Render progress is
    // allowed to be eased, but must not replace semantic transitionProgress.
    this.sourceTree = sourceTree;
    this.targetTree = targetTree ?? sourceTree;
    this.sourceTreeIndex = normalizeIndex(sourceTreeIndex, 0);
    this.targetTreeIndex = normalizeIndex(targetTreeIndex, this.sourceTreeIndex);
    this.transitionProgress = clamp01(transitionProgress);
    this.renderProgress = clamp01(renderProgress);
    this.timelineProgress = normalizeOptionalProgress(timelineProgress);
    this.holdKind = holdKind;
    this.stage = stage;
    this.transitionChangeModel = transitionChangeModel;
  }

  get isStatic() {
    return this.sourceTreeIndex === this.targetTreeIndex || this.sourceTree === this.targetTree;
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

  get comparisonActiveTreeIndex() {
    return resolveComparisonActiveTreeIndex(
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
      timelineProgress: this.timelineProgress,
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
