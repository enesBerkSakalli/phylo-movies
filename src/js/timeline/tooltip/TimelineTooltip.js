import { TimelineTooltipStyles } from './TimelineTooltipStyles.js';

export class TimelineTooltip {
  constructor() {
    this.el = null;
    this.visible = false;
  }

  _ensureCreated() {
    if (this.el) return;
    TimelineTooltipStyles.injectStyles();

    const el = document.createElement('div');
    el.className = 'timeline-tooltip md-elevation-2';
    el.style.cssText = TimelineTooltipStyles.getElementStyles();
    document.body.appendChild(el);
    this.el = el;
  }

  show(html, x, y) {
    this._ensureCreated();
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    this.visible = true;
    this.updatePosition(x, y);
  }

  hide() {
    if (!this.el) return;
    this.el.style.display = 'none';
    this.visible = false;
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.el = null;
  }

  updatePosition(x, y) {
    if (!this.visible || !this.el) return;
    const padding = 12;
    let left = x + 12;
    let top = y + 12;
    const rect = this.el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + rect.width + padding > vw) left = vw - rect.width - padding;
    if (top + rect.height + padding > vh) top = vh - rect.height - padding;
    if (left < padding) left = padding;
    if (top < padding) top = padding;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  destroy() {
    this.hide();
    this.el = null;
    this.visible = false;
  }
}
