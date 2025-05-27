// Minimal 3D renderer for a tree using Three.js (SVGRenderer)
// Usage: Tree3DRenderer.renderTree(treeData, container)

import * as THREE from 'three';
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const Tree3DRenderer = {
  /**
   * Render a tree in 3D (2D layout, z=0) in the given container.
   * @param {Object} tree - D3 hierarchy or similar with .links() and .leaves()
   * @param {HTMLElement} container - DOM element to render into
   */
  renderTree(tree, container) {
    // Clean up previous content
    container.innerHTML = '';
    // Set up Three.js scene
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 400);
    // Renderer
    const renderer = new SVGRenderer();
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    // Draw links (branches)
    tree.links().forEach(link => {
      const material = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
      const geometry = new THREE.BufferGeometry();
      // Use your layout: x, y, z=0
      const points = [
        new THREE.Vector3(link.source.x, link.source.y, 0),
        new THREE.Vector3(link.target.x, link.target.y, 0)
      ];
      geometry.setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    });
    // Draw nodes (leaves)
    tree.leaves().forEach(leaf => {
      const geometry = new THREE.CircleGeometry(5, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x1976d2 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(leaf.x, leaf.y, 0);
      scene.add(mesh);
    });
    // Render
    renderer.render(scene, camera);
  }
};

/**
 * Render two trees side-by-side in 3D, with a x-rotation control and OrbitControls.
 * @param {Object} tree1 - D3 hierarchy or similar with .links() and .leaves()
 * @param {Object} tree2 - D3 hierarchy or similar with .links() and .leaves()
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} options - { offset, color1, color2 }
 */
