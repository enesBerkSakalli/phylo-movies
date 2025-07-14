import * as THREE from "https://esm.sh/three@0.152.2";
import { UIComponents } from "./UIComponents.js";

/**
 * @class InteractionManager
 * Manages user interactions with a 3D scatter plot, including raycasting for object picking,
 * handling hover effects, point selection, connection creation between points,
 * and managing the state related to these interactions.
 * It is designed to be instantiated by a class managing the overall scatter plot visualization (e.g., ScatterPlotVisualizer).
 */
class InteractionManager {
  /**
   * Initializes the InteractionManager.
   * @param {THREE.Scene} scene - The THREE.js scene object.
   * @param {THREE.PerspectiveCamera} camera - The THREE.js camera object.
   * @param {THREE.Points} points - The THREE.Points mesh representing all data points in the plot.
   * @param {THREE.BufferGeometry} geometry - The geometry associated with the `points` mesh, allowing manipulation of attributes like color and size.
   * @param {Object} settings - An object containing visualization settings, such as colors and point sizes.
   *   Expected properties: `pointSize` (number), `selectedColor` (hex number), `connectionColor` (hex number).
   * @param {THREE.Mesh} selectionMarker - A THREE.Mesh object used to visually mark the first selected point.
   * @param {HTMLElement} compareButton - The DOM element of a button used to trigger comparisons (visibility managed by this class).
   * @param {Array<number>} treeIndices - An array mapping the internal buffer geometry index of a point to its original data index
   *                                    (e.g., an index in the main `treeList` from which the plot was generated).
   * @param {Float32Array} pointPositions - A flat Float32Array storing the x, y, z coordinates of all points in the plot.
   */
  constructor(scene, camera, points, geometry, settings, selectionMarker, compareButton, treeIndices, pointPositions) {
    /** @property {THREE.Scene} scene - The main THREE.js scene where objects are rendered. */
    this.scene = scene;
    /** @property {THREE.PerspectiveCamera} camera - The camera used for viewing the scene and for raycasting. */
    this.camera = camera;
    /** @property {THREE.Points} points - The THREE.Points object representing all data points in the scatter plot. */
    this.points = points;
    /** @property {THREE.BufferGeometry} geometry - The geometry of the `points` object, used to access and modify point attributes like color and size. */
    this.geometry = geometry;
    /** @property {Object} settings - Configuration settings for visual aspects, like colors and sizes. */
    this.settings = settings;
    /** @property {THREE.Mesh} selectionMarker - A visual marker (typically a THREE.Mesh) to indicate the first selected point when creating a connection. */
    this.selectionMarker = selectionMarker;
    /** @property {HTMLElement} compareButton - The DOM element for a "Compare" button, whose visibility is controlled based on connection selection. */
    this.compareButton = compareButton;
    /** @property {Array<number>} treeIndices - Maps the index of a point in the `geometry` to its original index in the source data list. */
    this.treeIndices = treeIndices;
    /** @property {Float32Array} pointPositions - Flat array storing the (x,y,z) coordinates of each point in the `geometry`. */
    this.pointPositions = pointPositions;

    // Internal interaction state variables
    /**
     * Index of the currently hovered point in the geometry's attributes. Null if no point is hovered.
     * @type {number|null}
     * @private
     */
    this.hoveredPoint = null;
    /**
     * Information about the first point selected when forming a connection.
     * Null if no point is currently selected as the first point of a pair.
     * @type {{index: number, treeIndex: number, position: THREE.Vector3}|null}
     * @private
     */
    this.selectedPoint = null;
    /**
     * Information about the currently selected connection line. Null if no connection is selected.
     * @type {Object|null}
     * @private
     */
    this.selectedConnection = null;

    /**
     * Stores data for all connections made by the user.
     * Each object: `{ tree1: number, tree2: number, line: THREE.Line, id: string, hitArea: THREE.Mesh }`.
     * @type {Array<Object>}
     * @private
     */
    this.connections = [];
    /**
     * Stores all THREE.js objects (the visible THREE.Line and the invisible THREE.Mesh hit area)
     * that represent connections in the scene. Used for easy removal.
     * @type {Array<THREE.Object3D>}
     * @private
     */
    this.connectionLines = [];

    /**
     * THREE.Raycaster instance for mouse picking.
     * @type {THREE.Raycaster}
     * @private
     */
    this.raycaster = this._setupRaycaster();
    /**
     * Normalized mouse coordinates (x, y from -1 to 1) for raycasting.
     * @type {THREE.Vector2}
     * @private
     */
    this.mouse = new THREE.Vector2();
  }

