import * as THREE from 'three';

// Procedural surfaces for the city. Detail lives in shaders rather than textures, so
// streets stay crisp at bumper height and nothing has to be downloaded.

const NOISE = /* glsl */ `
  float h21(vec2 p) {
    vec3 q = fract(vec3(mod(p, 1024.0).xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    return 0.5 * vn(p) + 0.3 * vn(p * 2.1 + 3.1) + 0.2 * vn(p * 4.3 + 7.7);
  }
`;

function patch(material, key, uniforms, {vertexHead = '', vertexBody = '', fragmentHead = '', color = '', rough = '', emissive = ''}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexHead}\nvarying vec3 vWPos;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz;\n${vertexBody}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}\n${fragmentHead}\nvarying vec3 vWPos;`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${color}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${rough}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissive}`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}

/** Everything flat on the ground: pat 0 plain, 1 grass, 2 asphalt, 3 slabs, 4 setts, 5 water, 6 gravel. */
export function groundMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.95, metalness: 0, depthWrite: false});
  return patch(m, 'zd-ground', uniforms, {
    vertexHead: 'attribute vec3 aInfo; attribute vec2 aRoad; varying vec3 vInfo; varying vec2 vRoad;',
    vertexBody: 'vInfo = aInfo; vRoad = aRoad;',
    fragmentHead: 'varying vec3 vInfo; varying vec2 vRoad; uniform float uTime;',
    color: /* glsl */ `
      float pat = vInfo.x;
      vec2 gp = vWPos.xz;
      float gd = length(vViewPosition);
      float near = clamp(1.0 - gd / 70.0, 0.0, 1.0);
      float gn = fbm(gp * 0.31);
      vec3 gc = diffuseColor.rgb;
      float gRough = 0.95;
      if (pat < 0.5) {
        gc *= 0.9 + 0.2 * gn;
      } else if (pat < 1.5) {
        gc *= 0.72 + 0.56 * gn;
        gc = mix(gc, gc * vec3(1.22, 1.08, 0.62), smoothstep(0.35, 0.7, vn(gp * 0.09)) * 0.65);
        gc *= 1.0 + (h21(floor(gp * 9.0)) - 0.5) * 0.3 * near;
      } else if (pat < 2.5) {
        gc *= 0.86 + 0.26 * gn;
        gc += (h21(floor(gp * 16.0)) - 0.5) * 0.05 * near;
        gc = mix(gc, gc * 0.62, smoothstep(0.62, 0.66, vn(gp * vec2(0.5, 0.12))) * 0.5);
        float aa = max(fwidth(vRoad.x), 0.015);
        float half_ = vInfo.y;
        float across = abs(vRoad.x);
        float kerb = smoothstep(half_ - 0.22 - aa, half_ - 0.22 + aa, across);
        gc = mix(gc, vec3(0.5, 0.49, 0.46), kerb);
        float paint = 0.0;
        if (vInfo.z > 1.5) {
          paint = 1.0 - smoothstep(0.05, 0.05 + aa, abs(across - 0.16));
        } else if (vInfo.z > 0.5) {
          paint = (1.0 - smoothstep(0.06, 0.06 + aa, across)) * step(mod(vRoad.y, 6.0), 3.0);
        }
        float worn = 0.72 + 0.28 * vn(gp * 0.7);
        gc = mix(gc, vec3(0.74, 0.73, 0.68), paint * worn);
        gRough = 0.88;
      } else if (pat < 3.5) {
        vec2 q = gp / 0.75;
        q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
        vec2 cell = floor(q);
        vec2 e = abs(fract(q) - 0.5);
        float joint = smoothstep(0.455, 0.5, max(e.x, e.y));
        gc *= 0.88 + 0.2 * gn + (h21(cell) - 0.5) * 0.14 * near;
        gc = mix(gc, gc * 0.68, joint * near);
      } else if (pat < 4.5) {
        vec2 q = gp / vec2(0.2, 0.15);
        q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
        vec2 cell = floor(q);
        vec2 e = abs(fract(q) - 0.5);
        float joint = smoothstep(0.34, 0.5, max(e.x, e.y));
        float setts = clamp(1.0 - gd / 32.0, 0.0, 1.0);
        gc *= 0.86 + 0.24 * gn;
        gc *= 1.0 + (h21(cell) - 0.5) * 0.36 * setts;
        gc = mix(gc, gc * 0.55, joint * setts);
        gRough = 0.72;
      } else if (pat < 5.5) {
        vec2 w = gp * 0.45;
        float r = fbm(w + vec2(uTime * 0.12, uTime * 0.07)) + fbm(w * 2.3 - vec2(uTime * 0.16, 0.0));
        gc *= 0.72 + 0.52 * r;
        gc += vec3(0.1, 0.14, 0.16) * smoothstep(1.2, 1.5, r);
        gRough = 0.18;
      } else {
        gc *= 0.8 + 0.4 * gn;
        gc *= 1.0 + (h21(floor(gp * 7.0)) - 0.5) * 0.3 * near;
      }
      diffuseColor.rgb = gc;
    `,
    rough: 'roughnessFactor = gRough;',
  });
}

