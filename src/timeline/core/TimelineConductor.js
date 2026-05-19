export class TimelineConductor {
    static fixed(dataset) {
        return new TimelineConductor({ dataset, mode: 'fixed' });
    }

    constructor({ dataset, mode }) {
        this.dataset = dataset;
        this.mode = mode;
        this.cursor = null;
    }

    setMovieTimeMs(movieTimeMs, options = {}) {
        return this.setCursor(this.dataset?.getCursorAtMovieTime(movieTimeMs, options) ?? null);
    }

    setTimelineProgress(timelineProgress, options = {}) {
        return this.setCursor(
            this.dataset?.getCursorAtTimelineProgress(timelineProgress, options) ?? null
        );
    }

    setFrameIndex(frameIndex, options = {}) {
        return this.setCursor(this.dataset?.getCursorForFrame(frameIndex, options) ?? null);
    }

    setCursor(cursor) {
        this.cursor = cursor;
        return this.cursor;
    }
}
