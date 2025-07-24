import * as THREE from "https://esm.sh/three@0.152.2";

/**
 * @module UIComponents
 * UI components for the scatter plot visualization
 */

const UIComponents = {
  /**
   * Create an info panel with controls
   * @param {HTMLElement} container - Container to add the panel to
   * @param {number} numPoints - Number of points in the visualization
   * @param {Function} onPointSizeChange - Callback for point size changes
   * @returns {HTMLElement} The created info panel
   */
  createInfoCard(container, numPoints, onPointSizeChange) {
    const card = document.createElement("div");
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", "Scatter plot controls and legend");
    card.classList.add("card");
    card.style.position = "absolute";
    card.style.bottom = "10px";
    card.style.left = "10px";
    card.style.zIndex = "1001";

    // Create a toggle button to show/hide info
    const toggleButton = document.createElement("button");
    toggleButton.textContent = "Hide Info";
    toggleButton.setAttribute("aria-expanded", "true");
    toggleButton.style.marginBottom = "8px";
    toggleButton.style.display = "block";
    toggleButton.style.width = "100%";
    toggleButton.style.background = "#eee";
    toggleButton.style.border = "1px solid #bbb";
    toggleButton.style.borderRadius = "3px";
    toggleButton.style.cursor = "pointer";
    card.appendChild(toggleButton);

    // Create content div
    const content = document.createElement("div");
    content.innerHTML = `
      <div><strong>Full Trees:</strong> ${numPoints}</div>
      <div><strong>Controls:</strong></div>
      <div>• Click to select trees</div>
      <div>• Click two trees to connect</div>
      <div>• Click on connection to select it</div>
      <div>• Drag to rotate view</div>
      <div>• Scroll to zoom</div>
      <div style="margin-top:10px;"><label for="point-size-slider"><strong>Point Size:</strong></label>
        <input id="point-size-slider" type="range" min="0.05" max="0.5" step="0.01" value="0.15" style="width:100px; vertical-align:middle;">
        <span id="point-size-value">0.15</span>
      </div>
      <div id="color-legend" style="margin-top:10px;"></div>
      <button id="compare-connection-btn" style="margin-top:10px; padding:5px 10px; background-color:#4CAF50; color:white; border:none; border-radius:3px; cursor:pointer; display:none;">
        Compare Selected Connection
      </button>
    `;
    card.appendChild(content);

    // Add toggle functionality
    toggleButton.addEventListener("click", () => {
      if (content.style.display === "none") {
        content.style.display = "block";
        toggleButton.textContent = "Hide Info";
        toggleButton.setAttribute("aria-expanded", "true");
      } else {
        content.style.display = "none";
        toggleButton.textContent = "Show Info";
        toggleButton.setAttribute("aria-expanded", "false");
      }
    });

    // Add point size slider functionality
    const slider = content.querySelector("#point-size-slider");
    const sizeValue = content.querySelector("#point-size-value");
    
    slider.addEventListener("input", (event) => {
      sizeValue.textContent = slider.value;
      if (onPointSizeChange) {
        onPointSizeChange(parseFloat(slider.value));
      }
    });

    container.appendChild(card);
    return card;
  },

  /**
   * Create tooltip for hover information
   * @param {HTMLElement} container - Container to add the tooltip to
   * @returns {HTMLElement} The created tooltip
   */
  createTooltip(container) {
    const tooltip = document.createElement("div");
    tooltip.setAttribute("role", "tooltip");
    tooltip.style.position = "absolute";
    tooltip.style.padding = "8px";
    tooltip.style.backgroundColor = "white";
    tooltip.style.border = "1px solid #ccc";
    tooltip.style.borderRadius = "4px";
    tooltip.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    tooltip.style.fontSize = "12px";
    tooltip.style.fontFamily = "Arial, sans-serif";
    tooltip.style.pointerEvents = "none";
    tooltip.style.display = "none";
    tooltip.style.zIndex = "1000";
    
    container.appendChild(tooltip);
    return tooltip;
  },

  /**
   * Show tooltip with tree information
   * @param {HTMLElement} tooltip - The tooltip element
   * @param {Event} event - Mouse event
   * @param {number} index - Index of the point
   * @param {number} treeIndex - Index of the tree
   */
  showTooltip(tooltip, event, index, treeIndex) {
    tooltip.innerHTML = `<strong>Tree ${treeIndex}</strong><br>Full Tree ${
      Math.floor(treeIndex / 5) + 1
    }`;
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
    tooltip.style.display = "block";
  },

  /**
   * Hide the tooltip
   * @param {HTMLElement} tooltip - The tooltip element
   */
  hideTooltip(tooltip) {
    tooltip.style.display = "none";
  },

  /**
   * Create a marker to show selected points
   * @param {number} color - Color for the marker
   * @returns {THREE.Group} The created marker
   */
  createSelectionMarker(color) {
    const group = new THREE.Group();
    
    // Ring around selected point
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32),
      new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    
    ring.rotation.x = Math.PI / 2; // Lay flat in XZ plane
    group.add(ring);
    
    return group;
  }
};

export { UIComponents };