/** Walls: aF = (bay, floor, seed, style), aTop = number of floors. */
export function facadeMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.9, metalness: 0});
  return patch(m, 'zd-facade', uniforms, {
    vertexHead: 'attribute vec4 aF; attribute float aTop; varying vec4 vF; varying float vTop;',
    vertexBody: 'vF = aF; vTop = aTop;',
    fragmentHead: 'varying vec4 vF; varying float vTop; uniform float uNight; uniform vec3 uGlass;',
    color: /* glsl */ `
      vec2 f = vF.xy;
      float seed = vF.z;
      float style = vF.w;
      vec3 wall = diffuseColor.rgb;
      wall *= 0.86 + 0.28 * fbm(vec2(f.x * 0.7 + seed * 31.0, f.y * 1.3));
      wall *= mix(0.7, 1.0, smoothstep(0.0, 0.9, f.y));
      wall *= 0.92 + 0.14 * smoothstep(0.3, 0.8, vn(vec2(f.x * 2.6 + seed * 9.0, 1.0)));
      vec2 uvF = f;
      vec2 ws = vec2(0.22, 0.3);
      float windowY = 0.03;
      float arch = 0.0;
      float shop = 0.0;
      float ground = 1.0 - step(1.0, f.y);
      vec3 trim = min(wall * 1.28 + 0.04, vec3(1.0));
      if (style < 0.5) {
        if (ground > 0.5 && h21(vec2(seed, floor(f.x / 3.0))) > 0.35) { shop = 1.0; ws = vec2(0.42, 0.33); windowY = -0.08; }
      } else if (style < 1.5) {
        ws = vec2(0.19, 0.32);
        if (ground > 0.5) { ws = vec2(0.2, 0.26); wall *= 0.86 + 0.14 * step(0.14, fract(f.y * 4.0)); }
      } else if (style < 2.5) {
        ws = vec2(0.27, 0.2);
      } else if (style < 3.5) {
        ws = vec2(0.47, 0.455);
        windowY = 0.0;
      } else if (style < 4.5) {
        uvF = vec2(f.x * 0.5, f.y * 0.28);
        ws = vec2(0.16, 0.31);
        arch = 1.0;
      } else if (style < 5.5) {
        wall = mix(wall, wall * vec3(1.05, 0.72, 0.6), 0.6);
        wall *= 0.92 + 0.14 * step(0.5, fract(f.y * 13.0));
      } else {
        ws = vec2(-1.0);
      }
      vec2 cell = floor(uvF);
      vec2 q = fract(uvF) - 0.5;
      q.y -= windowY;
      float rnd = h21(cell + seed * 91.0);
      float aa = max(max(fwidth(uvF.x), fwidth(uvF.y)), 0.0015);
      vec2 d = abs(q) - ws;
      float box = max(d.x, d.y);
      if (arch > 0.5 && q.y > ws.y - ws.x) {
        box = length(vec2(q.x, q.y - (ws.y - ws.x))) - ws.x;
      }
      float inGlass = 1.0 - smoothstep(-aa, aa, box);
      float surround = (1.0 - smoothstep(-aa, aa, box - 0.045)) * (1.0 - inGlass);
      float topBand = smoothstep(vTop - 0.16, vTop - 0.13, f.y);
      inGlass *= 1.0 - topBand;
      surround *= 1.0 - topBand;
      float fr = pow(1.0 - clamp(dot(normalize(vViewPosition), normalize(vNormal)), 0.0, 1.0), 2.5);
      vec3 glass = mix(vec3(0.05, 0.07, 0.09), uGlass, 0.22 + 0.7 * fr);
      glass += (rnd - 0.5) * 0.05;
      float bar = 0.0;
      if (style < 2.5 || style > 3.5) {
        bar = max(1.0 - smoothstep(0.012, 0.012 + aa, abs(q.x)), 1.0 - smoothstep(0.012, 0.012 + aa, abs(q.y - 0.08)));
      } else {
        bar = max(1.0 - smoothstep(0.018, 0.018 + aa, abs(q.x)), 1.0 - smoothstep(0.018, 0.018 + aa, abs(q.y)));
      }
      vec3 detail = wall;
      if (style > 0.5 && style < 1.5) {
        float pilaster = 1.0 - smoothstep(0.0, aa, abs(fract(f.x * 0.5 + 0.25) - 0.5) - 0.07);
        detail = mix(detail, trim, pilaster * step(1.0, f.y));
      }
      if (style < 1.5) {
        float line = 1.0 - smoothstep(0.03, 0.03 + aa, abs(fract(f.y) - 0.02));
        detail = mix(detail, trim, line * (style < 0.5 ? 0.9 : 0.35));
        detail = mix(detail, detail * 0.62, (1.0 - smoothstep(0.012, 0.012 + aa, abs(fract(f.y) - 0.965))) * 0.6);
      } else if (style > 1.5 && style < 2.5) {
        float joint = max(1.0 - smoothstep(0.012, 0.012 + aa, abs(fract(f.y) - 0.0)), 1.0 - smoothstep(0.012, 0.012 + aa, abs(fract(f.x * 0.5) - 0.0)));
        detail *= 1.0 - joint * 0.3;
      }
      detail = mix(detail, trim, surround);
      detail = mix(detail, glass, inGlass);
      vec3 barColor = (style > 2.5 && style < 3.5) ? vec3(0.13, 0.15, 0.17) : trim * 0.92;
      detail = mix(detail, barColor, inGlass * bar);
      if (shop > 0.5) {
        float band = smoothstep(0.76, 0.78, fract(f.y)) * (1.0 - smoothstep(0.93, 0.95, fract(f.y)));
        vec3 sign = 0.5 + 0.42 * cos(6.283 * (h21(vec2(seed * 7.0, floor(f.x / 3.0))) + vec3(0.0, 0.33, 0.67)));
        detail = mix(detail, sign * 0.85, band);
      }
      detail = mix(detail, trim, topBand);
      detail = mix(detail, detail * 0.55, (1.0 - smoothstep(0.02, 0.05, abs(f.y - (vTop - 0.17)))));
      float far = smoothstep(0.14, 0.42, aa);
      float coverage = 4.0 * max(ws.x, 0.0) * max(ws.y, 0.0);
      diffuseColor.rgb = mix(detail, mix(wall, glass, coverage * 0.75), far);
      float vGlass = inGlass;
      float vLit = step(0.6, rnd) * (1.0 - far * 0.35);
      float vWarm = rnd;
    `,
    rough: 'roughnessFactor = mix(0.9, 0.22, vGlass);',
    emissive: /* glsl */ `
      vec3 litColor = mix(vec3(1.0, 0.62, 0.26), vec3(0.62, 0.72, 0.95), step(0.86, vWarm));
      totalEmissiveRadiance += litColor * uNight * vLit * mix(vGlass, coverage * 0.75, far) * (0.28 + 0.5 * fract(vWarm * 17.0));
    `,
  });
}

