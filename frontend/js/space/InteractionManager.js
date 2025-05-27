import * as THREE from "https://esm.sh/three@0.152.2";
import { UIComponents } from "./UIComponents.js";

/**
 * @module InteractionManager
 * Manages user interactions with the scatter plot
 */
const InteractionManager = {
  /**
   * Set up raycasting for point interactions
   * @returns {THREE.Raycaster} Configured raycaster
   */
  setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    // Increase the Points threshold for easier selection of points
    raycaster.params.Points.threshold = 0.1;
    // Add Line threshold for better connection selection (this is critical)
    raycaster.params.Line = { threshold: 0.2 };
    return raycaster;
  },

  /**
   * Handle mouse move for hover effects
   * @param {Event} event - Mouse event
   * @param {Object} params - Parameters including relevant objects and state
   */
  onMouseMove(
    event,
    {
      container,
      renderer,
      camera,
      raycaster,
      points,
      indices,
      hoveredPoint,
      settings,
      sizes,
      geometry,
      tooltip,
      connectionLines,
    }
  ) {
    // Update mouse coordinates for raycasting
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Raycast to find intersections with points
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(points);

    let newHoveredPoint = null;

    if (intersects.length > 0) {
      const index = intersects[0].index;
      const treeIndex = indices[index];

      // Skip if already hovering this point
      if (hoveredPoint === index) return hoveredPoint;

      // Reset previous hover state if exists
      if (hoveredPoint !== null) {
        sizes[hoveredPoint] = settings.pointSize;
      }

      // Set new hover state
      newHoveredPoint = index;
      sizes[newHoveredPoint] = settings.pointSize * 1.5;
      geometry.attributes.size.needsUpdate = true;

      // Show tooltip
      UIComponents.showTooltip(tooltip, event, index, treeIndex);

      // Change cursor
      container.style.cursor = "pointer";
    } else {
      // If not hovering over points, check for connections
      raycaster.setFromCamera(mouse, camera);
      const lineIntersects = raycaster.intersectObjects(
        connectionLines.filter(
          (line) => line.userData && line.userData.isHitArea
        ),
        true
      );

      if (lineIntersects.length > 0) {
        container.style.cursor = "pointer"; // Change cursor to indicate clickable connection
      } else if (hoveredPoint === null) {
        container.style.cursor = "default";
        UIComponents.hideTooltip(tooltip);
      }
    }

    return newHoveredPoint;
  },

  /**
   * Handle clicking on connections
   * @param {Object} params - Parameters including relevant objects and state
   * @returns {Object|null} The selected connection object or null
   */
  handleConnectionClick({
    mouse,
    raycaster,
    camera,
    connectionLines,
    connections,
    selectedConnection,
    settings,
    compareButton,
  }) {
    // Check if we clicked on a connection
    raycaster.setFromCamera(mouse, camera);

    // Debug point to show where ray is cast
    console.log("Checking for connection hit at mouse position:", mouse);

    // Find all hit areas in the scene
    const hitAreas = connectionLines.filter(
      (line) => line.userData && line.userData.isHitArea
    );
    console.log(`Found ${hitAreas.length} hit areas to check`);

    // Use a more tolerant threshold for line detection
    raycaster.params.Line = { threshold: 0.3 };
    const lineIntersects = raycaster.intersectObjects(hitAreas, true);

    console.log("Connection intersections:", lineIntersects.length);

    if (lineIntersects.length > 0) {
      const hitObj = lineIntersects[0].object;
      console.log("Hit connection object:", hitObj);
      const connectionId = hitObj.userData.connectionId;
      console.log("Connection ID:", connectionId);

      // Find the connection data
      const connection = connections.find((c) => c.id === connectionId);

      if (connection) {
        console.log("Found connection data:", connection);
        // If this connection was already selected, deselect it
        if (selectedConnection && selectedConnection.id === connectionId) {
          // Reset color to default
          connection.line.material.color.set(settings.connectionColor);
          connection.line.material.opacity = 0.7;
          connection.line.material.linewidth = 2;
          selectedConnection = null;
          compareButton.style.display = "none";
          return null; // Deselect
        } else {
          // Deselect previous connection if any
          if (selectedConnection) {
            const prevConn = connections.find(
              (c) => c.id === selectedConnection.id
            );
            if (prevConn) {
              prevConn.line.material.color.set(settings.connectionColor);
              prevConn.line.material.opacity = 0.7;
              prevConn.line.material.linewidth = 2;
            }
          }

          // Select this connection
          connection.line.material.color.set(0xff9800); // Highlight color (orange)
          connection.line.material.opacity = 1.0;
          connection.line.material.linewidth = 6; // Thicker line
          selectedConnection = connection;
          compareButton.style.display = "block";
          console.log(
            `Selected connection between trees ${connection.tree1} and ${connection.tree2}`
          );
          return connection; // Return the selected connection object
        }
      }
    }

    return null;
  },

  /**
   * Handle clicking on points
   * @param {Object} params - Parameters including relevant objects and state
   */
  handlePointClick({
    hoveredPoint,
    indices,
    positions,
    selected,
    settings,
    colors,
    geometry,
    selectionMarker,
    scene,
    connectionLines,
    connections,
  }) {
    if (hoveredPoint === null) return selected;

    const index = hoveredPoint;
    const treeIndex = indices[index];

    // Get position
    const position = new THREE.Vector3(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2]
    );

    if (!selected) {
      // First selection
      const newSelected = {
        index,
        treeIndex,
        position: position.clone(),
      };

      // Update visual appearance
      const color = new THREE.Color(settings.selectedColor);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      geometry.attributes.color.needsUpdate = true;

      // Show selection marker
      selectionMarker.position.copy(position);
      selectionMarker.visible = true;

      console.log(
        `Selected tree ${treeIndex} (Full Tree ${
          Math.floor(treeIndex / 5) + 1
        })`
      );

      return newSelected;
    } else {
      // Second selection
      if (selected.index !== index) {
        // Prevent duplicate connections (in either direction)
        const connectionId1 = `${selected.treeIndex}-${treeIndex}`;
        const connectionId2 = `${treeIndex}-${selected.treeIndex}`;
        const exists = connections.some(
          (c) => c.id === connectionId1 || c.id === connectionId2
        );
        if (exists) {
          // Reset selection marker and color
          selectionMarker.visible = false;
          const defaultColor = new THREE.Color().setHSL(
            selected.index / indices.length,
            0.7,
            0.5
          );
          colors[selected.index * 3] = defaultColor.r;
          colors[selected.index * 3 + 1] = defaultColor.g;
          colors[selected.index * 3 + 2] = defaultColor.b;
          geometry.attributes.color.needsUpdate = true;
          return null;
        }

        // Create connection line (visible)
        const connectionMaterial = new THREE.LineBasicMaterial({
          color: settings.connectionColor,
          linewidth: 2,
          opacity: 0.7,
          transparent: true,
        });
        const connectionGeometry = new THREE.BufferGeometry().setFromPoints([
          selected.position,
          position,
        ]);
        const line = new THREE.Line(connectionGeometry, connectionMaterial);
        scene.add(line);
        connectionLines.push(line);

        // Store connection data with a unique ID
        const connection = {
          tree1: selected.treeIndex,
          tree2: treeIndex,
          line: line,
          id: connectionId1,
        };
        connections.push(connection);

        // Create hit area for easier selection (invisible, thick)
        const hitAreaGeometry = new THREE.BufferGeometry().setFromPoints([
          selected.position,
          position,
        ]);

        // Create a tube around the line instead of a line for better hit detection
        const path = new THREE.LineCurve3(selected.position, position);
        const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.2, 8, false);

        const hitAreaMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.0, // Invisible but clickable
        });

        const hitArea = new THREE.Mesh(tubeGeometry, hitAreaMaterial);
        hitArea.userData = {
          isHitArea: true,
          connectionId: connectionId1,
          tree1: selected.treeIndex,
          tree2: treeIndex,
        };
        scene.add(hitArea);
        connectionLines.push(hitArea);

        // Reset selection
        const defaultColor = new THREE.Color().setHSL(
          selected.index / indices.length,
          0.7,
          0.5
        );
        colors[selected.index * 3] = defaultColor.r;
        colors[selected.index * 3 + 1] = defaultColor.g;
        colors[selected.index * 3 + 2] = defaultColor.b;
        geometry.attributes.color.needsUpdate = true;

        selectionMarker.visible = false;
        return null;
      }

      return selected;
    }
  },
};

export { InteractionManager };