export function renderTreeComparison(tree1, tree2, container, options = {}) {
  container.innerHTML = '';
  const width = container.clientWidth || 900;
  const height = container.clientHeight || 600;
  const offset = options.offset || 250;
  const color1 = options.color1 || 0x1976d2;
  const color2 = options.color2 || 0xd32f2f;

  // Three.js setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 0, 800);
  // SVGRenderer for 2D look, or switch to WebGLRenderer for full 3D effects
  const renderer = new SVGRenderer();
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.screenSpacePanning = true;
  controls.minDistance = 100;
  controls.maxDistance = 2000;
  controls.target.set(0, 0, 0);
  controls.update();

  // Group for both trees (parent group for scene organization)
  const treesGroup = new THREE.Group();
  scene.add(treesGroup);

  // Individual tree groups
  const tree1Group = new THREE.Group();
  const tree2Group = new THREE.Group();
  treesGroup.add(tree1Group);
  treesGroup.add(tree2Group);

  // Helper to add a tree to a group
  function addTreeToGroup(tree, group, color, zOffset) {
    const treeGroup = new THREE.Group();
    // Links
    tree.links().forEach(link => {
      const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      const geometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(link.source.x, link.source.y, zOffset),
        new THREE.Vector3(link.target.x, link.target.y, zOffset)
      ];
      geometry.setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      treeGroup.add(line);
    });
    // Nodes
    tree.leaves().forEach(leaf => {
      const geometry = new THREE.CircleGeometry(5, 32);
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(leaf.x, leaf.y, zOffset);
      treeGroup.add(mesh);
    });
    group.add(treeGroup);
  }

  // Add both trees, now separated in z (depth)
  addTreeToGroup(tree1, tree1Group, color1, -offset);
  addTreeToGroup(tree2, tree2Group, color2, offset);

  // Add sliders for independent x-rotation
  const slider1 = document.createElement('input');
  slider1.type = 'range';
  slider1.min = '0';
  slider1.max = '360';
  slider1.value = '0';
  slider1.style.width = '45%';
  slider1.style.margin = '12px 2% 0 2%';
  slider1.style.display = 'inline-block';
  container.appendChild(slider1);

  const slider2 = document.createElement('input');
  slider2.type = 'range';
  slider2.min = '0';
  slider2.max = '360';
  slider2.value = '0';
  slider2.style.width = '45%';
  slider2.style.margin = '12px 2% 0 2%';
  slider2.style.display = 'inline-block';
  container.appendChild(slider2);

  // Labels for sliders
  const label1 = document.createElement('div');
  label1.textContent = 'Tree 1 X Rotation: 0°';
  label1.style.textAlign = 'center';
  label1.style.fontSize = '1em';
  label1.style.marginTop = '2px';
  label1.style.width = '45%';
  label1.style.display = 'inline-block';
  container.appendChild(label1);

  const label2 = document.createElement('div');
  label2.textContent = 'Tree 2 X Rotation: 0°';
  label2.style.textAlign = 'center';
  label2.style.fontSize = '1em';
  label2.style.marginTop = '2px';
  label2.style.width = '45%';
  label2.style.display = 'inline-block';
  container.appendChild(label2);

  // Animation loop
  let xRotation1 = 0;
  let xRotation2 = 0;
  function animate() {
    tree1Group.rotation.x = xRotation1;
    tree2Group.rotation.x = xRotation2;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // Update rotation on slider input
  slider1.addEventListener('input', () => {
    xRotation1 = parseFloat(slider1.value) * Math.PI / 180;
    label1.textContent = `Tree 1 X Rotation: ${slider1.value}°`;
  });
  slider2.addEventListener('input', () => {
    xRotation2 = parseFloat(slider2.value) * Math.PI / 180;
    label2.textContent = `Tree 2 X Rotation: ${slider2.value}°`;
  });

  // Responsive resize
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // Clean up on modal close (if container is removed)
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Render multiple trees in a row, each with its own rotation slider and true 3D (WebGLRenderer).
 * @param {Array} treeRoots - Array of D3 hierarchies or similar with .links() and .leaves()
 * @param {HTMLElement} container - DOM element to render into
 */
export function renderTreeRow3D(treeRoots, container) {
  container.innerHTML = '';
  const width = container.clientWidth || 900;
  const height = container.clientHeight || 300;
  const n = treeRoots.length;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 0, 600);
  // Use WebGLRenderer for real 3D
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0xffffff);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
  // OrbitControls for the whole scene
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.screenSpacePanning = true;
  controls.minDistance = 100;
  controls.maxDistance = 2000;
  controls.target.set(0, 0, 0);
  controls.update();
  // Group for all trees
  const allTreesGroup = new THREE.Group();
  scene.add(allTreesGroup);
  // Store per-tree groups and rotation state
  const treeGroups = [];
  const xRotations = [];
  // Layout: spread trees evenly along x axis
  const spacing = width / (n + 1);
  for (let i = 0; i < n; ++i) {
    const tree = treeRoots[i];
    const color = 0x1976d2;
    const group = new THREE.Group();
    // Draw links
    tree.links().forEach(link => {
      const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      const geometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(link.source.x, link.source.y, 0),
        new THREE.Vector3(link.target.x, link.target.y, 0)
      ];
      geometry.setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    });
    // Draw nodes
    tree.leaves().forEach(leaf => {
      const geometry = new THREE.CircleGeometry(5, 32);
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(leaf.x, leaf.y, 0);
      group.add(mesh);
    });
    // Position group
    group.position.x = -width/2 + spacing * (i + 1);
    allTreesGroup.add(group);
    treeGroups.push(group);
    xRotations.push(0);
  }
  // Add sliders for each tree
  const sliderRow = document.createElement('div');
  sliderRow.style.display = 'flex';
  sliderRow.style.justifyContent = 'center';
  sliderRow.style.alignItems = 'center';
  sliderRow.style.width = '100%';
  sliderRow.style.margin = '8px 0 0 0';
  for (let i = 0; i < n; ++i) {
    const sliderCol = document.createElement('div');
    sliderCol.style.display = 'flex';
    sliderCol.style.flexDirection = 'column';
    sliderCol.style.alignItems = 'center';
    sliderCol.style.margin = '0 8px';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '360';
    slider.value = '0';
    slider.style.width = '100px';
    sliderCol.appendChild(slider);
    const label = document.createElement('div');
    label.textContent = `T${i+1} X Rotation: 0°`;
    label.style.fontSize = '0.9em';
    label.style.marginTop = '2px';
    sliderCol.appendChild(label);
    slider.addEventListener('input', () => {
      xRotations[i] = parseFloat(slider.value) * Math.PI / 180;
      label.textContent = `T${i+1} X Rotation: ${slider.value}°`;
    });
    sliderRow.appendChild(sliderCol);
  }
  container.appendChild(sliderRow);
  // Animation loop
  function animate() {
    for (let i = 0; i < n; ++i) {
      treeGroups[i].rotation.x = xRotations[i];
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
  // Responsive resize
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  // Clean up on modal close (if container is removed)
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
