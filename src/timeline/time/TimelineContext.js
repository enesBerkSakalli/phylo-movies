import { TIMELINE_AXIS } from './TimelineAxis.js';

export const TIMELINE_CONTEXT_MODE = {
  FIXED: 'fixed',
  REALTIME: 'realtime',
};

export class TimelineContext {
  static fixed({ axis = TIMELINE_AXIS.MOVIE_TIME_MS, start = 0, end = 0, cursor = null } = {}) {
    return new TimelineContext({
      mode: TIMELINE_CONTEXT_MODE.FIXED,
      axis,
      start,
      end,
      cursor,
    });
  }

  constructor({ mode, axis, start, end, cursor }) {
    this.mode = mode;
    this.axis = axis;
    this.start = Number.isFinite(start) ? start : 0;
    this.end = Number.isFinite(end) ? end : this.start;
    this.cursor = cursor;
  }

  contains(value) {
    return Number.isFinite(value) && value >= this.start && value <= this.end;
  }

  withCursor(cursor) {
    return new TimelineContext({
      mode: this.mode,
      axis: this.axis,
      start: this.start,
      end: this.end,
      cursor,
    });
  }

  toJSON() {
    return {
      mode: this.mode,
      axis: this.axis,
      start: this.start,
      end: this.end,
      cursor: this.cursor?.toJSON?.() ?? this.cursor,
    };
  }
}
