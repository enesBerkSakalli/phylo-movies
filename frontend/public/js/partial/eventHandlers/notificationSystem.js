/**
 * Notification system for user feedback
 */
export class NotificationSystem {
  constructor() {
    this.addStyles();
  }

  /**
   * Show notification to user
   */
  show(message, type = "info", duration = 5000) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fa fa-${this.getIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add close button functionality
    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.addEventListener("click", () => this.remove(notification));

    document.body.appendChild(notification);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.remove(notification), duration);
    }

    return notification;
  }

  /**
   * Remove notification
   */
  remove(notification) {
    if (notification && notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease-in forwards";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  /**
   * Get icon for notification type
   */
  getIcon(type) {
    const icons = {
      error: "exclamation-triangle",
      warning: "exclamation-circle",
      success: "check-circle",
      info: "info-circle",
    };
    return icons[type] || icons.info;
  }

  /**
   * Add notification styles
   */
  addStyles() {
    if (document.getElementById("notification-styles")) return;

    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
      }
      
      .notification.error { border-left: 4px solid #e53935; }
      .notification.warning { border-left: 4px solid #ff9800; }
      .notification.success { border-left: 4px solid #4caf50; }
      .notification.info { border-left: 4px solid #2196f3; }
      
      .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .notification-content i {
        color: #666;
        flex-shrink: 0;
      }
      
      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
        margin-left: auto;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .notification-close:hover {
        color: #333;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Create singleton instance
export const notifications = new NotificationSystem();
