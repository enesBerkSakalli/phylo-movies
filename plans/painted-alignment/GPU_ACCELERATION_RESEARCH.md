# GPU Acceleration Research for MSA Visualization in deck.gl

## Executive Summary

This document analyzes GPU acceleration options for improving MSA (Multiple Sequence Alignment) visualization performance in the PhyloMovies project, specifically for the "painted alignment" feature using deck.gl.

**Current Implementation**: Uses `PolygonLayer` with per-cell color accessors computed in JavaScript.

**Recommended Approach**: **Binary Attributes + Layer Extension** (Hybrid approach)
- Use binary typed arrays for geometry/color data
- Optional texture-based color lookup for complex color schemes

---

## 1. deck.gl GPU Features Analysis

### 1.1 Current MSA Layer Stack
From [cellsLayer.js](../../src/js/msaViewer/layers/cellsLayer.js):
```javascript
// Current approach: PolygonLayer with accessor functions
new PolygonLayer({
  data: cellData,
  getPolygon: d => d.polygon,
  getFillColor: d => {
    // Complex color logic executed per-cell in JavaScript
    const baseColor = colorFn(d.ch);
    // Selection dimming logic...
    return baseColor;
  },
  updateTriggers: { getFillColor: [colorScheme, selection, ...] }
});
```

**Current Bottlenecks**:
1. Per-cell polygon generation in JavaScript
2. Color accessor function called for each cell on every render
3. `updateTriggers` causes full re-computation when selection changes
4. Cell stepping/downsampling for large alignments

### 1.2 GPU-Accelerated Layers in deck.gl

| Layer                 | GPU Feature          | Applicability to MSA                |
| --------------------- | -------------------- | ----------------------------------- |
| **BitmapLayer**       | Texture sampling     | ⭐⭐⭐ Pre-render alignment as texture |
| **SolidPolygonLayer** | Binary attributes    | ⭐⭐⭐ Grid cells with binary data     |
| **ColumnLayer**       | Instanced rendering  | ⭐⭐ Fixed-size cells                 |
| **GridCellLayer**     | Grid-based rendering | ⭐⭐ Heatmap-style                    |
| **ScatterplotLayer**  | Binary + Extensions  | ⭐⭐ Point-based cells                |

### 1.3 Binary Attributes Pattern
deck.gl supports passing pre-computed typed arrays directly to GPU:

```javascript
// From deck.gl performance docs
const positions = new Float64Array([x0,y0, x1,y1, ...]);
const colors = new Uint8Array([r0,g0,b0,a0, ...]);

new SolidPolygonLayer({
  data: {
    length: CELL_COUNT,
    startIndices: new Uint32Array([0, 4, 8, ...]), // quad vertices
    attributes: {
      getPolygon: {value: positions, size: 2},
      getFillColor: {value: colors, size: 4}
    }
  },
  _normalize: false // Skip JS processing
});
```

**Performance Impact**: Bypasses JavaScript accessors entirely, data uploaded directly to GPU.

---

## 2. WebGL Texture-Based Coloring

### 2.1 Texture Lookup Table Approach

For MSA with ~20 unique characters (amino acids) or ~5 (nucleotides), a color lookup can be encoded as a small texture:

```javascript
// Create color palette texture (20 colors × 1 row = 80 bytes)
const paletteData = new Uint8ClampedArray(20 * 4); // RGBA for 20 amino acids
AMINO_ACIDS.forEach((aa, i) => {
  const color = COLOR_SCHEME[aa];
  paletteData[i * 4 + 0] = color[0]; // R
  paletteData[i * 4 + 1] = color[1]; // G
  paletteData[i * 4 + 2] = color[2]; // B
  paletteData[i * 4 + 3] = 255;      // A
});

// luma.gl Texture creation
const paletteTexture = device.createTexture({
  data: new ImageData(paletteData, 20, 1),
  sampler: { minFilter: 'nearest', magFilter: 'nearest' }
});
```

### 2.2 Fragment Shader Texture Lookup

