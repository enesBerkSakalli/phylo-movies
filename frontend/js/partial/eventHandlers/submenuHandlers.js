/**
 * Submenu toggle functionality
 */
export class SubmenuHandlers {
  /**
   * Toggle a submenu open/closed by id
   */
  static toggle(submenuId, toggleIconId) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;
    const container = submenu.closest('.submenu-container');
    if (!container) return;
    // Toggle data-collapsed attribute only
    const isCollapsed = container.getAttribute('data-collapsed') === 'true';
    container.setAttribute('data-collapsed', (!isCollapsed).toString());
    // Save toggle state to localStorage
    if (submenuId) {
      localStorage.setItem(`submenu-${submenuId}`, (!isCollapsed) ? "collapsed" : "expanded");
    }
  }

  /**
   * Initialize all toggleable elements on the page
   */
  static initializeAll() {
    const submenuContainers = document.querySelectorAll('.submenu-container');
    submenuContainers.forEach(container => {
      if (container.getAttribute('data-initialized') === 'true') return;
      const submenu = container.querySelector('.submenu');
      const submenuHeader = container.querySelector('.submenu-header');
      const toggleIcon = container.querySelector('.toggle-icon');
      if (submenu && submenuHeader && toggleIcon) {
        // Set unique IDs if not already set
        if (!submenu.id) {
          submenu.id = `submenu-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!toggleIcon.id) {
          toggleIcon.id = `toggle-${submenu.id}`;
        }
        // Load saved state from localStorage
        const savedState = localStorage.getItem(`submenu-${submenu.id}`);
        const shouldCollapse = savedState === "collapsed";
        container.setAttribute('data-collapsed', shouldCollapse ? 'true' : 'false');
        // Add click handler
        submenuHeader.onclick = () => SubmenuHandlers.toggle(submenu.id, toggleIcon.id);
        // Add keyboard support
        submenuHeader.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            SubmenuHandlers.toggle(submenu.id, toggleIcon.id);
          }
        };
        // Make header focusable for accessibility
        if (!submenuHeader.getAttribute('tabindex')) {
          submenuHeader.setAttribute('tabindex', '0');
        }
        container.setAttribute('data-initialized', 'true');
      }
    });
    console.log(`Initialized ${submenuContainers.length} submenu containers`);
  }

  /**
   * Create a submenu container with proper structure
   */
  static createSubmenu(title, content, iconClass = 'fa-cog', collapsed = false) {
    const container = document.createElement('div');
    container.className = 'submenu-container';
    container.setAttribute('data-collapsed', collapsed.toString());
    const submenuId = `submenu-${Math.random().toString(36).substr(2, 9)}`;
    const toggleId = `toggle-${submenuId}`;
    container.innerHTML = `
      <div class="submenu-header" tabindex="0">
        <div class="submenu-title">
          <i class="submenu-icon fa ${iconClass}"></i>
          <span>${title}</span>
        </div>
        <i class="toggle-icon fa fa-chevron-down" id="${toggleId}"></i>
      </div>
      <div class="submenu" id="${submenuId}">
        ${content}
      </div>
    `;
    return container;
  }
}

// Make toggle function available globally for backwards compatibility
window.toggleSubmenu = SubmenuHandlers.toggle;
