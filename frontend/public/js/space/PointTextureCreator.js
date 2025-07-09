import * as THREE from "https://esm.sh/three@0.152.2";

/**
 * @module PointTextureCreator
 * Creates point textures for better visual representation of points in 3D space
 */
const PointTextureCreator = {
  /**
   * Creates a texture for points with a soft gradient
   * @returns {THREE.CanvasTexture} The created texture
   */
  createPointTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;

    const context = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 40;

    // Create gradient for point
    const gradient = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(200, 200, 200, 0.8)");
    gradient.addColorStop(1, "rgba(200, 200, 200, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return new THREE.CanvasTexture(canvas);
  },
};

export { PointTextureCreator };