  /**
   * Sets up and configures the THREE.Raycaster instance with appropriate thresholds for point and line picking.
   * @returns {THREE.Raycaster} The configured raycaster instance.
   * @private
   */
  _setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.1; // Easier selection of points
    raycaster.params.Line = { threshold: 0.2 }; // For connection selection
    return raycaster;
  }

  /**
   * Handles mouse move events over the visualization container.
   * It updates point sizes for hover effects, shows/hides tooltips, and changes the mouse cursor
   * based on whether a point or connection line is under the mouse.
   * @param {MouseEvent} event - The DOM mousemove event.
   * @param {HTMLElement} container - The HTML element that contains the visualization canvas.
   * @param {HTMLElement} tooltip - The HTML element used for displaying tooltips.
   */
  onMouseMove(event, container, tooltip) {
    const rect = container.getBoundingClientRect(); // Use container for rect, not renderer.domElement directly if renderer is full window
    this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.points);

    let newHoveredPointIndex = null;

    if (intersects.length > 0) {
      const intersectedPointGeomIndex = intersects[0].index;
      const treeOriginalIndex = this.treeIndices[intersectedPointGeomIndex];

      if (this.hoveredPoint !== intersectedPointGeomIndex) {
        if (this.hoveredPoint !== null) {
          this.geometry.attributes.size.array[this.hoveredPoint] = this.settings.pointSize;
        }
        this.hoveredPoint = intersectedPointGeomIndex;
        this.geometry.attributes.size.array[this.hoveredPoint] = this.settings.pointSize * 1.5;
        this.geometry.attributes.size.needsUpdate = true;

        UIComponents.showTooltip(tooltip, event, intersectedPointGeomIndex, treeOriginalIndex);
        container.style.cursor = "pointer";
      }
      newHoveredPointIndex = this.hoveredPoint; // Keep track of current hover
    } else {
      if (this.hoveredPoint !== null) {
        this.geometry.attributes.size.array[this.hoveredPoint] = this.settings.pointSize;
        this.geometry.attributes.size.needsUpdate = true;
        UIComponents.hideTooltip(tooltip);
        container.style.cursor = "default";
      }
      this.hoveredPoint = null;

      // Check for connection hover if no point is hovered
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const lineIntersects = this.raycaster.intersectObjects(
        this.connectionLines.filter(line => line.userData && line.userData.isHitArea),
        true
      );
      if (lineIntersects.length > 0) {
        container.style.cursor = "pointer";
      } else {
        container.style.cursor = "default";
      }
    }
    // The external hoveredPoint state in scatterPlot.js is no longer needed if this method directly updates geometry.
    // However, scatterPlot.js's handleClick used it. So, for now, we can return it.
    // Or handleClick can use this.hoveredPoint directly.
  }

  /**
   * Handles click events when a connection line is potentially targeted.
   * If a clickable hit area of a connection is intersected:
   * - If the connection was already selected, it's deselected (line style reverts to default).
   * - If a different connection was selected, that one is deselected and this new one is selected (highlighted).
   * - If no connection was selected, this one is selected.
   * Manages `this.selectedConnection` state and toggles the compare button's visibility.
   * @param {MouseEvent} event - The DOM click event.
   * @param {HTMLElement} container - The HTML element containing the visualization.
   * @returns {Object|null} The connection data object if a connection was newly selected. Returns `null` if a
   * connection was deselected or if no connection was clicked.
   */
  handleConnectionClick(event, container) {
    // Update mouse from event if needed, or assume onMouseMove has set this.mouse
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.params.Line = { threshold: 0.3 }; // More tolerant for lines

    const hitAreas = this.connectionLines.filter(line => line.userData && line.userData.isHitArea);
    const lineIntersects = this.raycaster.intersectObjects(hitAreas, true);

    if (lineIntersects.length > 0) {
      const hitObj = lineIntersects[0].object;
      const connectionId = hitObj.userData.connectionId;
      const connection = this.connections.find(c => c.id === connectionId);

      if (connection) {
        // A connection object associated with the hit area was found
        if (this.selectedConnection && this.selectedConnection.id === connectionId) {
          // This exact connection was already selected; deselect it.
          connection.line.material.color.set(0x00FFFF); // Revert to default cyan
          connection.line.material.opacity = 1.0;
          connection.line.material.linewidth = 5;       // Revert to default linewidth
          this.selectedConnection = null;
          if (this.compareButton) this.compareButton.style.display = "none";
          return null;
        } else {
          // Deselect previous connection if a different one was selected.
          if (this.selectedConnection) {
            const prevConn = this.connections.find(c => c.id === this.selectedConnection.id);
            if (prevConn && prevConn.line) {
              prevConn.line.material.color.set(0x00FFFF); // Revert to default cyan
              prevConn.line.material.opacity = 1.0;
              prevConn.line.material.linewidth = 5;       // Revert to default linewidth
            }
          }
          // Select the new connection and apply highlight styling.
          connection.line.material.color.set(0xff9800); // Orange highlight for selected connection
          connection.line.material.opacity = 1.0;
          connection.line.material.linewidth = 6;       // Make selected connection thicker
          this.selectedConnection = connection;
          if (this.compareButton) this.compareButton.style.display = "block";
          return connection;
        }
      }
    }
    // If no connection was hit, but a connection was previously selected, don't deselect it here.
    // Deselection of a connection should only happen by clicking it again or clicking another connection/point.
    // However, if a point is clicked next, that logic might clear this.
    return null; // No connection was newly selected or deselected by direct click
  }

  /**
   * Handles click events when a data point is potentially targeted.
   * This method manages the logic for selecting one or two points to create a connection.
   * - If no point is currently selected (`this.selectedPoint` is null):
   *   - The clicked point becomes the `selectedPoint`, is highlighted, and the `selectionMarker` is shown.
   *   - Any previously `selectedConnection` is deselected.
   * - If one point is already `selectedPoint`:
   *   - If the same point is clicked again, it's deselected.
   *   - If a different point is clicked, a connection is created between `selectedPoint` and the newly clicked point.
   *     The visual line and its hit area are added to the scene. The `selectedPoint` is then reset.
   *   - If a connection already exists between these two points, no new connection is made.
   * - If the click is not on any point, and a `selectedPoint` exists, it's deselected.
   * @param {MouseEvent} event - The DOM click event.
   * @param {HTMLElement} container - The HTML element containing the visualization.
   * @returns {Object} An object describing the outcome of the click, with properties like:
   *   - `pointSelected` (Object|null): Details of the point if it was the first selected for a connection.
   *   - `connectionMade` (Object|null): Details of the new connection if one was created.
   *   - `error` (string|null): Message if an error occurred (e.g., "Connection already exists.").
   *   - `deselected` (boolean|null): True if a point was deselected.
   */
  handlePointClick(event, container) {
    // It's assumed onMouseMove has updated this.hoveredPoint
    // Or, we can recalculate the intersection here if handleClick is standalone
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.points);

    const clickedGeomIndex = intersects.length > 0 ? intersects[0].index : null;

    if (clickedGeomIndex === null) {
        // If clicked outside a point, and a connection was selected, don't clear connection selection.
        // If a point was selected (first point of a pair), clear that.
        if (this.selectedPoint) {
            // Reset color of the previously selected point
            const defaultColor = new THREE.Color().setHSL(this.selectedPoint.index / this.treeIndices.length, 0.7, 0.5);
            this.geometry.attributes.color.array[this.selectedPoint.index * 3] = defaultColor.r;
            this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 1] = defaultColor.g;
            this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 2] = defaultColor.b;
            this.geometry.attributes.color.needsUpdate = true;
            this.selectionMarker.visible = false;
            this.selectedPoint = null;
        }
        return { pointSelected: null, connectionMade: null };
    }

    const treeOriginalIndex = this.treeIndices[clickedGeomIndex];
    const pointPosition = new THREE.Vector3(
      this.pointPositions[clickedGeomIndex * 3],
      this.pointPositions[clickedGeomIndex * 3 + 1],
      this.pointPositions[clickedGeomIndex * 3 + 2]
    );

    // If a connection was selected, clicking a point should deselect the connection
    if (this.selectedConnection) {
        const prevConn = this.connections.find(c => c.id === this.selectedConnection.id);
        if (prevConn && prevConn.line) { // Check if line exists
            // Revert previously selected connection to default non-selected style (cyan)
            prevConn.line.material.color.set(0x00FFFF);
            prevConn.line.material.opacity = 1.0;
            prevConn.line.material.linewidth = 5;
        }
        this.selectedConnection = null; // Clear any prior connection selection
        if (this.compareButton) this.compareButton.style.display = "none"; // Hide compare button
    }

    // Proceed with point selection/deselection logic
    if (!this.selectedPoint) {
      // This is the first point selected for a potential connection.
      this.selectedPoint = {
        index: clickedGeomIndex,
        treeIndex: treeOriginalIndex,
        position: pointPosition.clone(),
      };

      // Highlight the first selected point.
      const selColor = new THREE.Color(this.settings.selectedColor);
      this.geometry.attributes.color.array[clickedGeomIndex * 3] = selColor.r;
      this.geometry.attributes.color.array[clickedGeomIndex * 3 + 1] = selColor.g;
      this.geometry.attributes.color.array[clickedGeomIndex * 3 + 2] = selColor.b;
      this.geometry.attributes.color.needsUpdate = true;

      // Position and show the selection marker.
      this.selectionMarker.position.copy(pointPosition);
      this.selectionMarker.visible = true;
      return { pointSelected: { ...this.selectedPoint }, connectionMade: null };

    } else {
      // This is the second point selection; attempt to create a connection.
      if (this.selectedPoint.index !== clickedGeomIndex) { // Ensure it's not the same point clicked again
        const connectionId1 = `${this.selectedPoint.treeIndex}-${treeOriginalIndex}`;
        const connectionId2 = `${treeOriginalIndex}-${this.selectedPoint.treeIndex}`;
        const exists = this.connections.some(c => c.id === connectionId1 || c.id === connectionId2);

        if (exists) {
          // Connection already exists. Reset the first selection.
          const defaultColor = new THREE.Color().setHSL(this.selectedPoint.index / this.treeIndices.length, 0.7, 0.5); // Or use a predefined default color
          this.geometry.attributes.color.array[this.selectedPoint.index * 3] = defaultColor.r;
          this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 1] = defaultColor.g;
          this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 2] = defaultColor.b;
          this.geometry.attributes.color.needsUpdate = true;
          this.selectionMarker.visible = false;
          this.selectedPoint = null;
          return { pointSelected: null, connectionMade: null, error: "Connection already exists." };
        }

        // Create the visual line for the new connection with the default (cyan) style.
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x00FFFF,
          linewidth: 5,
          opacity: 1.0,
          transparent: false,
        });
        const lineGeom = new THREE.BufferGeometry().setFromPoints([this.selectedPoint.position, pointPosition]);
        const line = new THREE.Line(lineGeom, lineMaterial);
        this.scene.add(line);
        this.connectionLines.push(line);

        // Create an invisible, thicker hit area for easier click detection on the line.
        const path = new THREE.LineCurve3(this.selectedPoint.position, pointPosition);
        const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.2, 8, false); // Adjust radius for easier clicking
        const hitAreaMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
        const hitArea = new THREE.Mesh(tubeGeometry, hitAreaMaterial);
        hitArea.userData = { isHitArea: true, connectionId: connectionId1, tree1: this.selectedPoint.treeIndex, tree2: treeOriginalIndex };
        this.scene.add(hitArea);
        this.connectionLines.push(hitArea); // Also track hit areas for removal

        const newConnection = {
          tree1: this.selectedPoint.treeIndex,
          tree2: treeOriginalIndex,
          line: line,
          id: connectionId1,
          hitArea: hitArea
        };
        this.connections.push(newConnection);

        // Reset color of the first selected point
        const defaultColor = new THREE.Color().setHSL(this.selectedPoint.index / this.treeIndices.length, 0.7, 0.5);
        this.geometry.attributes.color.array[this.selectedPoint.index * 3] = defaultColor.r;
        this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 1] = defaultColor.g;
        this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 2] = defaultColor.b;
        this.geometry.attributes.color.needsUpdate = true;

        this.selectionMarker.visible = false;
        const oldSelectedPoint = this.selectedPoint; // Store before resetting
        this.selectedPoint = null;
        return { pointSelected: null, connectionMade: newConnection, firstPoint: oldSelectedPoint };
      } else {
        // Clicked the same point again - deselect it
        const defaultColor = new THREE.Color().setHSL(this.selectedPoint.index / this.treeIndices.length, 0.7, 0.5);
        this.geometry.attributes.color.array[this.selectedPoint.index * 3] = defaultColor.r;
        this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 1] = defaultColor.g;
        this.geometry.attributes.color.array[this.selectedPoint.index * 3 + 2] = defaultColor.b;
        this.geometry.attributes.color.needsUpdate = true;
        this.selectionMarker.visible = false;
        this.selectedPoint = null;
        return { pointSelected: null, connectionMade: null, deselected: true };
      }
    }
  }

  /**
   * Clears all visual connections from the scene and resets internal connection tracking state.
   * Disposes of associated THREE.js geometries and materials to free resources.
   */
  clearConnections() {
    this.connectionLines.forEach(lineOrHitArea => {
      this.scene.remove(lineOrHitArea);
      if (lineOrHitArea.geometry) lineOrHitArea.geometry.dispose();
      if (lineOrHitArea.material && typeof lineOrHitArea.material.dispose === 'function') {
        lineOrHitArea.material.dispose();
      }
    });
    this.connectionLines.length = 0; // Clear the array of THREE.js objects
    this.connections.length = 0; // Clear the array of connection data objects
    if (this.selectedConnection) this.selectedConnection = null; // Reset selected connection state
    if (this.compareButton) this.compareButton.style.display = "none"; // Hide compare button
  }

  /**
   * Retrieves information about the currently selected connection.
   * @returns {Object|null} The selected connection data object (containing tree indices, line object, etc.),
   * or `null` if no connection is currently selected.
   */
  getSelectedConnectionInfo() {
    return this.selectedConnection;
  }

  /**
   * Programmatically selects a connection given its ID.
   * This involves deselecting any previously selected connection, then highlighting the new one
   * and updating the compare button's visibility.
   * @param {string} connectionId - The unique ID of the connection to be selected.
   * @returns {boolean} `true` if the connection was found and selected, `false` otherwise.
   */
  selectConnectionById(connectionId) {
    const connection = this.connections.find(c => c.id === connectionId);
    if (connection) {
      // Deselect previous connection if any
      if (this.selectedConnection && this.selectedConnection.id !== connectionId) {
        const prevConn = this.connections.find(c => c.id === this.selectedConnection.id);
        if (prevConn && prevConn.line) { // Check if line exists
          // Reset previous to the new default style for non-selected lines
          prevConn.line.material.color.set(0x00FFFF); // Bright Cyan
          prevConn.line.material.opacity = 1.0;
          prevConn.line.material.linewidth = 5;
        }
      }

      // Select the new connection (highlight properties remain the same)
      if (connection.line) { // Check if line exists
          connection.line.material.color.set(0xff9800); // Orange highlight
          connection.line.material.opacity = 1.0;
          connection.line.material.linewidth = 6; // Selected line is slightly thicker
      }
      this.selectedConnection = connection;
      if (this.compareButton) this.compareButton.style.display = "block";
      return true;
    }
    return false;
  }
}

export { InteractionManager };