```glsl
// Fragment shader modification
uniform sampler2D uColorPalette;
uniform float uCharacterIndex; // passed as attribute

vec4 getCharacterColor(float charIndex) {
  // Normalize to texture coordinate (0-1 range)
  float u = (charIndex + 0.5) / 20.0; // 20 amino acids
  return texture2D(uColorPalette, vec2(u, 0.5));
}
```

### 2.3 Full Alignment as Texture (BitmapLayer Approach)

For very large alignments, render the entire MSA as a texture:

```javascript
// Pre-render alignment to ImageData
const width = alignmentLength;
const height = sequenceCount;
const pixels = new Uint8ClampedArray(width * height * 4);

for (let row = 0; row < height; row++) {
  for (let col = 0; col < width; col++) {
    const char = sequences[row][col];
    const color = colorScheme(char);
    const idx = (row * width + col) * 4;
    pixels[idx] = color[0];
    pixels[idx + 1] = color[1];
    pixels[idx + 2] = color[2];
    pixels[idx + 3] = 255;
  }
}

// Render using BitmapLayer
new BitmapLayer({
  image: new ImageData(pixels, width, height),
  bounds: [0, 0, width * cellSize, height * cellSize],
  textureParameters: {
    minFilter: 'nearest', // Pixelated appearance
    magFilter: 'nearest'
  }
});
```

**Pros**: Extremely fast for large alignments, single texture upload
**Cons**: Re-render entire texture on color scheme change, limited interactivity

---

## 3. deck.gl Custom Shaders

### 3.1 Layer Extension Pattern

The `LayerExtension` API allows injecting custom shader code without fully subclassing a layer:

```javascript
import { LayerExtension } from '@deck.gl/core';

// Uniform block for deck.gl v9+ (WebGPU-ready)
const uniformBlock = `
uniform msaUniforms {
  float dimFactor;
  float selectionStart;
  float selectionEnd;
} msa;
`;

const msaColorModule = {
  name: 'msa-coloring',
  fs: uniformBlock,
  uniformTypes: {
    dimFactor: 'f32',
    selectionStart: 'f32',
    selectionEnd: 'f32'
  }
};

class MSAColorExtension extends LayerExtension {
  getShaders() {
    return {
      inject: {
        'fs:DECKGL_FILTER_COLOR': `
          // Apply selection dimming on GPU
          if (geometry.uv.x < msa.selectionStart || geometry.uv.x > msa.selectionEnd) {
            color.rgb = mix(color.rgb, vec3(0.7), msa.dimFactor);
          }
        `
      },
      modules: [msaColorModule]
    };
  }

  updateState({ props }) {
    for (const model of this.getModels()) {
      model.shaderInputs.setProps({
        msa: {
          dimFactor: props.dimFactor || 0.7,
          selectionStart: props.selection?.startCol || 0,
          selectionEnd: props.selection?.endCol || 1
        }
      });
    }
  }
}

// Usage
new PolygonLayer({
  extensions: [new MSAColorExtension()],
  dimFactor: 0.7,
  selection: { startCol: 100, endCol: 200 }
});
```

### 3.2 Shader Injection Hooks

deck.gl provides these standard injection points:

| Hook                           | Stage    | Purpose                               |
| ------------------------------ | -------- | ------------------------------------- |
| `vs:DECKGL_FILTER_SIZE`        | Vertex   | Modify geometry size                  |
| `vs:DECKGL_FILTER_GL_POSITION` | Vertex   | Modify position                       |
| `vs:DECKGL_FILTER_COLOR`       | Vertex   | Modify vertex color                   |
| `fs:DECKGL_FILTER_COLOR`       | Fragment | Modify fragment color                 |
| `fs:#decl`                     | Fragment | Add declarations (uniforms, varyings) |

### 3.3 Subclassing for Full Control

For complete shader replacement:

```javascript
class MSAGridLayer extends SolidPolygonLayer {
  getShaders() {
    return Object.assign({}, super.getShaders(), {
      fs: CUSTOM_FRAGMENT_SHADER,
      modules: [...super.getShaders().modules, msaColorModule]
    });
  }

  initializeState() {
    super.initializeState();
    this.state.attributeManager.addInstanced({
      characterIndex: { size: 1, accessor: 'getCharacterIndex' }
    });
  }
}
```

