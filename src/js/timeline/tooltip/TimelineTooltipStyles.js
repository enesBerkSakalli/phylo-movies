export class TimelineTooltipStyles {
  static STYLE_ID = 'timeline-tooltip-styles';
  static getStyles() {
    return `
      .timeline-tooltip .tt-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-on-surface);
        font-weight: var(--md-sys-typescale-title-small-weight, 600);
        font-size: var(--md-sys-typescale-title-small-size, 1rem);
        margin-bottom: 8px;
        padding-bottom: 4px;
      }
      .timeline-tooltip .tt-sub {
        color: var(--md-sys-color-on-surface-variant);
        font-size: var(--md-sys-typescale-label-medium-size, 0.85rem);
        margin-bottom: 4px;
      }
      .timeline-tooltip .tt-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-bottom: 4px;
      }
      .timeline-tooltip .tt-label {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.85rem;
        min-width: 90px;
        font-weight: 500;
      }
      .timeline-tooltip .tt-value {
        color: var(--md-sys-color-on-surface);
        font-weight: 500;
        line-height: 1.4;
        word-break: break-word;
        max-width: 280px;
      }
      .timeline-tooltip .tt-value code {
        background: var(--md-sys-color-surface-variant, rgba(0, 0, 0, 0.05));
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.9em;
        font-family: 'Roboto Mono', monospace;
      }
      .timeline-tooltip .tt-divider {
        height: 1px;
        background: var(--md-sys-color-outline-variant);
        margin: 8px 0;
      }
      .timeline-tooltip .tt-hint {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.8rem;
        opacity: 0.8;
        font-style: italic;
        margin-top: 6px;
      }
      .timeline-tooltip .material-icons {
        font-size: 20px;
        color: var(--md-sys-color-primary);
      }

      /* Enhanced split display styling */
      .timeline-tooltip .split-names {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }

      .timeline-tooltip .split-chip {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        background: var(--md-sys-color-primary-container, rgba(103, 80, 164, 0.1));
        color: var(--md-sys-color-on-primary-container, #5e35b1);
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
        white-space: nowrap;
      }

      /* Improve readability with better contrast */
      .timeline-tooltip {
        border: 1px solid var(--md-sys-color-outline-variant, rgba(0, 0, 0, 0.1));
      }
    `;
  }
  static injectStyles() {
    if (document.getElementById(this.STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = this.STYLE_ID;
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }
  static getElementStyles() {
    return `
      position: fixed;
      pointer-events: none;
      display: none;
      z-index: 10000;
      min-width: 280px;
      max-width: 450px;
      max-height: 60vh;
      overflow-y: auto;
      padding: 12px 14px;
      border-radius: var(--md-sys-shape-corner-medium, 12px);
      background: var(--md-sys-color-surface-container, #fff);
      box-shadow: var(--md-sys-elevation-level3, 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1));
      color: var(--md-sys-color-on-surface);
      font-family: var(--md-sys-typescale-body-medium-font, Roboto, sans-serif);
      font-size: var(--md-sys-typescale-body-large-size, 1rem);
      line-height: var(--md-sys-typescale-body-large-line-height, 1.5);
      backdrop-filter: blur(8px);
    `;
  }
  static removeStyles() {
    const styleElement = document.getElementById(this.STYLE_ID);
    if (styleElement) {
      styleElement.remove();
    }
  }
}
