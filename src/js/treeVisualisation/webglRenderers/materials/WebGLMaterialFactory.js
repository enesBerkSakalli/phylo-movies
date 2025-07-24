import * as THREE from 'three';
import { useAppStore } from '../../../core/store.js';

export class WebGLMaterialFactory {
  constructor(colorManager) {
    this.colorManager = colorManager;
    this.cache = new Map();
  }

  getLinkMaterial(link, highlightEdges = [], lineWidth = 1, options = {}) {
    if (!this.colorManager || !link) return this.getBasic('#ff0000');

    const colorResult = this.colorManager.getBranchColorWithHighlights(link, highlightEdges);
    const color = colorResult?.color;

    if (!color) return this.getBasic('#999999');

    const cacheKey = `phong_${color}_${lineWidth}_${colorResult.effectType || 'none'}`;

    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, this.createPhong(color, colorResult, options));
    }

    return this.cache.get(cacheKey);
  }

  getNodeMaterial(node, options = {}) {
    const color = this.colorManager.getNodeColor(node);
    const cacheKey = `standard_${color}_node`;

    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, this.createStandard(color, options));
    }

    return this.cache.get(cacheKey);
  }

  getSpriteMaterial(leaf, rotation = 0, texture = null, options = {}) {
    const color = this.colorManager.getNodeColor(leaf);
    const cacheKey = `sprite_${color}_${rotation}_${texture ? texture.uuid : 'no_texture'}`;

    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, this.createSprite(color, rotation, texture, options));
    }

    return this.cache.get(cacheKey);
  }

  createTextSprite(text, leaf, labelRadius, options = {}) {
    if (!text || !leaf) return null;

    const storeState = useAppStore.getState();
    const storeFontSize = storeState?.fontSize;

    const {
      fontSize = this.convertEmToPx(storeFontSize || '1.8em'),
      fontFamily = 'Arial',
      padding = 40,
      minWidth = 128,
      zPosition = 1,
      isIsometric = false
    } = options;

    let adjustedFontSize = isIsometric ? fontSize * 1.5 : fontSize;
    const labelColor = this.colorManager.getNodeColor(leaf);

    let x = labelRadius * Math.cos(leaf.angle);
    let y = labelRadius * Math.sin(leaf.angle);

    const needsFlip = leaf.angle > Math.PI / 2 && leaf.angle < 3 * Math.PI / 2;
    const rotation = needsFlip ? leaf.angle + Math.PI : leaf.angle;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    context.font = `${adjustedFontSize}px ${fontFamily}`;
    const textWidth = context.measureText(text).width;

    canvas.width = Math.max(textWidth + padding, minWidth);
    canvas.height = adjustedFontSize + 16;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = labelColor;
    context.font = `${adjustedFontSize}px ${fontFamily}`;
    context.textBaseline = 'middle';

    if (needsFlip) {
      context.textAlign = 'right';
      context.fillText(text, canvas.width - 10, canvas.height / 2);
    } else {
      context.textAlign = 'left';
      context.fillText(text, 10, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = true;
    texture.generateMipmaps = false;

    const spriteMaterial = this.getSpriteMaterial(leaf, rotation, texture);
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, zPosition);
    sprite.renderOrder = isIsometric ? 2000 : 1000;

    sprite.userData = {
      position: { x, y },
      rotation: rotation,
      leaf: leaf,
      color: labelColor,
      canvas: canvas,
      texture: texture
    };

    // Base sprite scale from canvas dimensions
    let spriteScale = Math.max(canvas.width, canvas.height) * 0.5;

    // Remove camera-dependent scaling - will be handled by onBeforeRender
    sprite.scale.set(spriteScale, spriteScale * (canvas.height / canvas.width), 1);
    return sprite;
  }

  getBasic(color, options = {}) {
    const cacheKey = `basic_${color}`;

    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, this.createBasic(color, options));
    }

    return this.cache.get(cacheKey);
  }

  createPhong(color, colorResult, options = {}) {
    const materialOptions = {
      emissiveIntensity: 0.2,
      shininess: 30,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      color: color,
      emissive: color,
      ...options
    };

    if (colorResult.isHighlighted) {
      const intensities = {
        combined: 0.4,
        lattice: 0.25,
        marked: 0.35
      };
      materialOptions.emissiveIntensity = intensities[colorResult.effectType] || 0.3;
    }

    return new THREE.MeshPhongMaterial(materialOptions);
  }

  createStandard(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 1,
      roughness: 0.5,
      metalness: 0.1,
      color: color,
      ...options
    });
  }

  createSprite(color, rotation, texture, options = {}) {
    const materialOptions = {
      transparent: true,
      alphaTest: 0.01,
      sizeAttenuation: false,
      depthTest: false,
      depthWrite: false,
      rotation: rotation,
      ...options
    };

    if (options.isIsometric) {
      materialOptions.depthTest = true;
      materialOptions.depthWrite = false;
      materialOptions.opacity = 1.0;
      materialOptions.transparent = true;
      materialOptions.renderOrder = 1000;
    }

    if (texture) {
      materialOptions.map = texture;
    }

    return new THREE.SpriteMaterial(materialOptions);
  }

  createBasic(color, options = {}) {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      color: color,
      ...options
    });
  }

  updateColorsForMarkedComponents(markedComponents) {
    if (this.colorManager.updateMarkedComponents) {
      this.colorManager.updateMarkedComponents(markedComponents);
    }
    this.clearCache();
  }

  clearCache() {
    this.cache.forEach(material => {
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      material.dispose();
    });
    this.cache.clear();
  }

  getCacheStatistics() {
    const materialTypes = {};
    this.cache.forEach((material, key) => {
      const type = key.split('_')[0];
      materialTypes[type] = (materialTypes[type] || 0) + 1;
    });

    return {
      totalCached: this.cache.size,
      byType: materialTypes
    };
  }

  convertEmToPx(emSize) {
    if (!emSize || emSize === null || emSize === undefined) return 24;

    const sizeStr = String(emSize);
    if (!sizeStr || sizeStr === 'null' || sizeStr === 'undefined') return 24;

    const emValue = parseFloat(sizeStr.replace('em', ''));
    if (isNaN(emValue) || emValue <= 0) return 24;

    return Math.round(emValue * 16 * 0.8);
  }

  destroy() {
    this.clearCache();
    this.colorManager = null;
  }
}