---

## 4. Performance Patterns for Large Datasets

### 4.1 Data Size Estimation

For a typical MSA:
- 100 sequences × 1,000 positions = 100,000 cells
- Large alignment: 500 sequences × 10,000 positions = 5,000,000 cells

### 4.2 deck.gl Scaling Approaches

| Approach                          | Cells     | Memory | Interactivity | Complexity |
| --------------------------------- | --------- | ------ | ------------- | ---------- |
| Current (PolygonLayer + accessor) | <50K      | High   | Full          | Low        |
| Binary Attributes                 | 100K-500K | Medium | Full          | Medium     |
| BitmapLayer (Texture)             | 1M+       | Low    | Limited       | Medium     |
| GPU Filtering Extension           | 500K+     | Low    | Full          | High       |

### 4.3 DataFilteringExtension for Visibility

```javascript
import { DataFilterExtension } from '@deck.gl/extensions';

new PolygonLayer({
  data: allCells,
  extensions: [new DataFilterExtension({ filterSize: 2 })],

  // Filter by row and column visibility
  getFilterValue: d => [d.row, d.col],
  filterRange: [
    [visibleRowStart, visibleRowEnd],
    [visibleColStart, visibleColEnd]
  ]
});
```

### 4.4 Recommended: Binary Attributes + Filtering

```javascript
// Pre-compute all cell data once
const cellCount = rows * cols;
const positions = new Float32Array(cellCount * 8); // 4 vertices × 2 coords
const colors = new Uint8Array(cellCount * 4);
const charIndices = new Uint8Array(cellCount);
const startIndices = new Uint32Array(cellCount + 1);

// Fill arrays (do this on data load or in Web Worker)
let vertexOffset = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const cellIdx = r * cols + c;
    startIndices[cellIdx] = vertexOffset / 2;

    // Quad vertices
    const x = c * cellSize, y = r * cellSize;
    positions[vertexOffset++] = x;
    positions[vertexOffset++] = y;
    positions[vertexOffset++] = x + cellSize;
    positions[vertexOffset++] = y;
    // ... remaining vertices

    charIndices[cellIdx] = CHAR_TO_INDEX[sequences[r][c]];
  }
}
startIndices[cellCount] = vertexOffset / 2;

// Create layer with binary data
new SolidPolygonLayer({
  data: {
    length: cellCount,
    startIndices,
    attributes: {
      getPolygon: { value: positions, size: 2 },
      getCharacterIndex: { value: charIndices, size: 1 }
    }
  },
  extensions: [new MSAColorExtension()],
  _normalize: false
});
```

---

## 5. Relevant Libraries and Tools

### 5.1 @luma.gl/core Texture API

```javascript
import { Texture } from '@luma.gl/core';

// Create texture from typed array
const data = new Uint8ClampedArray([...]);
const imageData = new ImageData(data, width, height);

const texture = device.createTexture({
  data: imageData,
  width,
  height,
  format: 'rgba8unorm',
  sampler: {
    minFilter: 'nearest',
    magFilter: 'nearest'
  }
});

// Use in shader via uniform
model.setUniforms({ uColorPalette: texture });
```

### 5.2 Existing MSA GPU Visualization Tools

| Tool                  | Technology    | GPU Approach                           |
| --------------------- | ------------- | -------------------------------------- |
| **MSAViewer (BioJS)** | Canvas 2D     | CPU rendering with canvas optimization |
| **AliView**           | Java/JOGL     | OpenGL direct rendering                |
| **Wasabi**            | WebGL         | Custom shaders for large alignments    |
| **Jalview**           | Java2D/OpenGL | Hybrid CPU/GPU                         |

**Key insight**: Most browser-based tools use Canvas 2D; GPU-accelerated web-based MSA viewers are rare, making this an opportunity for innovation.

### 5.3 deck.gl Layer Extensions (Built-in)

