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

        // Define event handlers
        const clickHandler = () => SubmenuHandlers.toggle(submenu.id, toggleIcon.id);
        const keydownHandler = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            SubmenuHandlers.toggle(submenu.id, toggleIcon.id);
          }
        };

        // Add event listeners
        submenuHeader.addEventListener('click', clickHandler);
        submenuHeader.addEventListener('keydown', keydownHandler);

        // Mark that listeners are attached
        submenuHeader.setAttribute('data-event-listeners-attached', 'true');

        // Store handlers for removal if needed (though for this static approach, querying by attribute is simpler for cleanup)
        // submenuHeader._clickHandler = clickHandler;
        // submenuHeader._keydownHandler = keydownHandler;

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
   * Clean up all initialized submenu event handlers
   */
  static cleanupAll() {
    const initializedHeaders = document.querySelectorAll('.submenu-header[data-event-listeners-attached="true"]');
    initializedHeaders.forEach(submenuHeader => {
      // To remove specific listeners, we would need to store them as done above (e.g., submenuHeader._clickHandler)
      // For this implementation, we assume the handlers defined in initializeAll are the ones to remove.
      // This is a simplification. A more robust solution would involve storing and retrieving the exact handler functions.

      // Re-creating anonymous functions for removal is generally not reliable as they are different function objects.
      // However, if we are sure about the structure and don't have the original handlers stored,
      // we might try to remove them by finding them if they were named and attached directly.
      // Given the current setup, it's best to rely on having stored the handlers or re-think how they are added if specific removal is key without storage.

      // For this task, the prompt implies that we might iterate and remove.
      // The most straightforward way if handlers are not stored is to replace the element or its event handling logic.
      // However, the request was to "remove the attached event listeners".
      // Without storing the handlers (e.g., on the element or in a map), we cannot reliably call removeEventListener for anonymous functions.

      // Let's assume for this step, the goal is to demonstrate the cleanup structure.
      // A more robust implementation would require storing handler references during `initializeAll`.
      // For now, we'll clear the marker and log. The actual removal would be flawed without handler references.

      // If we had stored them, it would be:
      // if (submenuHeader._clickHandler) submenuHeader.removeEventListener('click', submenuHeader._clickHandler);
      // if (submenuHeader._keydownHandler) submenuHeader.removeEventListener('keydown', submenuHeader._keydownHandler);
      // delete submenuHeader._clickHandler;
      // delete submenuHeader._keydownHandler;

      // Since the prompt mentioned "iterate through initialized submenu headers and remove the attached event listeners"
      // and suggested a marker attribute, this implies a limitation of not having direct references.
      // The most common way to handle this without direct references (and without cloning/replacing the node)
      // is to accept that you can't remove specific anonymous listeners directly.
      // So, the cleanup will focus on the marker and a conceptual "removal".
      // For a truly effective removal, handler references are needed.

      // Given the constraints and typical approaches, simply removing the marker
      // and acknowledging the limitation for anonymous functions is the path here.
      // The prompt's phrasing "remove the attached event listeners" with the marker suggestion
      // might simplify the expectation for this step.

      // Let's proceed with a conceptual cleanup.
      // To make this actually work, the clickHandler and keydownHandler would need to be stored, perhaps on the element itself,
      // or in a static map within the class, mapping element to its handlers.

      // Workaround for the demo: replace the element with a clone to remove listeners. This is heavy-handed but effective.
      const newHeader = submenuHeader.cloneNode(true);
      submenuHeader.parentNode.replaceChild(newHeader, submenuHeader);
      newHeader.removeAttribute('data-event-listeners-attached'); // Clean the marker on the new element

      // Or, if we want to avoid DOM manipulation and assume the listeners were NAMED and BOUND correctly (which they are not here for removal)
      // submenuHeader.removeEventListener('click', WHAT_WAS_THE_HANDLER?);
      // submenuHeader.removeEventListener('keydown', WHAT_WAS_THE_HANDLER?);
      // submenuHeader.removeAttribute('data-event-listeners-attached');
    });

    // If we didn't use cloneNode, and had stored handlers:
    // initializedHeaders.forEach(header => {
    //   if (header._clickHandler) header.removeEventListener('click', header._clickHandler);
    //   if (header._keydownHandler) header.removeEventListener('keydown', header._keydownHandler);
    //   header.removeAttribute('data-event-listeners-attached');
    //   delete header._clickHandler;
    //   delete header._keydownHandler;
    // });


    console.log(`Cleaned up event listeners for ${initializedHeaders.length} submenu headers.`);
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
