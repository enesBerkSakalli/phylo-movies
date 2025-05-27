/**
 * Dynamic button styles for event handlers
 */
export class ButtonStyles {
  static addScatterplotButtonStyles() {
    if (document.getElementById('scatterplot-button-styles')) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'scatterplot-button-styles';
    styleEl.textContent = `
      .nav-action-container {
        margin: 10px 0;
      }
      
      .nav-action-button {
        width: 100%;
        padding: 8px 12px;
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        text-align: left;
        font-size: 14px;
        display: flex;
        align-items: center;
        transition: background-color 0.2s;
      }
      
      .nav-action-button:hover {
        background-color: #356ac3;
      }
      
      .nav-action-button i {
        margin-right: 8px;
      }
    `;
    document.head.appendChild(styleEl);
  }

  static init() {
    // Add styles when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.addScatterplotButtonStyles);
    } else {
      this.addScatterplotButtonStyles();
    }
  }
}

// Initialize styles
ButtonStyles.init();
