import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';
import { buildTimeline } from '../../../../src/timeline/timeline.js';
import { describeCursor } from '../../../../src/timeline/describeCursor.js';
import { smallExampleMovieData } from '../../../fixtures/timeline/generatedMovieData.js';

const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

const resetPlaybackState = () => {
  useAppStore.setState({
    playing: false,
    timelineCursor: null,
    animationStartTime: null,
    animationSpeed: 1,
    frameIndex: 0,
    renderInProgress: false,
    treeList: [],
    timeline: null,
    timelineFrames: [],
  });
};

function createTimeline(overrides = {}) {
  return {
    totalDuration: 17_000,
    cursorForFrame: vi.fn(),
    cursorAt: vi.fn(),
    ...overrides,
  };
}

describe('playback navigation', () => {
  afterEach(() => {
    resetPlaybackState();
    vi.restoreAllMocks();
  });

  it('pauses playback and replaces the complete semantic position when seeking', () => {
    const cursor = {
      frameIndex: 2,
      sourceFrameIndex: 2,
      movieTimeMs: 3000,
    };
    const getCursorForFrame = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: trees,
      frameIndex: 0,
      timeline: createTimeline({ cursorForFrame: getCursorForFrame }),
    });

    useAppStore.getState().goToPosition(2, 'forward');

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.frameIndex).toBe(2);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(3000);
    expect(getCursorForFrame).toHaveBeenCalledWith(2, { occurrence: 'semantic' });
  });

  it('uses an explicit timeline position even when the frame index is unchanged', () => {
    const cursor = {
      frameIndex: 1,
      sourceFrameIndex: 1,
      movieTimeMs: 2600,
    };
    const getCursorAtMovieTime = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      treeList: trees,
      frameIndex: 1,
      timeline: createTimeline({ cursorAt: getCursorAtMovieTime }),
    });

    useAppStore.getState().goToPosition(1, 'forward', { movieTimeMs: 2600 });

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.frameIndex).toBe(1);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(2600);
    expect(getCursorAtMovieTime).toHaveBeenCalledWith(2600);
  });

  it('seeks the whole semantic position to a movie time', () => {
    const cursor = { frameIndex: 1, movieTimeMs: 2600 };
    const getCursorAtMovieTime = vi.fn(() => cursor);
    useAppStore.setState({
      treeList: trees,
      timeline: createTimeline({ cursorAt: getCursorAtMovieTime }),
    });

    useAppStore.getState().seek(2600);

    expect(getCursorAtMovieTime).toHaveBeenCalledWith(2600);
    expect(useAppStore.getState().frameIndex).toBe(1);
    expect(useAppStore.getState().timelineCursor).toBe(cursor);
  });

  it('captures the exact semantic movie position when pausing inside a hold', () => {
    vi.spyOn(performance, 'now').mockReturnValue(10_000);
    const cursor = {
      frameIndex: 7,
      sourceFrameIndex: 7,
      movieTimeMs: 9000,
    };
    const getCursorAtMovieTime = vi.fn(() => cursor);

    useAppStore.setState({
      playing: true,
      animationStartTime: 1000,
      animationSpeed: 1,
      treeList: Array.from({ length: 13 }, (_, index) => ({ id: index })),
      frameIndex: 7,
      timeline: createTimeline({ cursorAt: getCursorAtMovieTime }),
    });

    useAppStore.getState().stop();

    const state = useAppStore.getState();
    expect(state.playing).toBe(false);
    expect(state.animationStartTime).toBe(null);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(9000);
    expect(getCursorAtMovieTime).toHaveBeenCalledWith(9000);
  });

  it('resumes from a final input-tree hold that has not reached movie end', () => {
    vi.spyOn(performance, 'now').mockReturnValue(20_000);
    const cursor = {
      frameIndex: 12,
      sourceFrameIndex: 12,
      movieTimeMs: 16_000,
    };
    const getCursorAtMovieTime = vi.fn(() => cursor);

    useAppStore.setState({
      playing: false,
      timelineCursor: cursor,
      animationStartTime: null,
      animationSpeed: 1,
      treeList: Array.from({ length: 13 }, (_, index) => ({ id: index })),
      frameIndex: 12,
      timeline: createTimeline({ cursorAt: getCursorAtMovieTime }),
    });

    useAppStore.getState().play();

    const state = useAppStore.getState();
    expect(state.playing).toBe(true);
    expect(state.frameIndex).toBe(12);
    expect(state.timelineCursor).toBe(cursor);
    expect(state.timelineCursor.movieTimeMs).toBe(16_000);
    expect(state.animationStartTime).toBe(4000);
    expect(getCursorAtMovieTime).toHaveBeenCalledWith(16_000);
  });

  describe('jumping to an input tree', () => {
    const movie = smallExampleMovieData;
    const timeline = buildTimeline(movie);
    const inputFrames = movie.frames
      .filter((frame) => frame.frame_type === 'input_tree')
      .map((frame) => frame.frame_index);
    const startAt = (frameIndex) => {
      useAppStore.setState({
        treeList: movie.frames.map((frame) => ({ id: frame.frame_index })),
        timelineFrames: movie.frames,
        timeline,
        frameIndex,
        timelineCursor: timeline.cursorForFrame(frameIndex),
      });
      return useAppStore.getState();
    };
    const shownNow = () => {
      const { frameIndex, timelineCursor } = useAppStore.getState();
      return [frameIndex, describeCursor(timeline, timelineCursor).text];
    };

    it('lands on the input tree hold when going to the previous input tree', () => {
      for (let tree = 1; tree < inputFrames.length; tree += 1) {
        startAt(inputFrames[tree]).goToPreviousInputTree();

        expect(shownNow()).toEqual([inputFrames[tree - 1], `Input tree ${tree}`]);
      }
    });

    it('lands on the input tree hold when going to the next input tree', () => {
      for (let tree = 0; tree < inputFrames.length - 1; tree += 1) {
        startAt(inputFrames[tree]).goToNextInputTree();

        expect(shownNow()).toEqual([inputFrames[tree + 1], `Input tree ${tree + 2}`]);
      }
    });

    it('lands on the input tree hold when its segment is clicked or reached with Home and End', () => {
      const segments = timeline.segments.filter((segment) => segment.isInputTreeSegment);
      segments.forEach((segment, tree) => {
        const movieTimeMs = (segment.start + segment.end) / 2;
        startAt(0).goToPosition(segment.firstFrame, 'jump', { movieTimeMs });

        expect(shownNow()).toEqual([segment.firstFrame, `Input tree ${tree + 1}`]);
      });
    });

    it('lands on the input tree hold when a backward step reaches one', () => {
      for (let tree = 0; tree < inputFrames.length - 1; tree += 1) {
        startAt(inputFrames[tree] + 1).backward();

        expect(shownNow()).toEqual([inputFrames[tree], `Input tree ${tree + 1}`]);
      }
    });
  });
});
