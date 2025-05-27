import * as THREE from "https://esm.sh/three@0.152.2";
import { PointGeometryFactory } from "./PointGeometryFactory.js";
import { InteractionManager } from "./InteractionManager.js";
import { UIComponents } from "./UIComponents.js";
import { PositioningAlgorithms } from "./PositioningAlgorithms.js";
import { TreeSelectionService } from "./TreeSelectionService.js";
import { VisualizationRenderer } from "./VisualizationRenderer.js";
import { PointTextureCreator } from "./PointTextureCreator.js"; // Added import

/**
 * Creates a 3D scatter plot visualization of tree data.
 * @param {HTMLElement} container - The DOM element to mount the visualization
 * @param {Array} treeList - The array of tree data to visualize
 * @param {Object} options - Configuration options for the visualization
 * @returns {Object} - Interface for controlling the visualization
 */
export function createScatterPlot(container, treeList = [], options = {}) {
  // Configuration settings with defaults that can be overridden
  const settings = {
    // Visual settings
    backgroundColor: options.backgroundColor || 0xeeeeee,
    pointColor: options.pointColor || 0x444444,
    selectedColor: options.selectedColor || 0xe91e63,
    connectionColor: options.connectionColor || 0x444444,
    pointSize: options.pointSize || 0.15,
    gridHelper: options.gridHelper !== false,
    axesHelper: options.axesHelper !== false,

    // Layout settings
    useCustomPositions: options.useCustomPositions !== false,
    layoutSpread: options.layoutSpread || 5,

    // Filter settings - only show full trees by default
    showOnlyFullTrees: options.showOnlyFullTrees !== false,

    // Data source settings
    distanceMatrix: options.distanceMatrix || null, // This would be for the filtered set if used directly

    // Interaction settings
    autoRotate: options.autoRotate !== undefined ? options.autoRotate : false,
    showLabels: options.showLabels !== false,
    maxConnections: options.maxConnections || 100,
  };

  // Filter trees to only include full trees if requested
  // treeList here is the original, potentially unfiltered list from the caller (gui.js)
  const { filteredTreeList, treeIndices } = TreeSelectionService.filterTrees(
    treeList,
    settings.showOnlyFullTrees
  );

  // numPoints is the number of points we will actually render
  const numPoints = filteredTreeList.length;

  // Initialize THREE.js scene, camera, renderer
  const { renderer, scene, camera, controls } =
    VisualizationRenderer.initialize(container, settings);

  // Generate positions for the points
  let positions; // This will be a Float32Array for THREE.BufferGeometry

  // First ensure we have a fallback for positions
  const createFallbackPositions = () => {
    console.log(
      "[scatterPlot.js] Using fallback circular layout for",
      numPoints,
      "points."
    );
    return PositioningAlgorithms.createCircularLayout(
      numPoints, // Use the count of points to be rendered
      settings.layoutSpread
    );
  };

  // --- DEBUG: Embedding/Position Scaling Test Utility ---
  function logEmbeddingStats(embedding, label = "Embedding") {
    if (!embedding || !embedding.length) {
      console.log(`[${label}] Embedding is null or empty.`);
      return;
    }
    let xs = embedding.map((p) => p.x);
    let ys = embedding.map((p) => p.y);
    let zs = embedding.map((p) => p.z || 0); // Default undefined z to 0 for stats
    function stats(arr) {
      if (!arr || arr.length === 0)
        return { min: NaN, max: NaN, mean: NaN, range: NaN, count: 0 };
      const numericArr = arr.filter((v) => typeof v === "number" && !isNaN(v));
      if (numericArr.length === 0)
        return {
          min: NaN,
          max: NaN,
          mean: NaN,
          range: NaN,
          count: 0,
          nonNumeric: arr.length,
        };
      return {
        min: Math.min(...numericArr),
        max: Math.max(...numericArr),
        mean: numericArr.reduce((a, b) => a + b, 0) / numericArr.length,
        range: Math.max(...numericArr) - Math.min(...numericArr),
        count: numericArr.length,
        totalInput: arr.length,
      };
    }
    console.log(
      `[scatterPlot.js] [${label}] Count: ${embedding.length}, X:`,
      stats(xs),
      "Y:",
      stats(ys),
      "Z:",
      stats(zs)
    );
  }

  try {
    // options.positions comes from gui.js and is for the *entire* original treeList
    if (
      settings.useCustomPositions &&
      options.positions &&
      Array.isArray(options.positions) &&
      options.positions.length > 0
    ) {
      // Log raw positions received (should be for all trees)
      logEmbeddingStats(
        options.positions,
        "Raw options.positions (from gui.js)"
      );

      let relevantPositionsSource = options.positions;

      // If showOnlyFullTrees is true, we need to select the positions
      // corresponding to the filteredTreeList using treeIndices.
      // treeIndices contains the original indices of the trees that were kept.
      if (settings.showOnlyFullTrees) {
        if (options.positions.length !== treeList.length) {
          console.warn(
            `[scatterPlot.js] Mismatch: options.positions length (${options.positions.length}) !== original treeList length (${treeList.length}). This might lead to incorrect filtering. Proceeding with filtering based on available options.positions.`
          );
        }
        relevantPositionsSource = treeIndices
          .map((originalIndex) => {
            if (originalIndex < options.positions.length) {
              return options.positions[originalIndex];
            }
            console.warn(
              `[scatterPlot.js] treeIndex ${originalIndex} is out of bounds for options.positions (length ${options.positions.length}). Returning undefined.`
            );
            return { x: 0, y: 0, z: 0 }; // Fallback for out-of-bounds to avoid crashes
          })
          .filter((p) => p); // Filter out any undefined if an index was bad

        if (relevantPositionsSource.length !== numPoints) {
          console.warn(
            `[scatterPlot.js] Filtered positions length (${relevantPositionsSource.length}) does not match numPoints (${numPoints}). This indicates an issue.`
          );
          // Potentially fall back if lengths mismatch significantly, or pad, or log error.
          // For now, we proceed but this is a critical warning.
        }
        logEmbeddingStats(
          relevantPositionsSource,
          "Filtered relevantPositionsSource (for rendered points)"
        );
      } else {
        // Using all provided positions, but still ensure it matches numPoints if no filtering was done
        // This case implies treeList === filteredTreeList, so treeList.length === numPoints
        if (options.positions.length !== numPoints) {
          console.warn(
            `[scatterPlot.js] options.positions length (${options.positions.length}) does not match numPoints (${numPoints}) when showOnlyFullTrees is false. Using slice.`
          );
          relevantPositionsSource = options.positions.slice(0, numPoints); // Take only what's needed
        }
        logEmbeddingStats(
          relevantPositionsSource,
          "Unfiltered relevantPositionsSource (showOnlyFullTrees=false)"
        );
      }

      // At this point, relevantPositionsSource should ideally have `numPoints` items,
      // each corresponding to a tree in `filteredTreeList`.

      // Optionally, visualize the embedding as an SVG overlay for debugging
      // This SVG debug should use relevantPositionsSource
      if (!document.getElementById("embedding-debug-svg")) {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        // ... (SVG creation code - ensure it uses relevantPositionsSource)
        // Example: let xs = relevantPositionsSource.map(p => p.x);
        // ...
        if (relevantPositionsSource && relevantPositionsSource.length > 0) {
          svg.id = "embedding-debug-svg";
          svg.style.position = "absolute";
          svg.style.top = "0";
          svg.style.right = "0";
          svg.style.width = "200px";
          svg.style.height = "200px";
          svg.style.background = "rgba(255,255,255,0.7)";
          svg.style.zIndex = 9999;
          svg.style.pointerEvents = "none";
          // Check if container is still valid before appending
          if (container && container.appendChild) {
            container.appendChild(svg);
          }

          let xs = relevantPositionsSource.map((p) => p.x);
          let ys = relevantPositionsSource.map((p) => p.y);
          let minX = Math.min(...xs),
            maxX = Math.max(...xs);
          let minY = Math.min(...ys),
            maxY = Math.max(...ys);
          let scaleX = 180 / (maxX - minX || 1);
          let scaleY = 180 / (maxY - minY || 1);

          relevantPositionsSource.forEach((p, i) => {
            const circle = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle"
            );
            circle.setAttribute("cx", ((p.x - minX) * scaleX + 10).toFixed(2));
            circle.setAttribute("cy", ((p.y - minY) * scaleY + 10).toFixed(2));
            circle.setAttribute("r", 2);
            circle.setAttribute("fill", "#4285f4");
            svg.appendChild(circle);
          });
        }
      }

      // Preserve aspect ratio normalization using relevantPositionsSource
      let emb = relevantPositionsSource;
      if (!emb || emb.length === 0) {
        console.warn(
          "[scatterPlot.js] relevantPositionsSource is empty after filtering/selection. Falling back."
        );
        positions = createFallbackPositions();
      } else {
        let xs = emb.map((p) => p.x);
        let ys = emb.map((p) => p.y);
        let zs = emb.map((p) => p.z || 0); // Default undefined z to 0

        let minX = Math.min(...xs),
          maxX = Math.max(...xs);
        let minY = Math.min(...ys),
          maxY = Math.max(...ys);
        let minZ = Math.min(...zs),
          maxZ = Math.max(...zs);

        let rangeX = maxX - minX;
        let rangeY = maxY - minY;
        let rangeZ = maxZ - minZ;

        let centerX = (minX + maxX) / 2;
        let centerY = (minY + maxY) / 2;
        let centerZ = (minZ + maxZ) / 2;

        let maxRange = Math.max(rangeX, rangeY, rangeZ);
        if (maxRange === 0) {
          maxRange = 1;
        }

        let normPositions = emb.map((p) => {
          const currentZ = p.z !== undefined ? p.z : centerZ;
          return {
            x: (p.x - centerX) / maxRange,
            y: (p.y - centerY) / maxRange,
            z: (currentZ - centerZ) / maxRange,
          };
        });

        logEmbeddingStats(
          normPositions,
          "Aspect-Preserving Normalized Embedding (for rendered points)"
        );

        // generateFromCustomPositions expects an array of objects {x,y,z} and the count.
        // It should now receive normPositions which matches numPoints.
        positions = PositioningAlgorithms.generateFromCustomPositions(
          normPositions, // These are the normalized {x,y,z} objects for the points to be rendered
          numPoints, // This is filteredTreeList.length, which should match normPositions.length
          settings.layoutSpread
        );
        logEmbeddingStats(
          Array.from({ length: numPoints }, (_, i) => ({
            x: positions[i * 3],
            y: positions[i * 3 + 1],
            z: positions[i * 3 + 2],
          })),
          "THREE Positions (from generateFromCustomPositions)"
        );
      }
    } else if (settings.distanceMatrix) {
      // This path assumes distanceMatrix is already for the *filtered* set of trees if showOnlyFullTrees is true.
      // Or, it needs to be filtered here. For now, assume it's pre-filtered or matches numPoints.
      try {
        console.log(
          "[scatterPlot.js] Generating positions from distance matrix for",
          numPoints,
          "points."
        );
        // Ensure distanceMatrix corresponds to numPoints if used.
        // This might require filtering the distanceMatrix if it was for all trees.
        // For simplicity, current MDS logic in PositioningAlgorithms might assume matrix matches numPoints.
        positions = PositioningAlgorithms.generateFromDistanceMatrix(
          settings.distanceMatrix,
          numPoints,
          settings.layoutSpread
        );

        const containsNaN_MDS = Array.from(positions).some((val) => isNaN(val));
        if (containsNaN_MDS) {
          console.warn(
            "[scatterPlot.js] MDS generated NaN positions, using fallback"
          );
          positions = createFallbackPositions();
        }
      } catch (error) {
        console.error(
          "[scatterPlot.js] Error generating positions from distance matrix:",
          error
        );
        positions = createFallbackPositions();
      }
    } else {
      console.log(
        "[scatterPlot.js] No custom positions or distance matrix provided. Using fallback."
      );
      positions = createFallbackPositions();
    }
  } catch (error) {
    console.error(
      "[scatterPlot.js] Error in position generation pipeline:",
      error
    );
    positions = createFallbackPositions();
  }

  // Final validation to ensure we don't pass NaN values to BufferGeometry
  if (
    !positions ||
    positions.length !== numPoints * 3 ||
    Array.from(positions).some((val) => isNaN(val))
  ) {
    console.warn(
      "[scatterPlot.js] Positions are invalid (NaN, wrong length, or undefined) before geometry creation. Using safe fallback for",
      numPoints,
      "points."
    );
    // Create a new Float32Array for the fallback
    const fallbackPositionsArray = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      fallbackPositionsArray[i * 3] =
        Math.cos((i / numPoints) * Math.PI * 2) * settings.layoutSpread;
      fallbackPositionsArray[i * 3 + 1] =
        Math.sin((i / numPoints) * Math.PI * 2) * settings.layoutSpread;
      fallbackPositionsArray[i * 3 + 2] = 0; // Default Z to 0
    }
    positions = fallbackPositionsArray;
  }

  // Create point texture for better looking points
  const pointTexture = PointTextureCreator.createPointTexture(); // Use imported function

  // Prepare colors if group coloring is provided
  let colorMapper;
  if (options.groupColors && Array.isArray(options.groupColors)) {
    colorMapper = options.groupColors.map((color) => new THREE.Color(color));
  }

  // Create geometry for points
  const { geometry, colors, sizes, indices } =
    PointGeometryFactory.createGeometry(
      positions,
      numPoints,
      treeIndices,
      settings.pointSize,
      colorMapper
    );

  // Create material and points
  const pointsMaterial = PointGeometryFactory.createPointsMaterial(
    settings.pointSize,
    pointTexture
  );

  const points = new THREE.Points(geometry, pointsMaterial);
  scene.add(points);

  // Create UI elements (info panel, tooltip)
  const infoPanel = UIComponents.createInfoPanel(
    container,
    numPoints,
    (newSize) => {
      settings.pointSize = newSize;
      for (let i = 0; i < numPoints; i++) {
        sizes[i] = newSize;
      }
      geometry.attributes.size.needsUpdate = true;
      pointsMaterial.size = newSize;
      pointsMaterial.needsUpdate = true;
    }
  );

  const tooltip = UIComponents.createTooltip(container);
  const compareButton = infoPanel.querySelector("#compare-connection-btn");
  compareButton.style.display = "none";

  // Create selection marker
  const selectionMarker = UIComponents.createSelectionMarker(
    settings.selectedColor
  );
  scene.add(selectionMarker);
  selectionMarker.visible = false;

  // Arrays to track connections
  const connectionLines = [];
  const connections = [];
  const comparisonModals = {};

  // Track selected state
  let selectedConnection = null;
  let selected = null;

  // Set up raycasting for interaction
  const raycaster = InteractionManager.setupRaycaster();
  const mouse = new THREE.Vector2();
  let hoveredPoint = null;

  // Add a debug tool to visualize connections and hit areas
  function toggleConnectionDebug(scene, connectionLines) {
    const existingDebug = scene.getObjectByName("connection-debug");
    if (existingDebug) {
      scene.remove(existingDebug);
      return;
    }

    // Create a debug helper group
    const debugHelper = new THREE.Group();
    debugHelper.name = "connection-debug";

    // Visualize all hit areas with different colors
    connectionLines.forEach((line, i) => {
      if (line.userData && line.userData.isHitArea) {
        // Create visible version of hit area
        const debugMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(i / connectionLines.length, 1, 0.5),
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        });

        // Clone the hit area's geometry
        let debugMesh;
        if (line instanceof THREE.Mesh) {
          debugMesh = new THREE.Mesh(line.geometry.clone(), debugMaterial);
        } else {
          debugMesh = new THREE.Line(line.geometry.clone(), debugMaterial);
        }

        // Add to debug helper
        debugHelper.add(debugMesh);
      }
    });

    scene.add(debugHelper);
  }

  // --- Event Handlers for Cleanup ---
  function handleMouseMove(event) {
    hoveredPoint = InteractionManager.onMouseMove(event, {
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
    });
  }

  function handleClick(event) {
    // Check if shift key is pressed for debug mode
    if (event.shiftKey) {
      toggleConnectionDebug(scene, connectionLines);
      return;
    }

    // Get mouse position for raycasting
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // First check if a connection was clicked
    const connection = InteractionManager.handleConnectionClick({
      mouse,
      raycaster,
      camera,
      connectionLines,
      connections,
      selectedConnection,
      settings,
      compareButton,
    });

    if (connection !== null) {
      selectedConnection = connection;
      return;
    } else {
      compareButton.style.display = "none";
    }

    // If no connection was clicked, handle point click
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(points);

    let clickedPointIndex = null;
    if (intersects.length > 0) {
      clickedPointIndex = intersects[0].index;
    }

    selected = InteractionManager.handlePointClick({
      hoveredPoint: clickedPointIndex,
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
    });
  }

  container.addEventListener("mousemove", handleMouseMove);
  container.addEventListener("click", handleClick);

  // Add click handler to compare button
  compareButton.addEventListener("click", () => {
    if (selectedConnection) {
      TreeSelectionService.compareTrees(
        selectedConnection.tree1,
        selectedConnection.tree2,
        { treeList, comparisonModals }
      );
    }
  });

  // Start animation loop
  VisualizationRenderer.startAnimation(() => {
    // Update controls
    controls.update();

    // Animate selection marker
    if (selectionMarker.visible) {
      selectionMarker.rotation.y += 0.02;

      // Add pulsing effect
      const time = Date.now() * 0.003;
      const scale = 1 + 0.2 * Math.sin(time);
      selectionMarker.scale.set(scale, scale, scale);
    }

    // Render scene
    renderer.render(scene, camera);
  });

  // Handle window resize
  const onWindowResize = () => {
    VisualizationRenderer.updateOnResize(renderer, camera, container);
  };
  window.addEventListener("resize", onWindowResize);

  // Return public interface
  return {
    scene,
    camera,
    renderer,
    points,
    connections,

    // Method to compare trees
    compareTrees: (tree1Index, tree2Index) => {
      TreeSelectionService.compareTrees(tree1Index, tree2Index, {
        treeList,
        comparisonModals,
      });
    },

    // Method to highlight a specific tree
    highlightTree(treeIndex) {
      for (let i = 0; i < numPoints; i++) {
        if (indices[i] === treeIndex) {
          // Highlight the point
          const color = new THREE.Color(settings.selectedColor);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
          sizes[i] = settings.pointSize * 1.5;

          geometry.attributes.color.needsUpdate = true;
          geometry.attributes.size.needsUpdate = true;

          // Move camera to focus on the point
          const position = new THREE.Vector3(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2]
          );

          // Animate camera movement
          const startPos = camera.position.clone();
          const direction = position
            .clone()
            .sub(controls.target)
            .normalize()
            .multiplyScalar(7);
          const endPos = position.clone().add(direction);

          const startTime = Date.now();
          const duration = 1000;

          function moveCamera() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress =
              progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;

            camera.position.lerpVectors(startPos, endPos, easedProgress);
            controls.target.lerp(position, easedProgress);
            controls.update();

            if (progress < 1) {
              requestAnimationFrame(moveCamera);
            }
          }

          moveCamera();
          break;
        }
      }
    },

    // Method to clear all highlights
    clearHighlights() {
      // Reset all colors to default
      for (let i = 0; i < numPoints; i++) {
        const hue = i / numPoints;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        sizes[i] = settings.pointSize;
      }

      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;

      // Hide selection marker
      selectionMarker.visible = false;
      selected = null;
    },

    // Method to clear all connections
    clearConnections() {
      connectionLines.forEach((line) => {
        scene.remove(line);
        line.geometry.dispose();
      });

      connectionLines.length = 0;
      connections.length = 0;
    },

    // Method to update point positions
    setPositions(newPositions) {
      if (!newPositions || newPositions.length !== numPoints) {
        console.error("Invalid positions array");
        return;
      }

      for (let i = 0; i < numPoints; i++) {
        positions[i * 3] = newPositions[i].x * settings.layoutSpread;
        positions[i * 3 + 1] = newPositions[i].y * settings.layoutSpread;
        positions[i * 3 + 2] = (newPositions[i].z || 0) * settings.layoutSpread; // Apply layoutSpread to Z as well
      }

      geometry.attributes.position.needsUpdate = true;
    },

    // Method to clean up resources
    dispose() {
      // Remove event listeners
      window.removeEventListener("resize", onWindowResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);

      // Remove DOM elements safely
      if (tooltip && tooltip.parentNode)
        tooltip.parentNode.removeChild(tooltip);
      if (infoPanel && infoPanel.parentNode)
        infoPanel.parentNode.removeChild(infoPanel);

      // Dispose geometries and materials
      geometry.dispose();
      pointsMaterial.dispose();

      connectionLines.forEach((line) => {
        scene.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      });

      scene.remove(points);
      scene.remove(selectionMarker);

      // Remove references
      if (window.scatterPlotRenderer === renderer) {
        window.scatterPlotRenderer = null;
      }

      if (window.scatterPlotCamera === camera) {
        window.scatterPlotCamera = null;
      }
    },
    selectConnection(connectionId) {
      const connection = connections.find((c) => c.id === connectionId);
      if (connection) {
        // Deselect previous if any
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

        // Select new connection
        selectedConnection = connection;
        connection.line.material.color.set(settings.selectedColor);
        connection.line.material.opacity = 1.0;
        connection.line.material.linewidth = 3;
        compareButton.style.display = "block";
        return true;
      }
      return false;
    },
  };
}



