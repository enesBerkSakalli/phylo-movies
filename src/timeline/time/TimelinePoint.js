import { isKnownTimelineAxis } from './TimelineAxis.js';

export class TimelinePoint {
    static from(values = {}) {
        return new TimelinePoint(values);
    }

    constructor(values = {}) {
        this.values = Object.freeze({ ...values });
    }

    get(axisName) {
        return this.values[axisName];
    }

    has(axisName) {
        return Object.prototype.hasOwnProperty.call(this.values, axisName);
    }

    with(axisName, value) {
        return new TimelinePoint({
            ...this.values,
            [axisName]: value
        });
    }

    knownValues() {
        const entries = Object.entries(this.values)
            .filter(([axisName]) => isKnownTimelineAxis(axisName));
        return Object.fromEntries(entries);
    }

    toJSON() {
        return { ...this.values };
    }
}