/** Roofs and gables: aPat 0 flat, 1 tiles, 2 standing-seam metal, 3 plain wall. */
export function roofMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.85, metalness: 0});
  return patch(m, 'zd-roof', uniforms, {
    vertexHead: 'attribute float aPat; varying float vPat;',
    vertexBody: 'vPat = aPat;',
    fragmentHead: 'varying float vPat;',
    color: /* glsl */ `
      vec2 rp = vWPos.xz;
      float rd = length(vViewPosition);
      float rnear = clamp(1.0 - rd / 90.0, 0.0, 1.0);
      vec3 rc = diffuseColor.rgb;
      rc *= 0.84 + 0.32 * fbm(rp * 0.35);
      float rRough = 0.85;
      if (vPat < 0.5) {
        rc *= 1.0 + (h21(floor(rp * 5.0)) - 0.5) * 0.14 * rnear;
      } else if (vPat < 1.5) {
        float row = fract(vWPos.y * 3.2);
        rc *= 1.0 - smoothstep(0.72, 1.0, row) * 0.34 * rnear;
        rc *= 1.0 + (h21(floor(vec2(rp.x + rp.y, vWPos.y * 3.2) * vec2(2.4, 1.0))) - 0.5) * 0.26 * rnear;
      } else if (vPat < 2.5) {
        float seam = abs(fract((rp.x + rp.y) * 1.3) - 0.5);
        rc *= 1.0 + (0.5 - smoothstep(0.0, 0.06, seam)) * 0.4 * rnear;
        rRough = 0.5;
      }
      diffuseColor.rgb = rc;
    `,
    rough: 'roughnessFactor = rRough;',
  });
}

/** Foliage and trunks. Vertex colour is multiplied by the per-instance colour. */
export function treeMaterial() {
  return new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true});
}
