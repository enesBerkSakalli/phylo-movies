import{g as Wt}from"./dataService-18a31086.js";import{l as Ut,T as Zt,c as Ht,a as $t,L as Xt,p as qt,b as jt,C as Y,M as K,G as ct,d as Yt,e as Kt,f as Jt,P as Qt,g as nt,D as te,O as ee}from"./visualization-52554365.js";const ht=`precision highp int;

// #if (defined(SHADER_TYPE_FRAGMENT) && defined(LIGHTING_FRAGMENT)) || (defined(SHADER_TYPE_VERTEX) && defined(LIGHTING_VERTEX))
struct AmbientLight {
  vec3 color;
};

struct PointLight {
  vec3 color;
  vec3 position;
  vec3 attenuation; // 2nd order x:Constant-y:Linear-z:Exponential
};

struct DirectionalLight {
  vec3 color;
  vec3 direction;
};

uniform lightingUniforms {
  int enabled;
  int lightType;

  int directionalLightCount;
  int pointLightCount;

  vec3 ambientColor;

  vec3 lightColor0;
  vec3 lightPosition0;
  vec3 lightDirection0;
  vec3 lightAttenuation0;

  vec3 lightColor1;
  vec3 lightPosition1;
  vec3 lightDirection1;
  vec3 lightAttenuation1;

  vec3 lightColor2;
  vec3 lightPosition2;
  vec3 lightDirection2;
  vec3 lightAttenuation2;
} lighting;

PointLight lighting_getPointLight(int index) {
  switch (index) {
    case 0:
      return PointLight(lighting.lightColor0, lighting.lightPosition0, lighting.lightAttenuation0);
    case 1:
      return PointLight(lighting.lightColor1, lighting.lightPosition1, lighting.lightAttenuation1);
    case 2:
    default:  
      return PointLight(lighting.lightColor2, lighting.lightPosition2, lighting.lightAttenuation2);
  }
}

DirectionalLight lighting_getDirectionalLight(int index) {
  switch (index) {
    case 0:
      return DirectionalLight(lighting.lightColor0, lighting.lightDirection0);
    case 1:
      return DirectionalLight(lighting.lightColor1, lighting.lightDirection1);
    case 2:
    default:   
      return DirectionalLight(lighting.lightColor2, lighting.lightDirection2);
  }
} 

float getPointLightAttenuation(PointLight pointLight, float distance) {
  return pointLight.attenuation.x
       + pointLight.attenuation.y * distance
       + pointLight.attenuation.z * distance * distance;
}

// #endif
`,ie=`// #if (defined(SHADER_TYPE_FRAGMENT) && defined(LIGHTING_FRAGMENT)) || (defined(SHADER_TYPE_VERTEX) && defined(LIGHTING_VERTEX))
struct AmbientLight {
  color: vec3<f32>,
};

struct PointLight {
  color: vec3<f32>,
  position: vec3<f32>,
  attenuation: vec3<f32>, // 2nd order x:Constant-y:Linear-z:Exponential
};

struct DirectionalLight {
  color: vec3<f32>,
  direction: vec3<f32>,
};

struct lightingUniforms {
  enabled: i32,
  pointLightCount: i32,
  directionalLightCount: i32,

  ambientColor: vec3<f32>,

  // TODO - support multiple lights by uncommenting arrays below
  lightType: i32,
  lightColor: vec3<f32>,
  lightDirection: vec3<f32>,
  lightPosition: vec3<f32>,
  lightAttenuation: vec3<f32>,

  // AmbientLight ambientLight;
  // PointLight pointLight[MAX_LIGHTS];
  // DirectionalLight directionalLight[MAX_LIGHTS];
};

// Binding 0:1 is reserved for lighting (Note: could go into separate bind group as it is stable across draw calls)
@binding(1) @group(0) var<uniform> lighting : lightingUniforms;

fn lighting_getPointLight(index: i32) -> PointLight {
  return PointLight(lighting.lightColor, lighting.lightPosition, lighting.lightAttenuation);
}

fn lighting_getDirectionalLight(index: i32) -> DirectionalLight {
  return DirectionalLight(lighting.lightColor, lighting.lightDirection);
} 

fn getPointLightAttenuation(pointLight: PointLight, distance: f32) -> f32 {
  return pointLight.attenuation.x
       + pointLight.attenuation.y * distance
       + pointLight.attenuation.z * distance * distance;
}
`,wt=3,ne=255;var E;(function(e){e[e.POINT=0]="POINT",e[e.DIRECTIONAL=1]="DIRECTIONAL"})(E||(E={}));const W={props:{},uniforms:{},name:"lighting",defines:{MAX_LIGHTS:wt},uniformTypes:{enabled:"i32",lightType:"i32",directionalLightCount:"i32",pointLightCount:"i32",ambientLightColor:"vec3<f32>",lightColor0:"vec3<f32>",lightPosition0:"vec3<f32>",lightDirection0:"vec3<f32>",lightAttenuation0:"vec3<f32>",lightColor1:"vec3<f32>",lightPosition1:"vec3<f32>",lightDirection1:"vec3<f32>",lightAttenuation1:"vec3<f32>",lightColor2:"vec3<f32>",lightPosition2:"vec3<f32>",lightDirection2:"vec3<f32>",lightAttenuation2:"vec3<f32>"},defaultUniforms:{enabled:1,lightType:E.POINT,directionalLightCount:0,pointLightCount:0,ambientLightColor:[.1,.1,.1],lightColor0:[1,1,1],lightPosition0:[1,1,2],lightDirection0:[1,1,1],lightAttenuation0:[1,0,0],lightColor1:[1,1,1],lightPosition1:[1,1,2],lightDirection1:[1,1,1],lightAttenuation1:[1,0,0],lightColor2:[1,1,1],lightPosition2:[1,1,2],lightDirection2:[1,1,1],lightAttenuation2:[1,0,0]},source:ie,vs:ht,fs:ht,getUniforms:oe};function oe(e,t={}){if(e=e&&{...e},!e)return{...W.defaultUniforms};e.lights&&(e={...e,...se(e.lights),lights:void 0});const{ambientLight:i,pointLights:n,directionalLights:o}=e||{};if(!(i||n&&n.length>0||o&&o.length>0))return{...W.defaultUniforms,enabled:0};const s={...W.defaultUniforms,...t,...re({ambientLight:i,pointLights:n,directionalLights:o})};return e.enabled!==void 0&&(s.enabled=e.enabled?1:0),s}function re({ambientLight:e,pointLights:t=[],directionalLights:i=[]}){const n={};n.ambientLightColor=J(e);let o=0;for(const r of t){n.lightType=E.POINT;const s=o;n[`lightColor${s}`]=J(r),n[`lightPosition${s}`]=r.position,n[`lightAttenuation${s}`]=r.attenuation||[1,0,0],o++}for(const r of i){n.lightType=E.DIRECTIONAL;const s=o;n[`lightColor${s}`]=J(r),n[`lightDirection${s}`]=r.direction,o++}return o>wt&&Ut.warn("MAX_LIGHTS exceeded")(),n.directionalLightCount=i.length,n.pointLightCount=t.length,n}function se(e){var i,n;const t={pointLights:[],directionalLights:[]};for(const o of e||[])switch(o.type){case"ambient":t.ambientLight=o;break;case"directional":(i=t.directionalLights)==null||i.push(o);break;case"point":(n=t.pointLights)==null||n.push(o);break}return t}function J(e={}){const{color:t=[0,0,0],intensity:i=1}=e;return t.map(n=>n*i/ne)}const le=`uniform phongMaterialUniforms {
  uniform float ambient;
  uniform float diffuse;
  uniform float shininess;
  uniform vec3  specularColor;
} material;
`,ae=`uniform phongMaterialUniforms {
  uniform float ambient;
  uniform float diffuse;
  uniform float shininess;
  uniform vec3  specularColor;
} material;

vec3 lighting_getLightColor(vec3 surfaceColor, vec3 light_direction, vec3 view_direction, vec3 normal_worldspace, vec3 color) {
  vec3 halfway_direction = normalize(light_direction + view_direction);
  float lambertian = dot(light_direction, normal_worldspace);
  float specular = 0.0;
  if (lambertian > 0.0) {
    float specular_angle = max(dot(normal_worldspace, halfway_direction), 0.0);
    specular = pow(specular_angle, material.shininess);
  }
  lambertian = max(lambertian, 0.0);
  return (lambertian * material.diffuse * surfaceColor + specular * material.specularColor) * color;
}

vec3 lighting_getLightColor(vec3 surfaceColor, vec3 cameraPosition, vec3 position_worldspace, vec3 normal_worldspace) {
  vec3 lightColor = surfaceColor;

  if (lighting.enabled == 0) {
    return lightColor;
  }

  vec3 view_direction = normalize(cameraPosition - position_worldspace);
  lightColor = material.ambient * surfaceColor * lighting.ambientColor;

  for (int i = 0; i < lighting.pointLightCount; i++) {
    PointLight pointLight = lighting_getPointLight(i);
    vec3 light_position_worldspace = pointLight.position;
    vec3 light_direction = normalize(light_position_worldspace - position_worldspace);
    float light_attenuation = getPointLightAttenuation(pointLight, distance(light_position_worldspace, position_worldspace));
    lightColor += lighting_getLightColor(surfaceColor, light_direction, view_direction, normal_worldspace, pointLight.color / light_attenuation);
  }

  int totalLights = min(MAX_LIGHTS, lighting.pointLightCount + lighting.directionalLightCount);
  for (int i = lighting.pointLightCount; i < totalLights; i++) {
    DirectionalLight directionalLight = lighting_getDirectionalLight(i);
    lightColor += lighting_getLightColor(surfaceColor, -directionalLight.direction, view_direction, normal_worldspace, directionalLight.color);
  }
  
  return lightColor;
}
`,ce=`struct phongMaterialUniforms {
  ambient: f32,
  diffuse: f32,
  shininess: f32,
  specularColor: vec3<f32>,
};

@binding(2) @group(0) var<uniform> phongMaterial : phongMaterialUniforms;

fn lighting_getLightColor(surfaceColor: vec3<f32>, light_direction: vec3<f32>, view_direction: vec3<f32>, normal_worldspace: vec3<f32>, color: vec3<f32>) -> vec3<f32> {
  let halfway_direction: vec3<f32> = normalize(light_direction + view_direction);
  var lambertian: f32 = dot(light_direction, normal_worldspace);
  var specular: f32 = 0.0;
  if (lambertian > 0.0) {
    let specular_angle = max(dot(normal_worldspace, halfway_direction), 0.0);
    specular = pow(specular_angle, phongMaterial.shininess);
  }
  lambertian = max(lambertian, 0.0);
  return (lambertian * phongMaterial.diffuse * surfaceColor + specular * phongMaterial.specularColor) * color;
}

fn lighting_getLightColor2(surfaceColor: vec3<f32>, cameraPosition: vec3<f32>, position_worldspace: vec3<f32>, normal_worldspace: vec3<f32>) -> vec3<f32> {
  var lightColor: vec3<f32> = surfaceColor;

  if (lighting.enabled == 0) {
    return lightColor;
  }

  let view_direction: vec3<f32> = normalize(cameraPosition - position_worldspace);
  lightColor = phongMaterial.ambient * surfaceColor * lighting.ambientColor;

  if (lighting.lightType == 0) {
    let pointLight: PointLight  = lighting_getPointLight(0);
    let light_position_worldspace: vec3<f32> = pointLight.position;
    let light_direction: vec3<f32> = normalize(light_position_worldspace - position_worldspace);
    lightColor += lighting_getLightColor(surfaceColor, light_direction, view_direction, normal_worldspace, pointLight.color);
  } else if (lighting.lightType == 1) {
    var directionalLight: DirectionalLight = lighting_getDirectionalLight(0);
    lightColor += lighting_getLightColor(surfaceColor, -directionalLight.direction, view_direction, normal_worldspace, directionalLight.color);
  }
  
  return lightColor;
  /*
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= lighting.pointLightCount) {
      break;
    }
    PointLight pointLight = lighting.pointLight[i];
    vec3 light_position_worldspace = pointLight.position;
    vec3 light_direction = normalize(light_position_worldspace - position_worldspace);
    lightColor += lighting_getLightColor(surfaceColor, light_direction, view_direction, normal_worldspace, pointLight.color);
  }

  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= lighting.directionalLightCount) {
      break;
    }
    DirectionalLight directionalLight = lighting.directionalLight[i];
    lightColor += lighting_getLightColor(surfaceColor, -directionalLight.direction, view_direction, normal_worldspace, directionalLight.color);
  }
  */
}

fn lighting_getSpecularLightColor(cameraPosition: vec3<f32>, position_worldspace: vec3<f32>, normal_worldspace: vec3<f32>) -> vec3<f32>{
  var lightColor = vec3<f32>(0, 0, 0);
  let surfaceColor = vec3<f32>(0, 0, 0);

  if (lighting.enabled == 0) {
    let view_direction = normalize(cameraPosition - position_worldspace);

    switch (lighting.lightType) {
      case 0, default: {
        let pointLight: PointLight = lighting_getPointLight(0);
        let light_position_worldspace: vec3<f32> = pointLight.position;
        let light_direction: vec3<f32> = normalize(light_position_worldspace - position_worldspace);
        lightColor += lighting_getLightColor(surfaceColor, light_direction, view_direction, normal_worldspace, pointLight.color);
      }
      case 1: {
        let directionalLight: DirectionalLight = lighting_getDirectionalLight(0);
        lightColor += lighting_getLightColor(surfaceColor, -directionalLight.direction, view_direction, normal_worldspace, directionalLight.color);
      }
    }
  }
  return lightColor;
}
`,_t={props:{},name:"gouraudMaterial",vs:ae.replace("phongMaterial","gouraudMaterial"),fs:le.replace("phongMaterial","gouraudMaterial"),source:ce.replaceAll("phongMaterial","gouraudMaterial"),defines:{LIGHTING_VERTEX:1},dependencies:[W],uniformTypes:{ambient:"f32",diffuse:"f32",shininess:"f32",specularColor:"vec3<f32>"},defaultUniforms:{ambient:.35,diffuse:.6,shininess:32,specularColor:[.15,.15,.15]},getUniforms(e){const t={...e};return t.specularColor&&(t.specularColor=t.specularColor.map(i=>i/255)),{..._t.defaultUniforms,...t}}},Pt={CLOCKWISE:1,COUNTER_CLOCKWISE:-1};function bt(e,t,i={}){return he(e,i)!==t?(ue(e,i),!0):!1}function he(e,t={}){return Math.sign(ge(e,t))}const gt={x:0,y:1,z:2};function ge(e,t={}){const{start:i=0,end:n=e.length,plane:o="xy"}=t,r=t.size||2;let s=0;const l=gt[o[0]],c=gt[o[1]];for(let a=i,h=n-r;a<n;a+=r)s+=(e[a+l]-e[h+l])*(e[a+c]+e[h+c]),h=a;return s/2}function ue(e,t){const{start:i=0,end:n=e.length,size:o=2}=t,r=(n-i)/o,s=Math.floor(r/2);for(let l=0;l<s;++l){const c=i+l*o,a=i+(r-1-l)*o;for(let h=0;h<o;++h){const u=e[c+h];e[c+h]=e[a+h],e[a+h]=u}}}var ot={exports:{}};ot.exports=X;ot.exports.default=X;function X(e,t,i){i=i||2;var n=t&&t.length,o=n?t[0]*i:e.length,r=St(e,0,o,i,!0),s=[];if(!r||r.next===r.prev)return s;var l,c,a,h,u,g,f;if(n&&(r=ve(e,t,r,i)),e.length>80*i){l=a=e[0],c=h=e[1];for(var d=i;d<o;d+=i)u=e[d],g=e[d+1],u<l&&(l=u),g<c&&(c=g),u>a&&(a=u),g>h&&(h=g);f=Math.max(a-l,h-c),f=f!==0?32767/f:0}return z(r,s,i,l,c,f,0),s}function St(e,t,i,n,o){var r,s;if(o===it(e,t,i,n)>0)for(r=t;r<i;r+=n)s=ut(r,e[r],e[r+1],s);else for(r=i-n;r>=t;r-=n)s=ut(r,e[r],e[r+1],s);return s&&q(s,s.next)&&(G(s),s=s.next),s}function T(e,t){if(!e)return e;t||(t=e);var i=e,n;do if(n=!1,!i.steiner&&(q(i,i.next)||v(i.prev,i,i.next)===0)){if(G(i),i=t=i.prev,i===i.next)break;n=!0}else i=i.next;while(n||i!==t);return t}function z(e,t,i,n,o,r,s){if(e){!s&&r&&we(e,n,o,r);for(var l=e,c,a;e.prev!==e.next;){if(c=e.prev,a=e.next,r?fe(e,n,o,r):de(e)){t.push(c.i/i|0),t.push(e.i/i|0),t.push(a.i/i|0),G(e),e=a.next,l=a.next;continue}if(e=a,e===l){s?s===1?(e=pe(T(e),t,i),z(e,t,i,n,o,r,2)):s===2&&me(e,t,i,n,o,r):z(T(e),t,i,n,o,r,1);break}}}}function de(e){var t=e.prev,i=e,n=e.next;if(v(t,i,n)>=0)return!1;for(var o=t.x,r=i.x,s=n.x,l=t.y,c=i.y,a=n.y,h=o<r?o<s?o:s:r<s?r:s,u=l<c?l<a?l:a:c<a?c:a,g=o>r?o>s?o:s:r>s?r:s,f=l>c?l>a?l:a:c>a?c:a,d=n.next;d!==t;){if(d.x>=h&&d.x<=g&&d.y>=u&&d.y<=f&&D(o,l,r,c,s,a,d.x,d.y)&&v(d.prev,d,d.next)>=0)return!1;d=d.next}return!0}function fe(e,t,i,n){var o=e.prev,r=e,s=e.next;if(v(o,r,s)>=0)return!1;for(var l=o.x,c=r.x,a=s.x,h=o.y,u=r.y,g=s.y,f=l<c?l<a?l:a:c<a?c:a,d=h<u?h<g?h:g:u<g?u:g,x=l>c?l>a?l:a:c>a?c:a,L=h>u?h>g?h:g:u>g?u:g,_=tt(f,d,t,i,n),A=tt(x,L,t,i,n),m=e.prevZ,p=e.nextZ;m&&m.z>=_&&p&&p.z<=A;){if(m.x>=f&&m.x<=x&&m.y>=d&&m.y<=L&&m!==o&&m!==s&&D(l,h,c,u,a,g,m.x,m.y)&&v(m.prev,m,m.next)>=0||(m=m.prevZ,p.x>=f&&p.x<=x&&p.y>=d&&p.y<=L&&p!==o&&p!==s&&D(l,h,c,u,a,g,p.x,p.y)&&v(p.prev,p,p.next)>=0))return!1;p=p.nextZ}for(;m&&m.z>=_;){if(m.x>=f&&m.x<=x&&m.y>=d&&m.y<=L&&m!==o&&m!==s&&D(l,h,c,u,a,g,m.x,m.y)&&v(m.prev,m,m.next)>=0)return!1;m=m.prevZ}for(;p&&p.z<=A;){if(p.x>=f&&p.x<=x&&p.y>=d&&p.y<=L&&p!==o&&p!==s&&D(l,h,c,u,a,g,p.x,p.y)&&v(p.prev,p,p.next)>=0)return!1;p=p.nextZ}return!0}function pe(e,t,i){var n=e;do{var o=n.prev,r=n.next.next;!q(o,r)&&At(o,n,n.next,r)&&N(o,r)&&N(r,o)&&(t.push(o.i/i|0),t.push(n.i/i|0),t.push(r.i/i|0),G(n),G(n.next),n=e=r),n=n.next}while(n!==e);return T(n)}function me(e,t,i,n,o,r){var s=e;do{for(var l=s.next.next;l!==s.prev;){if(s.i!==l.i&&be(s,l)){var c=Mt(s,l);s=T(s,s.next),c=T(c,c.next),z(s,t,i,n,o,r,0),z(c,t,i,n,o,r,0);return}l=l.next}s=s.next}while(s!==e)}function ve(e,t,i,n){var o=[],r,s,l,c,a;for(r=0,s=t.length;r<s;r++)l=t[r]*n,c=r<s-1?t[r+1]*n:e.length,a=St(e,l,c,n,!1),a===a.next&&(a.steiner=!0),o.push(Pe(a));for(o.sort(xe),r=0;r<o.length;r++)i=ye(o[r],i);return i}function xe(e,t){return e.x-t.x}function ye(e,t){var i=Le(e,t);if(!i)return t;var n=Mt(i,e);return T(n,n.next),T(i,i.next)}function Le(e,t){var i=t,n=e.x,o=e.y,r=-1/0,s;do{if(o<=i.y&&o>=i.next.y&&i.next.y!==i.y){var l=i.x+(o-i.y)*(i.next.x-i.x)/(i.next.y-i.y);if(l<=n&&l>r&&(r=l,s=i.x<i.next.x?i:i.next,l===n))return s}i=i.next}while(i!==t);if(!s)return null;var c=s,a=s.x,h=s.y,u=1/0,g;i=s;do n>=i.x&&i.x>=a&&n!==i.x&&D(o<h?n:r,o,a,h,o<h?r:n,o,i.x,i.y)&&(g=Math.abs(o-i.y)/(n-i.x),N(i,e)&&(g<u||g===u&&(i.x>s.x||i.x===s.x&&Ce(s,i)))&&(s=i,u=g)),i=i.next;while(i!==c);return s}function Ce(e,t){return v(e.prev,e,t.prev)<0&&v(t.next,e,e.next)<0}function we(e,t,i,n){var o=e;do o.z===0&&(o.z=tt(o.x,o.y,t,i,n)),o.prevZ=o.prev,o.nextZ=o.next,o=o.next;while(o!==e);o.prevZ.nextZ=null,o.prevZ=null,_e(o)}function _e(e){var t,i,n,o,r,s,l,c,a=1;do{for(i=e,e=null,r=null,s=0;i;){for(s++,n=i,l=0,t=0;t<a&&(l++,n=n.nextZ,!!n);t++);for(c=a;l>0||c>0&&n;)l!==0&&(c===0||!n||i.z<=n.z)?(o=i,i=i.nextZ,l--):(o=n,n=n.nextZ,c--),r?r.nextZ=o:e=o,o.prevZ=r,r=o;i=n}r.nextZ=null,a*=2}while(s>1);return e}function tt(e,t,i,n,o){return e=(e-i)*o|0,t=(t-n)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Pe(e){var t=e,i=e;do(t.x<i.x||t.x===i.x&&t.y<i.y)&&(i=t),t=t.next;while(t!==e);return i}function D(e,t,i,n,o,r,s,l){return(o-s)*(t-l)>=(e-s)*(r-l)&&(e-s)*(n-l)>=(i-s)*(t-l)&&(i-s)*(r-l)>=(o-s)*(n-l)}function be(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!Se(e,t)&&(N(e,t)&&N(t,e)&&Ae(e,t)&&(v(e.prev,e,t.prev)||v(e,t.prev,t))||q(e,t)&&v(e.prev,e,e.next)>0&&v(t.prev,t,t.next)>0)}function v(e,t,i){return(t.y-e.y)*(i.x-t.x)-(t.x-e.x)*(i.y-t.y)}function q(e,t){return e.x===t.x&&e.y===t.y}function At(e,t,i,n){var o=F(v(e,t,i)),r=F(v(e,t,n)),s=F(v(i,n,e)),l=F(v(i,n,t));return!!(o!==r&&s!==l||o===0&&k(e,i,t)||r===0&&k(e,n,t)||s===0&&k(i,e,n)||l===0&&k(i,t,n))}function k(e,t,i){return t.x<=Math.max(e.x,i.x)&&t.x>=Math.min(e.x,i.x)&&t.y<=Math.max(e.y,i.y)&&t.y>=Math.min(e.y,i.y)}function F(e){return e>0?1:e<0?-1:0}function Se(e,t){var i=e;do{if(i.i!==e.i&&i.next.i!==e.i&&i.i!==t.i&&i.next.i!==t.i&&At(i,i.next,e,t))return!0;i=i.next}while(i!==e);return!1}function N(e,t){return v(e.prev,e,e.next)<0?v(e,t,e.next)>=0&&v(e,e.prev,t)>=0:v(e,t,e.prev)<0||v(e,e.next,t)<0}function Ae(e,t){var i=e,n=!1,o=(e.x+t.x)/2,r=(e.y+t.y)/2;do i.y>r!=i.next.y>r&&i.next.y!==i.y&&o<(i.next.x-i.x)*(r-i.y)/(i.next.y-i.y)+i.x&&(n=!n),i=i.next;while(i!==e);return n}function Mt(e,t){var i=new et(e.i,e.x,e.y),n=new et(t.i,t.x,t.y),o=e.next,r=t.prev;return e.next=t,t.prev=e,i.next=o,o.prev=i,n.next=i,i.prev=n,r.next=n,n.prev=r,n}function ut(e,t,i,n){var o=new et(e,t,i);return n?(o.next=n.next,o.prev=n,n.next.prev=o,n.next=o):(o.prev=o,o.next=o),o}function G(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function et(e,t,i){this.i=e,this.x=t,this.y=i,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}X.deviation=function(e,t,i,n){var o=t&&t.length,r=o?t[0]*i:e.length,s=Math.abs(it(e,0,r,i));if(o)for(var l=0,c=t.length;l<c;l++){var a=t[l]*i,h=l<c-1?t[l+1]*i:e.length;s-=Math.abs(it(e,a,h,i))}var u=0;for(l=0;l<n.length;l+=3){var g=n[l]*i,f=n[l+1]*i,d=n[l+2]*i;u+=Math.abs((e[g]-e[d])*(e[f+1]-e[g+1])-(e[g]-e[f])*(e[d+1]-e[g+1]))}return s===0&&u===0?0:Math.abs((u-s)/s)};function it(e,t,i,n){for(var o=0,r=t,s=i-n;r<i;r+=n)o+=(e[s]-e[r])*(e[r+1]+e[s+1]),s=r;return o}X.flatten=function(e){for(var t=e[0][0].length,i={vertices:[],holes:[],dimensions:t},n=0,o=0;o<e.length;o++){for(var r=0;r<e[o].length;r++)for(var s=0;s<t;s++)i.vertices.push(e[o][r][s]);o>0&&(n+=e[o-1].length,i.holes.push(n))}return i};var Me=ot.exports;const Te=Wt(Me),O=Pt.CLOCKWISE,dt=Pt.COUNTER_CLOCKWISE,b={isClosed:!0};function De(e){if(e=e&&e.positions||e,!Array.isArray(e)&&!ArrayBuffer.isView(e))throw new Error("invalid polygon")}function I(e){return"positions"in e?e.positions:e}function U(e){return"holeIndices"in e?e.holeIndices:null}function Ie(e){return Array.isArray(e[0])}function Re(e){return e.length>=1&&e[0].length>=2&&Number.isFinite(e[0][0])}function Ee(e){const t=e[0],i=e[e.length-1];return t[0]===i[0]&&t[1]===i[1]&&t[2]===i[2]}function ze(e,t,i,n){for(let o=0;o<t;o++)if(e[i+o]!==e[n-t+o])return!1;return!0}function ft(e,t,i,n,o){let r=t;const s=i.length;for(let l=0;l<s;l++)for(let c=0;c<n;c++)e[r++]=i[l][c]||0;if(!Ee(i))for(let l=0;l<n;l++)e[r++]=i[0][l]||0;return b.start=t,b.end=r,b.size=n,bt(e,o,b),r}function pt(e,t,i,n,o=0,r,s){r=r||i.length;const l=r-o;if(l<=0)return t;let c=t;for(let a=0;a<l;a++)e[c++]=i[o+a];if(!ze(i,n,o,r))for(let a=0;a<n;a++)e[c++]=i[o+a];return b.start=t,b.end=c,b.size=n,bt(e,s,b),c}function Tt(e,t){De(e);const i=[],n=[];if("positions"in e){const{positions:o,holeIndices:r}=e;if(r){let s=0;for(let l=0;l<=r.length;l++)s=pt(i,s,o,t,r[l-1],r[l],l===0?O:dt),n.push(s);return n.pop(),{positions:i,holeIndices:n}}e=o}if(!Ie(e))return pt(i,0,e,t,0,i.length,O),i;if(!Re(e)){let o=0;for(const[r,s]of e.entries())o=ft(i,o,s,t,r===0?O:dt),n.push(o);return n.pop(),{positions:i,holeIndices:n}}return ft(i,0,e,t,O),i}function Q(e,t,i){const n=e.length/3;let o=0;for(let r=0;r<n;r++){const s=(r+1)%n;o+=e[r*3+t]*e[s*3+i],o-=e[s*3+t]*e[r*3+i]}return Math.abs(o/2)}function mt(e,t,i,n){const o=e.length/3;for(let r=0;r<o;r++){const s=r*3,l=e[s+0],c=e[s+1],a=e[s+2];e[s+t]=l,e[s+i]=c,e[s+n]=a}}function Ne(e,t,i,n){let o=U(e);o&&(o=o.map(l=>l/t));let r=I(e);const s=n&&t===3;if(i){const l=r.length;r=r.slice();const c=[];for(let a=0;a<l;a+=t){c[0]=r[a],c[1]=r[a+1],s&&(c[2]=r[a+2]);const h=i(c);r[a]=h[0],r[a+1]=h[1],s&&(r[a+2]=h[2])}}if(s){const l=Q(r,0,1),c=Q(r,0,2),a=Q(r,1,2);if(!l&&!c&&!a)return[];l>c&&l>a||(c>a?(i||(r=r.slice()),mt(r,0,2,1)):(i||(r=r.slice()),mt(r,2,0,1)))}return Te(r,o,t)}class Ge extends Zt{constructor(t){const{fp64:i,IndexType:n=Uint32Array}=t;super({...t,attributes:{positions:{size:3,type:i?Float64Array:Float32Array},vertexValid:{type:Uint16Array,size:1},indices:{type:n,size:1}}})}get(t){const{attributes:i}=this;return t==="indices"?i.indices&&i.indices.subarray(0,this.vertexCount):i[t]}updateGeometry(t){super.updateGeometry(t);const i=this.buffers.indices;if(i)this.vertexCount=(i.value||i).length;else if(this.data&&!this.getGeometry)throw new Error("missing indices buffer")}normalizeGeometry(t){if(this.normalize){const i=Tt(t,this.positionSize);return this.opts.resolution?Ht(I(i),U(i),{size:this.positionSize,gridResolution:this.opts.resolution,edgeTypes:!0}):this.opts.wrapLongitude?$t(I(i),U(i),{size:this.positionSize,maxLatitude:86,edgeTypes:!0}):i}return t}getGeometrySize(t){if(vt(t)){let i=0;for(const n of t)i+=this.getGeometrySize(n);return i}return I(t).length/this.positionSize}getGeometryFromBuffer(t){return this.normalize||!this.buffers.indices?super.getGeometryFromBuffer(t):null}updateGeometryAttributes(t,i){if(t&&vt(t))for(const n of t){const o=this.getGeometrySize(n);i.geometrySize=o,this.updateGeometryAttributes(n,i),i.vertexStart+=o,i.indexStart=this.indexStarts[i.geometryIndex+1]}else{const n=t;this._updateIndices(n,i),this._updatePositions(n,i),this._updateVertexValid(n,i)}}_updateIndices(t,{geometryIndex:i,vertexStart:n,indexStart:o}){const{attributes:r,indexStarts:s,typedArrayManager:l}=this;let c=r.indices;if(!c||!t)return;let a=o;const h=Ne(t,this.positionSize,this.opts.preproject,this.opts.full3d);c=l.allocate(c,o+h.length,{copy:!0});for(let u=0;u<h.length;u++)c[a++]=h[u]+n;s[i+1]=o+h.length,r.indices=c}_updatePositions(t,{vertexStart:i,geometrySize:n}){const{attributes:{positions:o},positionSize:r}=this;if(!o||!t)return;const s=I(t);for(let l=i,c=0;c<n;l++,c++){const a=s[c*r],h=s[c*r+1],u=r>2?s[c*r+2]:0;o[l*3]=a,o[l*3+1]=h,o[l*3+2]=u}}_updateVertexValid(t,{vertexStart:i,geometrySize:n}){const{positionSize:o}=this,r=this.attributes.vertexValid,s=t&&U(t);if(t&&t.edgeTypes?r.set(t.edgeTypes,i):r.fill(1,i,i+n),s)for(let l=0;l<s.length;l++)r[i+s[l]/o-1]=0;r[i+n-1]=0}}function vt(e){return Array.isArray(e)&&e.length>0&&!Number.isFinite(e[0])}const xt=`uniform solidPolygonUniforms {
  bool extruded;
  bool isWireframe;
  float elevationScale;
} solidPolygon;
`,ke={name:"solidPolygon",vs:xt,fs:xt,uniformTypes:{extruded:"f32",isWireframe:"f32",elevationScale:"f32"}},Dt=`in vec4 fillColors;
in vec4 lineColors;
in vec3 pickingColors;
out vec4 vColor;
struct PolygonProps {
vec3 positions;
vec3 positions64Low;
vec3 normal;
float elevations;
};
vec3 project_offset_normal(vec3 vector) {
if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT ||
project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT_OFFSETS) {
return normalize(vector * project.commonUnitsPerWorldUnit);
}
return project_normal(vector);
}
void calculatePosition(PolygonProps props) {
vec3 pos = props.positions;
vec3 pos64Low = props.positions64Low;
vec3 normal = props.normal;
vec4 colors = solidPolygon.isWireframe ? lineColors : fillColors;
geometry.worldPosition = props.positions;
geometry.pickingColor = pickingColors;
if (solidPolygon.extruded) {
pos.z += props.elevations * solidPolygon.elevationScale;
}
gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.), geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
if (solidPolygon.extruded) {
#ifdef IS_SIDE_VERTEX
normal = project_offset_normal(normal);
#else
normal = project_normal(normal);
#endif
geometry.normal = normal;
vec3 lightColor = lighting_getLightColor(colors.rgb, project.cameraPosition, geometry.position.xyz, geometry.normal);
vColor = vec4(lightColor, colors.a * layer.opacity);
} else {
vColor = vec4(colors.rgb, colors.a * layer.opacity);
}
DECKGL_FILTER_COLOR(vColor, geometry);
}
`,Fe=`#version 300 es
#define SHADER_NAME solid-polygon-layer-vertex-shader
in vec3 vertexPositions;
in vec3 vertexPositions64Low;
in float elevations;
${Dt}
void main(void) {
PolygonProps props;
props.positions = vertexPositions;
props.positions64Low = vertexPositions64Low;
props.elevations = elevations;
props.normal = vec3(0.0, 0.0, 1.0);
calculatePosition(props);
}
`,Oe=`#version 300 es
#define SHADER_NAME solid-polygon-layer-vertex-shader-side
#define IS_SIDE_VERTEX
in vec2 positions;
in vec3 vertexPositions;
in vec3 nextVertexPositions;
in vec3 vertexPositions64Low;
in vec3 nextVertexPositions64Low;
in float elevations;
in float instanceVertexValid;
${Dt}
void main(void) {
if(instanceVertexValid < 0.5){
gl_Position = vec4(0.);
return;
}
PolygonProps props;
vec3 pos;
vec3 pos64Low;
vec3 nextPos;
vec3 nextPos64Low;
#if RING_WINDING_ORDER_CW == 1
pos = vertexPositions;
pos64Low = vertexPositions64Low;
nextPos = nextVertexPositions;
nextPos64Low = nextVertexPositions64Low;
#else
pos = nextVertexPositions;
pos64Low = nextVertexPositions64Low;
nextPos = vertexPositions;
nextPos64Low = vertexPositions64Low;
#endif
props.positions = mix(pos, nextPos, positions.x);
props.positions64Low = mix(pos64Low, nextPos64Low, positions.x);
props.normal = vec3(
pos.y - nextPos.y + (pos64Low.y - nextPos64Low.y),
nextPos.x - pos.x + (nextPos64Low.x - pos64Low.x),
0.0);
props.elevations = elevations * positions.y;
calculatePosition(props);
}
`,Ve=`#version 300 es
#define SHADER_NAME solid-polygon-layer-fragment-shader
precision highp float;
in vec4 vColor;
out vec4 fragColor;
void main(void) {
fragColor = vColor;
geometry.uv = vec2(0.);
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`,Z=[0,0,0,255],Be={filled:!0,extruded:!1,wireframe:!1,_normalize:!0,_windingOrder:"CW",_full3d:!1,elevationScale:{type:"number",min:0,value:1},getPolygon:{type:"accessor",value:e=>e.polygon},getElevation:{type:"accessor",value:1e3},getFillColor:{type:"accessor",value:Z},getLineColor:{type:"accessor",value:Z},material:!0},V={enter:(e,t)=>t.length?t.subarray(t.length-e.length):e};class rt extends Xt{getShaders(t){return super.getShaders({vs:t==="top"?Fe:Oe,fs:Ve,defines:{RING_WINDING_ORDER_CW:!this.props._normalize&&this.props._windingOrder==="CCW"?0:1},modules:[qt,_t,jt,ke]})}get wrapLongitude(){return!1}getBounds(){var t;return(t=this.getAttributeManager())==null?void 0:t.getBounds(["vertexPositions"])}initializeState(){const{viewport:t}=this.context;let{coordinateSystem:i}=this.props;const{_full3d:n}=this.props;t.isGeospatial&&i===Y.DEFAULT&&(i=Y.LNGLAT);let o;i===Y.LNGLAT&&(n?o=t.projectPosition.bind(t):o=t.projectFlat.bind(t)),this.setState({numInstances:0,polygonTesselator:new Ge({preproject:o,fp64:this.use64bitPositions(),IndexType:Uint32Array})});const r=this.getAttributeManager(),s=!0;r.remove(["instancePickingColors"]),r.add({indices:{size:1,isIndexed:!0,update:this.calculateIndices,noAlloc:s},vertexPositions:{size:3,type:"float64",stepMode:"dynamic",fp64:this.use64bitPositions(),transition:V,accessor:"getPolygon",update:this.calculatePositions,noAlloc:s,shaderAttributes:{nextVertexPositions:{vertexOffset:1}}},instanceVertexValid:{size:1,type:"uint16",stepMode:"instance",update:this.calculateVertexValid,noAlloc:s},elevations:{size:1,stepMode:"dynamic",transition:V,accessor:"getElevation"},fillColors:{size:this.props.colorFormat.length,type:"unorm8",stepMode:"dynamic",transition:V,accessor:"getFillColor",defaultValue:Z},lineColors:{size:this.props.colorFormat.length,type:"unorm8",stepMode:"dynamic",transition:V,accessor:"getLineColor",defaultValue:Z},pickingColors:{size:4,type:"uint8",stepMode:"dynamic",accessor:(l,{index:c,target:a})=>this.encodePickingColor(l&&l.__source?l.__source.index:c,a)}})}getPickingInfo(t){const i=super.getPickingInfo(t),{index:n}=i,o=this.props.data;return o[0]&&o[0].__source&&(i.object=o.find(r=>r.__source.index===n)),i}disablePickingIndex(t){const i=this.props.data;if(i[0]&&i[0].__source)for(let n=0;n<i.length;n++)i[n].__source.index===t&&this._disablePickingIndex(n);else super.disablePickingIndex(t)}draw({uniforms:t}){const{extruded:i,filled:n,wireframe:o,elevationScale:r}=this.props,{topModel:s,sideModel:l,wireframeModel:c,polygonTesselator:a}=this.state,h={extruded:!!i,elevationScale:r,isWireframe:!1};c&&o&&(c.setInstanceCount(a.instanceCount-1),c.shaderInputs.setProps({solidPolygon:{...h,isWireframe:!0}}),c.draw(this.context.renderPass)),l&&n&&(l.setInstanceCount(a.instanceCount-1),l.shaderInputs.setProps({solidPolygon:h}),l.draw(this.context.renderPass)),s&&n&&(s.setVertexCount(a.vertexCount),s.shaderInputs.setProps({solidPolygon:h}),s.draw(this.context.renderPass))}updateState(t){var l;super.updateState(t),this.updateGeometry(t);const{props:i,oldProps:n,changeFlags:o}=t,r=this.getAttributeManager();(o.extensionsChanged||i.filled!==n.filled||i.extruded!==n.extruded)&&((l=this.state.models)==null||l.forEach(c=>c.destroy()),this.setState(this._getModels()),r.invalidateAll())}updateGeometry({props:t,oldProps:i,changeFlags:n}){if(n.dataChanged||n.updateTriggersChanged&&(n.updateTriggersChanged.all||n.updateTriggersChanged.getPolygon)){const{polygonTesselator:r}=this.state,s=t.data.attributes||{};r.updateGeometry({data:t.data,normalize:t._normalize,geometryBuffer:s.getPolygon,buffers:s,getGeometry:t.getPolygon,positionFormat:t.positionFormat,wrapLongitude:t.wrapLongitude,resolution:this.context.viewport.resolution,fp64:this.use64bitPositions(),dataChanged:n.dataChanged,full3d:t._full3d}),this.setState({numInstances:r.instanceCount,startIndices:r.vertexStarts}),n.dataChanged||this.getAttributeManager().invalidateAll()}}_getModels(){const{id:t,filled:i,extruded:n}=this.props;let o,r,s;if(i){const l=this.getShaders("top");l.defines.NON_INSTANCED_MODEL=1;const c=this.getAttributeManager().getBufferLayouts({isInstanced:!1});o=new K(this.context.device,{...l,id:`${t}-top`,topology:"triangle-list",bufferLayout:c,isIndexed:!0,userData:{excludeAttributes:{instanceVertexValid:!0}}})}if(n){const l=this.getAttributeManager().getBufferLayouts({isInstanced:!0});r=new K(this.context.device,{...this.getShaders("side"),id:`${t}-side`,bufferLayout:l,geometry:new ct({topology:"triangle-strip",attributes:{positions:{size:2,value:new Float32Array([1,0,0,0,1,1,0,1])}}}),isInstanced:!0,userData:{excludeAttributes:{indices:!0}}}),s=new K(this.context.device,{...this.getShaders("side"),id:`${t}-wireframe`,bufferLayout:l,geometry:new ct({topology:"line-strip",attributes:{positions:{size:2,value:new Float32Array([1,0,0,0,0,1,1,1])}}}),isInstanced:!0,userData:{excludeAttributes:{indices:!0}}})}return{models:[r,s,o].filter(Boolean),topModel:o,sideModel:r,wireframeModel:s}}calculateIndices(t){const{polygonTesselator:i}=this.state;t.startIndices=i.indexStarts,t.value=i.get("indices")}calculatePositions(t){const{polygonTesselator:i}=this.state;t.startIndices=i.vertexStarts,t.value=i.get("positions")}calculateVertexValid(t){t.value=this.state.polygonTesselator.get("vertexValid")}}rt.defaultProps=Be;rt.layerName="SolidPolygonLayer";const We=rt;function Ue({data:e,getIndex:t,dataRange:i,replace:n}){const{startRow:o=0,endRow:r=1/0}=i,s=e.length;let l=s,c=s;for(let g=0;g<s;g++){const f=t(e[g]);if(l>g&&f>=o&&(l=g),f>=r){c=g;break}}let a=l;const u=c-l!==n.length?e.slice(c):void 0;for(let g=0;g<n.length;g++)e[a++]=n[g];if(u){for(let g=0;g<u.length;g++)e[a++]=u[g];e.length=a}return{startRow:l,endRow:l+n.length}}const It=[0,0,0,255],Ze=[0,0,0,255],He={stroked:!0,filled:!0,extruded:!1,elevationScale:1,wireframe:!1,_normalize:!0,_windingOrder:"CW",lineWidthUnits:"meters",lineWidthScale:1,lineWidthMinPixels:0,lineWidthMaxPixels:Number.MAX_SAFE_INTEGER,lineJointRounded:!1,lineMiterLimit:4,getPolygon:{type:"accessor",value:e=>e.polygon},getFillColor:{type:"accessor",value:Ze},getLineColor:{type:"accessor",value:It},getLineWidth:{type:"accessor",value:1},getElevation:{type:"accessor",value:1e3},material:!0};class st extends Yt{initializeState(){this.state={paths:[],pathsDiff:null},this.props.getLineDashArray&&Kt.removed("getLineDashArray","PathStyleExtension")()}updateState({changeFlags:t}){const i=t.dataChanged||t.updateTriggersChanged&&(t.updateTriggersChanged.all||t.updateTriggersChanged.getPolygon);if(i&&Array.isArray(t.dataChanged)){const n=this.state.paths.slice(),o=t.dataChanged.map(r=>Ue({data:n,getIndex:s=>s.__source.index,dataRange:r,replace:this._getPaths(r)}));this.setState({paths:n,pathsDiff:o})}else i&&this.setState({paths:this._getPaths(),pathsDiff:null})}_getPaths(t={}){const{data:i,getPolygon:n,positionFormat:o,_normalize:r}=this.props,s=[],l=o==="XY"?2:3,{startRow:c,endRow:a}=t,{iterable:h,objectInfo:u}=Jt(i,c,a);for(const g of h){u.index++;let f=n(g,u);r&&(f=Tt(f,l));const{holeIndices:d}=f,x=f.positions||f;if(d)for(let L=0;L<=d.length;L++){const _=x.slice(d[L-1]||0,d[L]||x.length);s.push(this.getSubLayerRow({path:_},g,u.index))}else s.push(this.getSubLayerRow({path:x},g,u.index))}return s}renderLayers(){const{data:t,_dataDiff:i,stroked:n,filled:o,extruded:r,wireframe:s,_normalize:l,_windingOrder:c,elevationScale:a,transitions:h,positionFormat:u}=this.props,{lineWidthUnits:g,lineWidthScale:f,lineWidthMinPixels:d,lineWidthMaxPixels:x,lineJointRounded:L,lineMiterLimit:_,lineDashJustified:A}=this.props,{getFillColor:m,getLineColor:p,getLineWidth:Et,getLineDashArray:zt,getElevation:Nt,getPolygon:Gt,updateTriggers:P,material:kt}=this.props,{paths:j,pathsDiff:lt}=this.state,Ft=this.getSubLayerClass("fill",We),Ot=this.getSubLayerClass("stroke",Qt),at=this.shouldRenderSubLayer("fill",j)&&new Ft({_dataDiff:i,extruded:r,elevationScale:a,filled:o,wireframe:s,_normalize:l,_windingOrder:c,getElevation:Nt,getFillColor:m,getLineColor:r&&s?p:It,material:kt,transitions:h},this.getSubLayerProps({id:"fill",updateTriggers:P&&{getPolygon:P.getPolygon,getElevation:P.getElevation,getFillColor:P.getFillColor,lineColors:r&&s,getLineColor:P.getLineColor}}),{data:t,positionFormat:u,getPolygon:Gt}),Vt=!r&&n&&this.shouldRenderSubLayer("stroke",j)&&new Ot({_dataDiff:lt&&(()=>lt),widthUnits:g,widthScale:f,widthMinPixels:d,widthMaxPixels:x,jointRounded:L,miterLimit:_,dashJustified:A,_pathType:"loop",transitions:h&&{getWidth:h.getLineWidth,getColor:h.getLineColor,getPath:h.getPolygon},getColor:this.getSubLayerAccessor(p),getWidth:this.getSubLayerAccessor(Et),getDashArray:this.getSubLayerAccessor(zt)},this.getSubLayerProps({id:"stroke",updateTriggers:P&&{getWidth:P.getLineWidth,getColor:P.getLineColor,getDashArray:P.getLineDashArray}}),{data:j,positionFormat:u,getPath:Bt=>Bt.path});return[!r&&at,Vt,r&&at]}}st.layerName="PolygonLayer";st.defaultProps=He;const Rt=st;function $e(e){const t=new Set("ACGTU-");for(const i of e)for(const n of i.seq)if(!t.has(n))return"protein";return"dna"}function Xe(e){var t;return(t=e==null?void 0:e.msa)!=null&&t.sequences?Object.entries(e.msa.sequences).map(([i,n])=>({id:i,seq:n.toUpperCase()})):[]}function qe(e){var n;if(!((n=e==null?void 0:e.msa)!=null&&n.sequences))return console.warn("[MSADeckGLViewer] No MSA sequences found in data"),null;const t=Xe(e),i=$e(t);return{sequences:t,type:i,rows:t.length,cols:t.length>0?t[0].seq.length:0}}function S(e,t,i,n=255){return[e,t,i,n]}function H(e,t=255){return[e,e,e,t]}function je(e){switch(e){case"A":return S(0,200,0);case"C":return S(0,100,255);case"G":return S(255,165,0);case"T":case"U":return S(255,0,0);case"-":return H(220);default:return H(180)}}function Ye(e){const t=new Set(["A","V","I","L","M","F","W","Y","P"]),i=new Set(["S","T","N","Q","C","G"]),n=new Set(["K","R","H"]),o=new Set(["D","E"]);return e==="-"?H(220):t.has(e)?S(255,200,0):i.has(e)?S(0,150,255):n.has(e)?S(0,0,255):o.has(e)?S(255,0,0):H(180)}function Ke(e,t,i,n){if(!t||t.length===0)return[];const{r0:o,r1:r,c0:s,c1:l}=i,c=r-o+1,a=l-s+1,h=Math.max(1,Math.ceil(Math.sqrt(c*a/n))),u=[];for(let g=o;g<=r;g+=h)for(let f=s;f<=l;f+=h){if(g>=t.length)continue;const d=t[g];if(!d||!d.seq)continue;const x=f*e,L=-g*e,_=e*Math.min(h,l-f+1),A=e*Math.min(h,r-g+1);u.push({kind:"cell",row:g,col:f,ch:d.seq[f]||"-",polygon:[[x,L],[x+_,L],[x+_,L-A],[x,L-A]]})}return u}function Je(e,t,i){return new Rt({id:"cells",data:e,pickable:!0,autoHighlight:!0,extruded:!1,stroked:!1,filled:!0,getPolygon:n=>n.polygon,getFillColor:n=>{const o=(t==="dna"?je:Ye)(n.ch);if(i){const{startCol:r,endCol:s}=i;if(n.col<r-1||n.col>s-1)return[o[0]*.3+180,o[1]*.3+180,o[2]*.3+180,o[3]]}return o}})}function Qe(e,t,i){if(!t||!i)return[];const{startCol:n,endCol:o}=t,r=(n-1)*e,s=o*e,l=0,c=-i*e,a=2;return[{polygon:[[r-a,l+a],[s+a,l+a],[s+a,c-a],[r-a,c-a]]}]}function ti(e){return new Rt({id:"selection-border",data:e,pickable:!1,stroked:!0,filled:!1,lineWidthMinPixels:3,getPolygon:t=>t.polygon,getLineColor:[255,140,0,255]})}function ei(e,t,i,n,o,r){if(!n||o*r<12||!t||t.length===0)return[];const{r0:s,r1:l,c0:c,c1:a}=i,h=[];for(let u=s;u<=l;u++){if(u>=t.length)continue;const g=t[u];if(!(!g||!g.seq))for(let f=c;f<=a;f++){const d=g.seq[f]||"-";d!=="-"&&h.push({kind:"text",position:[f*e+e/2,-u*e-e/2,0],text:d})}}return h}function ii(e){return new nt({id:"letters",data:e,pickable:!1,getText:t=>t.text,getPosition:t=>t.position,getSize:14,getColor:[0,0,0,255],getTextAnchor:"middle",getAlignmentBaseline:"center",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"})}function ni(e,t,i,n,o){if(n.zoom<=-2||!t||t.length===0)return[];const{r0:r,r1:s}=i,l=[],c=8,h=Math.max(c,c*o*.3);for(let u=r;u<=s;u++){if(u>=t.length)continue;const g=t[u];g&&l.push({kind:"label",row:u,text:g.id||`Seq ${u+1}`,position:[-h,-u*e-e/2,0]})}return l}function oi(e){return new nt({id:"rowLabels",data:e,pickable:!0,getText:t=>t.text,getPosition:t=>t.position,getSize:12,getTextAnchor:"end",getAlignmentBaseline:"center",background:!0,getBackgroundColor:[255,255,255,200],fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'})}function ri(e,t,i,n,o,r){if(t.zoom<=-2)return[];const{c0:s,c1:l}=i,c=[],a=16,u=Math.max(a,a*o*.5),g=-(n*e)-u,f=r*o;let d=1;f<5?d=10:f<2?d=50:f<.5?d=200:f<.1&&(d=1e3);for(let x=s;x<=l;x++)(x+1)%d===0&&c.push({text:`${x+1}`,position:[x*e+e/2,g,0]});return c}function si(e,t){return new nt({id:"columnAxis",data:e,pickable:!1,getText:i=>i.text,getPosition:i=>i.position,getSize:Math.max(10,Math.min(14,12*t*.1)),getTextAnchor:"middle",getAlignmentBaseline:"top",background:!0,getBackgroundColor:[255,255,255,180],fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'})}class li{constructor(t,i={}){this.container=t,this.options={MAX_CELLS:15e4,cellSize:16,showLetters:!0,...i},this.state={deckgl:null,seqs:[],type:"protein",rows:0,cols:0,selection:null,viewState:{target:[0,0,0],zoom:-1}},this.frame=null,setTimeout(()=>this.initializeDeck(),50)}getZoomScale(){return Math.pow(2,this.state.viewState.zoom||0)}hasSequences(){return this.state.seqs&&this.state.seqs.length>0}handleViewStateChange(t){t.zoom=Math.max(-5,Math.min(10,t.zoom)),this.state.viewState=t,this.hasSequences()&&this.renderThrottled(),this.onViewStateChange&&this.onViewStateChange(t)}getTooltipContent(t){if(!t||t.row===void 0||!this.state.seqs[t.row])return null;const{row:i}=t;if(t.kind==="cell"){const{col:n,ch:o}=t;return{text:`${this.state.seqs[i].id}
row ${i+1}, col ${n+1}: ${o}`}}return t.kind==="label"?{text:this.state.seqs[i].id}:null}setupContainerAndCanvas(){this.container.style.position="relative",this.container.style.overflow="hidden";const t=document.createElement("canvas");return t.style.position="absolute",t.style.left="0",t.style.top="0",t.style.width="100%",t.style.height="100%",this.container.appendChild(t),t}initializeDeck(){const t=this.setupContainerAndCanvas();this.state.deckgl=new te({canvas:t,width:"100%",height:"100%",views:[new ee({id:"ortho",flipY:!0,clear:{color:[255,255,255,1]}})],controller:!0,initialViewState:{target:[0,0,0],zoom:-1,minZoom:-5,maxZoom:10},getCursor:({isDragging:i})=>i?"grabbing":"grab",style:{},onViewStateChange:({viewState:i})=>{this.handleViewStateChange(i)},getTooltip:({object:i})=>this.getTooltipContent(i)})}loadFromPhyloData(t){const i=qe(t);return i?(this.state.seqs=i.sequences,this.state.type=i.type,this.state.rows=i.rows,this.state.cols=i.cols,this.state.selection=null,console.log(`[MSADeckGLViewer] Loaded ${this.state.rows} sequences, type: ${this.state.type}`),this.fitToMSA(),this.render(),setTimeout(()=>this.render(),100),!0):!1}fitToMSA(){if(!this.hasSequences()||!this.state.deckgl)return;const t=this.options.cellSize,i=this.state.cols*t,n=this.state.rows*t,o=i/2,r=-n/2,s=this.container.clientWidth,l=this.container.clientHeight;if(s>0&&l>0){const c=Math.log2(s/i),a=Math.log2(l/n),h=Math.min(c,a)-.1,u=Math.max(-2,Math.min(5,h)),g={target:[o,r,0],zoom:u};this.state.viewState=g,this.state.deckgl.setProps({viewState:g,initialViewState:g})}}setSelection(t,i){t>i&&([t,i]=[i,t]),t=Math.max(1,Math.min(this.state.cols,t)),i=Math.max(1,Math.min(this.state.cols,i)),this.state.selection={startCol:t,endCol:i},this.render()}clearSelection(){this.state.selection=null,this.render()}render(){if(!this.state.deckgl){console.warn("[MSA] Cannot render - deck.gl not initialized");return}if(!this.hasSequences()){this.state.deckgl.setProps({layers:[]});return}const t=this.options.cellSize,i=[this.buildCellsLayer(t),this.buildSelectionBorderLayer(t),this.buildLettersLayer(t),this.buildRowLabelsLayer(t),this.buildColumnAxisLayer(t)];this.state.deckgl.setProps({layers:i})}renderThrottled(){this.frame||(this.frame=requestAnimationFrame(()=>{this.frame=null,this.render()}))}getVisibleRange(t){const i=this.container.clientWidth,n=this.container.clientHeight,o=1/this.getZoomScale(),r=i*o/2,s=n*o/2,[l,c]=this.state.viewState.target;let a=Math.floor((l-r)/t)-1,h=Math.ceil((l+r)/t)+1,u=Math.floor((-c-s)/t)-1,g=Math.ceil((-c+s)/t)+1;return a=Math.max(0,Math.min(this.state.cols-1,a)),h=Math.max(0,Math.min(this.state.cols-1,h)),u=Math.max(0,Math.min(this.state.rows-1,u)),g=Math.max(0,Math.min(this.state.rows-1,g)),{r0:u,r1:g,c0:a,c1:h}}buildCellsLayer(t){const i=this.getVisibleRange(t),n=Ke(t,this.state.seqs,i,this.options.MAX_CELLS);return Je(n,this.state.type,this.state.selection)}buildSelectionBorderLayer(t){const i=Qe(t,this.state.selection,this.state.rows);return ti(i)}buildLettersLayer(t){const i=this.getVisibleRange(t),n=ei(t,this.state.seqs,i,this.options.showLetters,this.options.cellSize,this.getZoomScale());return ii(n)}buildRowLabelsLayer(t){const i=this.getVisibleRange(t),n=ni(t,this.state.seqs,i,this.state.viewState,this.getZoomScale());return oi(n)}buildColumnAxisLayer(t){const i=this.getVisibleRange(t),n=ri(t,this.state.viewState,i,this.state.rows,this.getZoomScale(),this.options.cellSize);return si(n,this.getZoomScale())}setCellSize(t){this.options.cellSize=t,this.render()}setShowLetters(t){this.options.showLetters=t,this.render()}setRegion(t,i){this.setSelection(t,i)}clearRegion(){this.clearSelection()}fitCameraToMSA(){this.fitToMSA()}resetCamera(){if(this.hasSequences())this.fitToMSA();else{const t={target:[0,0,0],zoom:-1};this.state.viewState=t,this.state.deckgl&&this.state.deckgl.setProps({viewState:t,initialViewState:t})}}destroy(){this.state.deckgl&&(this.state.deckgl.finalize(),this.state.deckgl=null)}}const C={container:"msa-container",controls:"msa-controls",rendererContainer:"msa-renderer-container",regionControls:"msa-region-controls",label:"msa-label",toLabel:"msa-to-label",input:"msa-input",button:"msa-button",buttonSet:"msa-button--set",buttonClear:"msa-button--clear",winbox:"msa-winbox",winboxNoFull:"no-full"},R={windowTitle:"MSA Viewer",labelRegion:"Region:",labelTo:"to",buttonSet:"Set",buttonClear:"Clear"},B={renderer:{cellSize:16,showLetters:!0,MAX_CELLS:15e4},window:{width:"70%",height:"60%",border:2}};function yt(e,t=C.label,i=null){const n=document.createElement("span");return n.classList.add(t),n.textContent=e,i&&(n.id=i),n}function Lt(e,t,i=null){const n=document.createElement("input");return n.type="number",n.min="1",n.placeholder=e,n.classList.add(C.input),n.setAttribute("aria-label",t),i&&(n.id=i),n}function Ct(e,t=[C.button],i=null,n=null){const o=document.createElement("button");return o.textContent=e,t.forEach(r=>o.classList.add(r)),i&&(o.onclick=i),n&&(o.id=n),o}function ai(e){const t=document.createElement("div");t.classList.add(C.regionControls);const i=yt(R.labelRegion,C.label,"msa-region-label");t.appendChild(i);const n=Lt("Start","Start column number","msa-start-input");t.appendChild(n);const o=yt(R.labelTo,C.toLabel,"msa-to-label");t.appendChild(o);const r=Lt("End","End column number","msa-end-input");t.appendChild(r);const s=Ct(R.buttonSet,[C.button,C.buttonSet],()=>{const c=parseInt(n.value),a=parseInt(r.value);!isNaN(c)&&!isNaN(a)&&c>0&&a>0&&c<a&&e?e.setRegion(c,a):alert("Please enter valid start and end positions (start must be less than end, both must be positive numbers)")},"msa-set-button");t.appendChild(s);const l=Ct(R.buttonClear,[C.button,C.buttonClear],()=>{e&&(e.clearRegion(),n.value="",r.value="")},"msa-clear-button");return t.appendChild(l),{container:t,setBtn:s,clearBtn:l}}class ci{constructor(t){this.onClose=t||(()=>{}),this.winBoxInstance=null,this.container=null,this.renderer=null,this.setBtn=null,this.clearBtn=null,this._pendingData=null,this._pendingRegion=null,this._pendingClear=!1,this.ready=(async()=>{if(await this.createWindow(),this._pendingData&&this.renderer&&(this.renderer.loadFromPhyloData(this._pendingData),this._pendingData=null),this._pendingRegion&&this.renderer){const{start:i,end:n}=this._pendingRegion;this.renderer.setRegion(i,n),this._pendingRegion=null}this._pendingClear&&this.renderer&&(this.renderer.clearRegion(),this._pendingClear=!1)})()}async createWindow(){try{let t=window.WinBox;if(!t){const r=document.createElement("script");r.src="/node_modules/winbox/dist/winbox.bundle.min.js",document.head.appendChild(r),await new Promise((s,l)=>{r.onload=s,r.onerror=l,setTimeout(l,5e3)}),t=window.WinBox}if(typeof t!="function")throw console.error("[MSA] WinBox is not a constructor:",typeof t),new Error("WinBox not available");this.container=document.createElement("div"),this.container.classList.add(C.container);const i=document.createElement("div");i.classList.add(C.rendererContainer),this.container.appendChild(i),this.renderer=new li(i,{...B.renderer});const n=document.createElement("div");n.classList.add(C.controls);const o=ai(this.renderer);n.appendChild(o.container),this.setBtn=o.setBtn,this.clearBtn=o.clearBtn,this.container.appendChild(n),this.winBoxInstance=new t(R.windowTitle,{class:[C.winbox,C.winboxNoFull],border:B.window.border,width:B.window.width,height:B.window.height,x:"center",y:"center",mount:this.container,overflow:!1,onclose:()=>{this.handleClose()},onresize:()=>{console.log("[MSA] Window resized")}}),console.log("[MSA] Window created successfully")}catch(t){console.error("[MSA] Failed to create window:",t),alert(`Failed to open MSA viewer window: ${t.message}`)}}loadData(t){this.renderer?this.renderer.loadFromPhyloData(t):this._pendingData=t}setRegion(t,i){this.renderer?this.renderer.setRegion(t,i):(this._pendingRegion={start:t,end:i},this._pendingClear=!1)}clearRegion(){this.renderer?this.renderer.clearRegion():(this._pendingRegion=null,this._pendingClear=!0)}handleClose(){console.log("[MSA] Closing MSA viewer window"),this.onClose&&this.onClose(),this.cleanup()}cleanup(){this.setBtn&&(this.setBtn.onclick=null,this.setBtn=null),this.clearBtn&&(this.clearBtn.onclick=null,this.clearBtn=null),this.winBoxInstance&&(this.winBoxInstance=null),this.container=null,this.renderer=null}show(){this.winBoxInstance&&this.winBoxInstance.focus()}hide(){this.winBoxInstance&&this.winBoxInstance.minimize()}destroy(){this.winBoxInstance&&this.winBoxInstance.close(),this.cleanup()}}let y=null,w=null,M=null,$=!1;async function ui(e,t={}){var i;if(y&&y.winBoxInstance&&!y.winBoxInstance.dom&&(y=null,w=null),!y&&!w){const n=t.onClose,o=()=>{y=null,w=null,n&&n()};y=new ci(o),w=y.ready.finally(()=>{w=null})}return w&&await w,e&&y.loadData(e),$?(y.clearRegion(),$=!1,M=null):M&&(y.setRegion(M.start,M.end),M=null),(i=y==null?void 0:y.show)==null||i.call(y),y}async function di(e,t){return y?(w&&await w,y.setRegion(e,t),!0):(M={start:e,end:t},$=!1,!0)}async function fi(){return y?(w&&await w,y.clearRegion(),!0):(M=null,$=!0,!0)}export{fi as clearMSARegion,ui as default,di as setMSARegion,ui as showMSAViewer};
