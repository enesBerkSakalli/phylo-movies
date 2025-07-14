import * as THREE from "https://esm.sh/three@0.152.2";
import { OrbitControls } from "https://esm.sh/three@0.152.2/examples/jsm/controls/OrbitControls.js";

/**
 * @module VisualizationRenderer
 * Handles rendering and animation loop for 3D visualization
 */

const VisualizationRenderer = {
  /**
   * Initialize the THREE.js environment
   * @param {HTMLElement} container - Container to render into
   * @param {Object} settings - Visual settings
   * @returns {Object} Object with renderer, scene, camera, and controls
   */
  initialize(container, settings) {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(settings.backgroundColor);
    container.appendChild(renderer.domElement);
    
    // Make sure the canvas is visible and interactive
    let parentElement = renderer.domElement.parentElement;
    while (parentElement) {
      if (parentElement.classList && 
          (parentElement.classList.contains("modal") || 
           parentElement.classList.contains("winbox") || 
           parentElement.id === "scatterplot-container")) {
        parentElement.style.pointerEvents = "auto";
        parentElement.style.zIndex = 10000;
      }
      parentElement = parentElement.parentElement;
    }
    
    // Ensure modals don't interfere with interaction
    document.querySelectorAll('.modal-backdrop, .overlay').forEach(elem => {
      elem.style.pointerEvents = "none";
    });
    
    // Make sure canvas receives events
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.zIndex = 10001;
    
    // Save reference for external access
    window.scatterPlotRenderer = renderer;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.backgroundColor);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 3, 10);
    window.scatterPlotCamera = camera;
    
    // Initialize OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.autoRotate = settings.autoRotate;
    
    // Add grid helper for orientation (optional)
    if (settings.gridHelper) {
      const gridHelper = new THREE.GridHelper(10, 10, 0xaaaaaa, 0xdddddd);
      gridHelper.position.y = -0.5;
      scene.add(gridHelper);
    }
    
    // Add axes helper (optional)
    if (settings.axesHelper) {
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }
    
    return { renderer, scene, camera, controls };
  },

  /**
   * Update renderer and camera when container is resized
   * @param {THREE.WebGLRenderer} renderer - The renderer
   * @param {THREE.Camera} camera - The camera
   * @param {HTMLElement} container - The container
   */
  updateOnResize(renderer, camera, container) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  },

  /**
   * Start animation loop
   * @param {Function} callback - Function to call on each frame
   */
  startAnimation(callback) {
    function animate() {
      requestAnimationFrame(animate);
      callback();
    }
    animate();
  }
};

export { VisualizationRenderer };