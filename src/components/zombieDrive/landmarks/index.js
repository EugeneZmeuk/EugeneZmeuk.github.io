import * as THREE from 'three';
import {inset} from '../buildings';
import {Kit, PAT} from './kit';
import {KRAKOW} from './krakow';
import {KYIV} from './kyiv';
import {MINSK} from './minsk';

const BUILDERS = {...KRAKOW, ...MINSK, ...KYIV};
const COMPASS = {n: [0, 1], s: [0, -1], e: [1, 0], w: [-1, 0]};

function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, y0] = r[i];
    const [x1, y1] = r[(i + 1) % r.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/** Turn so the side the builder treats as the front looks the way the map says it should. */
function heading(m, faces) {
  if (!m.front || !faces) return m.a;
  const [fx, fy] = COMPASS[m.front];
  const front = faces === 'x-' ? [-Math.cos(m.a), -Math.sin(m.a)] : [Math.sin(m.a), -Math.cos(m.a)];
  return front[0] * fx + front[1] * fy >= 0 ? m.a : m.a + Math.PI;
}

/** A walled hill following the mapped outline: grass bank, stone wall, paved top. */
function buildHill(m, material) {
  const k = new Kit();
  const ring = ringArea(m.ring) > 0 ? m.ring : m.ring.slice().reverse();
  const H = m.hill;
  const bank = H * 0.3;
  let outer = null;
  for (let d = -9; d < -0.5 && !outer; d *= 0.7) outer = inset(ring, d);
  const wallColor = 0xb09a7c;
  const band = (lower, y0, upper, y1, color, pat) => {
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      k.quad([lower[i][0], y0, -lower[i][1]], [lower[j][0], y0, -lower[j][1]], [upper[j][0], y1, -upper[j][1]], [upper[i][0], y1, -upper[i][1]], color, pat);
    }
  };
  band(outer || ring, 0, ring, bank, 0x6c8f46, PAT.flat);
  band(ring, bank, ring, H, wallColor, PAT.brick);
  const contour = ring.map(([x, y]) => new THREE.Vector2(x, y));
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) {
    const [p, q, r] = [contour[a], contour[b], contour[c]].map((v) => [v.x, H, -v.y]);
    const up = (q[0] - p[0]) * (r[2] - p[2]) - (q[2] - p[2]) * (r[0] - p[0]) < 0;
    if (up) k.tri(p, q, r, 0xb4aa98, PAT.stone);
    else k.tri(p, r, q, 0xb4aa98, PAT.stone);
  }
  return new THREE.Mesh(k.geometry(), material);
}

export function buildLandmarks(data, material) {
  const group = new THREE.Group();
  for (const m of data.landmarks || []) {
    let mesh;
    if (m.hill) {
      mesh = buildHill(m, material);
    } else {
      const spec = BUILDERS[m.kit];
      if (!spec) continue;
      const k = new Kit();
      spec.build(k, m);
      mesh = new THREE.Mesh(k.geometry(), material);
      mesh.position.set(m.x, m.on || 0, -m.y);
      mesh.rotation.y = heading(m, spec.faces);
    }
    mesh.name = m.kit;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
