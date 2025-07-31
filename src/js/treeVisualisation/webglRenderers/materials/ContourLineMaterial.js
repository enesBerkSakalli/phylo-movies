// materials/ContourLineMaterial.js
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * LineMaterial with an optional coloured contour (outline) around the base line.
 * ┌───────────────┐
 * │ baseColor     │
 * │ ────────────  │  ← inside  (|distFromCenter| < 1 – contourBand)
 * │  contourColor │
 * │────────────── │  ← outside (|distFromCenter| ≥ 1 – contourBand)
 * └───────────────┘
 */
export class ContourLineMaterial extends LineMaterial {

  constructor( {
    baseColor    = 0x000000,
    contourColor = 0x0000ff,
    contourWidth = 4,        // width of the outline in screen-pixels
    showContour  = false,
    ...lineParams              // anything accepted by THREE.LineMaterial
  } = {} ) {

    super( lineParams );

    //---------- custom uniforms ------------------------------------------------
    this.uniforms.contourColor = { value: new THREE.Color( contourColor ) };
    this.uniforms.baseColor    = { value: new THREE.Color( baseColor )    };
    this.uniforms.contourWidth = { value: contourWidth };
    this.uniforms.showContour  = { value: showContour  };

    //---------- inject GLSL ----------------------------------------------------
    this.onBeforeCompile = ( shader ) => {
      // expose our uniforms to the program
      Object.assign( shader.uniforms, this.uniforms );

      // add declarations
      shader.fragmentShader = shader.fragmentShader.replace(
        'uniform float opacity;',
        `uniform float opacity;
        uniform vec3  contourColor;
        uniform vec3  baseColor;
        uniform bool  showContour;
        uniform float contourWidth;`
      );

      // replace the final colour write with a dual-band mix
      shader.fragmentShader = shader.fragmentShader.replace(
        /gl_FragColor\s*=\s*vec4\( *diffuseColor\.rgb *, *alpha *\);/,
`float distFromCenter = abs( vUv.y - 0.5 ) * 2.0;   // 0 at centre, 1 at edge
float halfPx         = contourWidth / ( 2.0 * linewidth ); // px → 0-1 range
vec3  finalColor     = mix(
                          baseColor,
                          contourColor,
                          showContour ? smoothstep( 1.0 - halfPx - 0.02,
                                                   1.0 - halfPx + 0.02,
                                                   distFromCenter ) : 0.0
                      );
gl_FragColor = vec4( finalColor, alpha );`
      );
    };

    this.needsUpdate = true;
  }

  /* ----------------------------------------------------------------------- */
  /* Public helpers                                                          */
  /* ----------------------------------------------------------------------- */

  /**
   * Enable / update the two-colour outline.
   */
  setContour( contourColor, baseColor, contourWidth = 4, enabled = true ) {
    this.uniforms.contourColor.value.set( contourColor );
    this.uniforms.baseColor.value   .set( baseColor    );
    this.uniforms.contourWidth.value        = contourWidth;
    this.uniforms.showContour.value         = enabled;
    this.needsUpdate = true;
  }

  /**
   * Disable the outline and show just a single colour.
   */
  setSingleColor( color ) {
    this.uniforms.baseColor.value.set( color );
    this.uniforms.showContour.value = false;
    this.needsUpdate = true;
  }

  /* ----------------------------------------------------------------------- */
  /* Cloning / serialisation                                                 */
  /* ----------------------------------------------------------------------- */

  copy( source ) {
    super.copy( source );
    this.setContour(
      source.uniforms.contourColor.value,
      source.uniforms.baseColor.value,
      source.uniforms.contourWidth.value,
      source.uniforms.showContour.value
    );
    return this;
  }

  clone() {
    return new ContourLineMaterial().copy( this );
  }
}