- `DataFilterExtension` - GPU-based visibility filtering
- `FillStyleExtension` - Pattern fills
- `PathStyleExtension` - Dashed lines
- `BrushingExtension` - Proximity-based effects

---

## 6. Recommended Implementation Approaches

### Approach A: Binary Attributes (Recommended First Step)
**Complexity**: Medium | **Performance Gain**: 3-5× | **Development Time**: 1-2 days

1. Pre-compute all cell positions as `Float32Array`
2. Pre-compute colors as `Uint8Array`
3. Move color scheme application to binary array generation
4. Use `_normalize: false` to skip deck.gl processing

```javascript
// In Web Worker or on data load
function buildMSABinaryData(sequences, colorScheme) {
  const cellCount = sequences.length * sequences[0].length;
  const positions = new Float32Array(cellCount * 8);
  const colors = new Uint8Array(cellCount * 4);
  // ... populate arrays
  return { positions, colors, cellCount };
}
```

### Approach B: Layer Extension for Selection (Recommended Second Step)
**Complexity**: Medium-High | **Performance Gain**: GPU-based dimming | **Development Time**: 2-3 days

1. Create `MSAColorExtension` extending `LayerExtension`
2. Move selection dimming logic to fragment shader
3. Pass selection bounds as uniforms
4. Update only uniforms when selection changes (no data re-upload)

### Approach C: Texture-Based Rendering (For Very Large Alignments)
**Complexity**: High | **Performance Gain**: 10× for >1M cells | **Development Time**: 3-5 days

1. Render MSA to ImageData in Web Worker
2. Use BitmapLayer with nearest-neighbor filtering
3. Overlay selection highlighting with separate PolygonLayer
4. Re-render texture only on color scheme change

### Approach D: Hybrid BitmapLayer + Interactive Overlay
**Complexity**: High | **Performance Gain**: Best of both worlds | **Development Time**: 5-7 days

1. BitmapLayer for static alignment colors
2. Thin PolygonLayer for selection overlay
3. Text layer for zoomed-in letters
4. Dynamic LOD based on zoom level

---

## 7. Complexity Assessment

| Approach            | Implementation Effort | Maintenance | Performance | Interactivity |
| ------------------- | --------------------- | ----------- | ----------- | ------------- |
| Binary Attributes   | ⭐⭐                    | ⭐⭐          | ⭐⭐⭐         | ⭐⭐⭐⭐⭐         |
| Layer Extension     | ⭐⭐⭐                   | ⭐⭐⭐         | ⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐         |
| BitmapLayer Texture | ⭐⭐⭐⭐                  | ⭐⭐          | ⭐⭐⭐⭐⭐       | ⭐⭐            |
| Hybrid Approach     | ⭐⭐⭐⭐⭐                 | ⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐          |

---

## 8. Implementation Recommendation

### Phase 1: Binary Attributes (Week 1)
- Modify `buildCellData()` to return typed arrays
- Update `createCellsLayer()` to use binary data format
- Move to Web Worker for background computation
- **Expected outcome**: 3-5× performance improvement for 50K+ cells

### Phase 2: Selection Extension (Week 2)
- Create `MSASelectionExtension` with shader injection
- Move dimming logic from `getFillColor` to GPU
- **Expected outcome**: Instant selection updates, no data re-upload

### Phase 3: Adaptive Rendering (Week 3)
- LOD system: BitmapLayer at low zoom, PolygonLayer at high zoom
- Viewport culling with DataFilterExtension
- **Expected outcome**: Handle 1M+ cells with smooth interaction

---

## References

1. [deck.gl Developer Guide: Writing Shaders](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders)
2. [deck.gl Layer Extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions)
3. [deck.gl Performance Optimization](https://deck.gl/docs/developer-guide/performance)
4. [luma.gl Texture API](https://luma.gl/docs/api-reference/core/resources/texture)
5. [BitmapLayer API](https://deck.gl/docs/api-reference/layers/bitmap-layer)
6. [Binary Attributes RFC](https://github.com/visgl/deck.gl/blob/master/dev-docs/RFCs/v7.2/binary-data-rfc.md)
