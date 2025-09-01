/**
 * Timeline Tooltip Styles Module
 * Manages CSS styles for timeline tooltips
 */

export class TimelineTooltipStyles {
  static STYLE_ID = 'timeline-tooltip-styles';

  /**
   * Get the CSS styles for timeline tooltips
   * @returns {string} CSS styles as string
   */
  static getStyles() {
    return `
      .timeline-tooltip .tt-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-on-surface);
        font-weight: var(--md-sys-typescale-title-small-weight, 600);
        font-size: var(--md-sys-typescale-title-small-size, 1rem);
        margin-bottom: 6px;
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
      }
      .timeline-tooltip .tt-label {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.85rem;
        min-width: 90px;
      }
      .timeline-tooltip .tt-value {
        color: var(--md-sys-color-on-surface);
        font-weight: 500;
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
      }
      .timeline-tooltip .material-icons {
        font-size: 18px;
        color: var(--md-sys-color-primary);
      }
    `;
  }

  /**
   * Inject styles into the document head if not already present
   */
  static injectStyles() {
    if (document.getElementById(this.STYLE_ID)) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = this.STYLE_ID;
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  /**
   * Get the default inline styles for the tooltip element
   * @returns {string} CSS styles for the tooltip element
   */
  static getElementStyles() {
    return `
      position: fixed;
      pointer-events: none;
      display: none;
      z-index: 10000;
      min-width: 260px;
      max-width: 420px;
      max-height: 60vh;
      overflow-y: auto;
      padding: 10px 12px;
      border-radius: var(--md-sys-shape-corner-medium, 12px);
      background: var(--md-sys-color-surface-container, #fff);
      box-shadow: var(--md-sys-elevation-level2, 0 2px 6px rgba(0,0,0,0.15));
      color: var(--md-sys-color-on-surface);
      font-family: var(--md-sys-typescale-body-medium-font, Roboto, sans-serif);
      font-size: var(--md-sys-typescale-body-large-size, 1rem);
      line-height: var(--md-sys-typescale-body-large-line-height, 1.5);
    `;
  }

  /**
   * Remove styles from document head
   */
  static removeStyles() {
    const styleElement = document.getElementById(this.STYLE_ID);
    if (styleElement) {
      styleElement.remove();
    }
  }
}