// scatterPlot.js
export function showScatterPlotModal({ realTreeList, treeList, modals, setModals }) {
  // 1. Show loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "loading-indicator";
  loadingIndicator.innerHTML =
    '<div class="spinner"></div><div>Loading Tree Space Visualization...</div>';
  Object.assign(loadingIndicator.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "20px",
    background: "white",
    borderRadius: "5px",
    boxShadow: "0 0 10px rgba(0,0,0,0.2)",
    zIndex: "10000",
  });
  document.body.appendChild(loadingIndicator);

  // 2. Prepare data and modal
  const modeSelector = document.getElementById("scatter-plot-mode");
  const mode = modeSelector ? modeSelector.value : "umap";
  let treeListForScatter, positions, showOnlyFullTrees;

  import("./PositioningAlgorithms.js").then(({ PositioningAlgorithms }) => {
    if (mode === "umap") {
      treeListForScatter = realTreeList;
      if (
        window.emb &&
        Array.isArray(window.emb) &&
        window.emb.length === realTreeList.length &&
        window.emb.every((p) => typeof p === "object" && "x" in p && "y" in p && "z" in p)
      ) {
        positions = window.emb;
      } else {
        try {
          positions = PositioningAlgorithms.createCircularLayout(realTreeList.length, 5);
        } catch (e) {
          positions = Array(realTreeList.length).fill({ x: 0, y: 0, z: 0 });
        }
      }
      showOnlyFullTrees = true;
    } else {
      treeListForScatter = treeList;
      positions = PositioningAlgorithms.createCircularLayout(treeList.length, 5);
      showOnlyFullTrees = false;
    }

    // 3. Remove loading indicator
    if (document.body.contains(loadingIndicator)) {
      document.body.removeChild(loadingIndicator);
    }

    // 4. Create modal container
    const modalContainer = document.createElement("div");
    modalContainer.style.width = "100%";
    modalContainer.style.height = "100%";
    modalContainer.style.overflow = "hidden";

    // 5. Create WinBox modal
    const modal = new WinBox({
      title: "Phylogenetic Tree Space Visualization",
      width: "90%",
      height: "90%",
      x: "center",
      y: "center",
      background: "#373747",
      class: ["no-full"],
      mount: modalContainer,
    });

    if (!modals) modals = {};
    modals.scatterPlot = modal;
    setModals(modals);

    // 6. Render scatter plot after a short delay
    setTimeout(() => {
      createScatterPlot(
        modalContainer,
        treeListForScatter,
        {
          positions,
          showOnlyFullTrees,
          backgroundColor: 0x202030,
          pointColor: 0x4285f4,
          selectedColor: 0xff5722,
          pointSize: 0.2,
          autoRotate: true,
          // groupColors: ... (add if needed)
        }
      );
      modal.onclose = () => {
        delete modals.scatterPlot;
        setModals(modals);
      };
    }, 100);
  }).catch((error) => {
    if (document.body.contains(loadingIndicator)) {
      document.body.removeChild(loadingIndicator);
    }
    const notification = document.createElement("div");
    notification.className = "notification error";
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fa fa-exclamation-triangle"></i>
        <span>Failed to load tree visualization: ${error.message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  });
}

// WinBox modals do not block background interaction by default.
// No overlay/backdrop is used.