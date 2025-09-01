#version 300 es

// ----- PROLOGUE -------------------------

#define SHADER_NAME motion-blur-effect-0_fragment
#define SHADER_TYPE_FRAGMENT

#define APPLE_GPU
// Apple optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1

precision highp float;


// ----- APPLICATION DEFINES -------------------------



// ----- MODULE geometry ---------------

#define MODULE_GEOMETRY
#define SMOOTH_EDGE_RADIUS 0.5

struct FragmentGeometry {
  vec2 uv;
} geometry;

float smoothedge(float edge, float x) {
  return smoothstep(edge - SMOOTH_EDGE_RADIUS, edge + SMOOTH_EDGE_RADIUS, x);
}

// ----- MODULE motionBlur ---------------

#define MODULE_MOTIONBLUR

uniform int motionBlur_uSamples;
uniform float motionBlur_uIntensity;
uniform vec2 motionBlur_uBlurDir;

// Maximum number of taps supported
const int MAX_SAMPLES = 16;

// Main filter function that deck.gl will call
// CORRECTED: Added 'sampler2D tex' parameter to resolve scope issue.
vec4 motionBlur_filterColor(sampler2D tex, vec4 color, vec2 texSize, vec2 texCoord) {
  // Early exit if effect is disabled
  if (motionBlur_uIntensity < 0.01 || length(motionBlur_uBlurDir) < 0.01) {
    return color;
  }
  
  // Calculate blur offset
  vec2 texelSize = 1.0 / texSize;
  vec2 offset = motionBlur_uBlurDir * motionBlur_uIntensity * texelSize;
  
  // Accumulate samples
  vec4 result = vec4(0.0);
  float totalWeight = 0.0;
  
  for (int i = -MAX_SAMPLES; i <= MAX_SAMPLES; i++) {
    if (abs(i) <= motionBlur_uSamples) {
      float weight = 1.0 - abs(float(i)) / float(motionBlur_uSamples + 1);
      vec2 coord = texCoord + offset * float(i);
      
      // Clamp to texture bounds
      coord = clamp(coord, vec2(0.001), vec2(0.999));
      
      // Sample the color texture - deck.gl provides texSrc globally
      // CORRECTED: Use the 'tex' parameter instead of the out-of-scope 'texSrc'.
      result += texture(tex, coord) * weight;
      totalWeight += weight;
    }
  }
  
  // Normalize and mix
  if (totalWeight > 0.0) {
    result /= totalWeight;
  }
  
  return mix(color, result, motionBlur_uIntensity);
}

// ----- MODULE screen ---------------

#define MODULE_SCREEN
uniform screenUniforms {
  vec2 texSize;
} screen;

// ----- MAIN SHADER SOURCE -------------------------


void DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry) {
}
uniform sampler2D texSrc;

in vec2 position;
in vec2 coordinate;
in vec2 uv;

out vec4 fragColor;

void main() {
  fragColor = texture(texSrc, coordinate);
  // CORRECTED: Called the correct function 'motionBlur_filterColor' and passed 'texSrc' as an argument.
  fragColor = motionBlur_filterColor(texSrc, fragColor, screen.texSize, coordinate);
}
